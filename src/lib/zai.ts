import fs from 'fs';
import path from 'path';
import os from 'os';

// =====================
// Config loading
// =====================

interface GeminiConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export function loadConfig(): GeminiConfig | null {
  const homeDir = os.homedir();
  const candidates = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
    '/etc/.z-ai-config',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const cfg = JSON.parse(raw);
        if (cfg.apiKey) return cfg;
      }
    } catch {
      /* skip malformed */
    }
  }
  return null;
}
let CONFIG: GeminiConfig | null = null;

// Prefer explicit environment variables in production, but fall back to a
// project-root or system `.z-ai-config` file if the env var is not present.
if (process.env.GEMINI_API_KEY) {
  CONFIG = {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    baseUrl: process.env.GEMINI_BASEURL,
  };
} else {
  // try to load from .z-ai-config (project root, home, or /etc)
  CONFIG = loadConfig();
}

const GEMINI_MODEL = CONFIG?.model || "gemini-2.5-flash";

const GEMINI_NATIVE_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

if (CONFIG?.apiKey) {
  console.log("[AI] Provider: Gemini | model:", GEMINI_MODEL);
} else {
  console.warn(
    "[AI] Gemini API key not found. Configure GEMINI_API_KEY."
  );
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}


// =====================
// LLM
// =====================

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  /** Enable Google Search grounding for real-time data */
  useSearch?: boolean;
}

/**
 * Call Gemini's native generateContent API.
 * Pass { useSearch: true } to enable Google Search grounding for real-time data.
 */
export async function callLLM(
  messages: LLMMessage[],
  maxRetries: number = 2,
  options?: LLMOptions
): Promise<string> {
  const CANNED_ASSISTANT_RESPONSE = `I don't have access to live AI services right now. I can still help with general advice: describe the product (brand, model or features) and I will suggest what to look for, typical price ranges, and buying tips.`;

  if (!CONFIG?.apiKey) {
    console.warn('[AI] Gemini API key not configured — returning canned assistant response');
    return CANNED_ASSISTANT_RESPONSE;
  }

  const url = `${GEMINI_NATIVE_BASE}/models/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;

  // Split system vs chat messages
  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const payload: Record<string, unknown> = {
    contents: chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (systemText) {
    payload.systemInstruction = { parts: [{ text: systemText }] };
  }
  if (options?.useSearch) {
    payload.tools = [{ google_search: {} }];
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errText = await res.text();
        const is429 = res.status === 429;
        if (attempt < maxRetries && (is429 || res.status >= 500)) {
          const delay = is429 ? 6000 * (attempt + 1) : 2000;
          console.warn(`[LLM/Gemini] ${res.status} (attempt ${attempt + 1}), retry in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw new NonRetryableError(`Gemini LLM ${res.status}: ${errText.slice(0, 400)}`);
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) {
        throw new Error('Gemini returned no content parts');
      }
      const text = parts
        .map((p: { text?: string }) => p.text || '')
        .join('')
        .trim();
      if (!text) throw new Error('Gemini returned empty text');
      return text;
    } catch (error) {
      if (error instanceof NonRetryableError) {
        console.error('[AI] callLLM failed (non-retryable):', error.message);
        return CANNED_ASSISTANT_RESPONSE;
      }
      if (attempt < maxRetries) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      console.error('[AI] callLLM failed after retries:', error);
      // Return canned response rather than throwing so chat still works
      return CANNED_ASSISTANT_RESPONSE;
    }
  }
  return CANNED_ASSISTANT_RESPONSE;
}

// =====================
// Web Search (via Gemini Google Search grounding)
// =====================

export interface SearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date?: string;
  favicon?: string;
}

/**
 * Web search via Gemini Google Search grounding.
 * Uses the same Gemini API key — no separate search API needed.
 */
export async function webSearch(
  query: string,
  numResults: number = 10
): Promise<SearchResult[]> {
  if (!CONFIG?.apiKey) {
    console.error('[WebSearch] No API key configured');
    return [];
  }

  const url = `${GEMINI_NATIVE_BASE}/models/${GEMINI_MODEL}:generateContent?key=${CONFIG.apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Search the web for: ${query}\n\nList the most relevant web pages found. For each page, include its URL, title, and a brief snippet of what the page contains.`,
          },
        ],
      },
    ],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[WebSearch] HTTP ${res.status}: ${errText.slice(0, 300)}`);
      if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
        return [];
      }
      return await duckduckgoSearch(query, numResults);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      console.warn('[WebSearch] No candidates in response');
      return await duckduckgoSearch(query, numResults);
    }

    // Extract grounding chunks (URLs + titles)
    const groundingMetadata = candidate.groundingMetadata || {};
    const chunks: Array<{ web?: { uri?: string; title?: string } }> =
      groundingMetadata.groundingChunks || [];

    // Extract grounding supports (snippets associated with chunk indices)
    const supports: Array<{
      groundingChunkIndices?: number[];
      segment?: { text?: string };
    }> = groundingMetadata.groundingSupports || [];

    // Build snippet map: chunk index → concatenated snippet text
    const snippetMap = new Map<number, string>();
    for (const support of supports) {
      const indices = support.groundingChunkIndices || [];
      const text = support.segment?.text || '';
      for (const idx of indices) {
        const existing = snippetMap.get(idx) || '';
        snippetMap.set(idx, existing ? existing + ' ' + text : text);
      }
    }

    // Also capture the model's text response — it often summarizes prices
    const modelText = (candidate.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join(' ')
      .trim();

    const results: SearchResult[] = [];
    for (let i = 0; i < chunks.length && results.length < numResults; i++) {
      const web = chunks[i]?.web;
      if (!web?.uri) continue;
      let host = '';
      try {
        host = new URL(web.uri).hostname.replace(/^www\./, '');
      } catch {
        /* skip */
      }
      results.push({
        url: web.uri,
        name: web.title || host || '',
        snippet: (snippetMap.get(i) || '').slice(0, 500),
        host_name: host,
        rank: i,
      });
    }

    // Add the model's text response as a synthetic result so the LLM
    // snippet extraction phase can parse prices from it.
    if (modelText && modelText.length > 20) {
      results.push({
        url: 'https://google-search-grounding.synthetic',
        name: `AI Search Summary: ${query.slice(0, 60)}`,
        snippet: modelText.slice(0, 1000),
        host_name: 'google.com',
        rank: results.length,
      });
    }

    console.log(`[WebSearch] "${query.slice(0, 50)}..." → ${results.length} results${modelText ? ' (+AI summary)' : ''}`);
    return results;
  } catch (e) {
    console.error('[WebSearch] Failed:', e instanceof Error ? e.message : e);
    return await duckduckgoSearch(query, numResults);
  }
}

function simplifyQueryForDDG(query: string): string {
  return query
    .replace(/site:\S+/gi, '')
    .replace(/\bOR\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback web search via DuckDuckGo HTML parser.
 */
export async function duckduckgoSearch(
  query: string,
  numResults: number = 10
): Promise<SearchResult[]> {
  try {
    const simplifiedQuery = simplifyQueryForDDG(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(simplifiedQuery)}`;
    console.log(`[DuckDuckGo] Fallback search for: "${simplifiedQuery}" (original: "${query}")`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[DuckDuckGo] HTTP error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const results: SearchResult[] = [];
    const containerParts = html.split('web-result');

    for (let i = 1; i < containerParts.length && results.length < numResults; i++) {
      const part = containerParts[i];

      // Match result link - handles both permutations of class/href attributes
      const aMatch = part.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/) ||
        part.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/);
      if (!aMatch) continue;

      const rawUrl = aMatch[1];
      const rawTitle = aMatch[2];

      const snippetMatch = part.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(a|span|td|div)>/);
      const rawSnippet = snippetMatch ? snippetMatch[1] : '';

      // Extract actual destination URL from DDG redirect parameters
      let targetUrl = rawUrl;
      if (rawUrl.includes('uddg=')) {
        const parts = rawUrl.split('uddg=');
        if (parts[1]) {
          const encUrl = parts[1].split('&')[0];
          targetUrl = decodeURIComponent(encUrl);
        }
      }

      const name = rawTitle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const snippet = rawSnippet.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      let host_name = '';
      try {
        host_name = new URL(targetUrl).hostname.replace(/^www\./, '');
      } catch {
        /* skip */
      }

      results.push({
        url: targetUrl,
        name,
        snippet,
        host_name,
        rank: results.length,
      });
    }

    console.log(`[DuckDuckGo] Found ${results.length} fallback results for "${query.slice(0, 40)}..."`);
    return results;
  } catch (e) {
    console.error('[DuckDuckGo] Fallback search failed:', e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Bing HTML search scraper — second free search engine source.
 * Uses bing.com/search HTML endpoint with rotating user agents.
 */
export async function bingSearch(
  query: string,
  numResults: number = 10
): Promise<SearchResult[]> {
  try {
    const simplifiedQuery = simplifyQueryForDDG(query);
    const url = `https://www.bing.com/search?q=${encodeURIComponent(simplifiedQuery)}&count=${numResults}&setlang=en-IN&cc=IN`;
    console.log(`[Bing] Searching for: "${simplifiedQuery}"`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.bing.com/',
        'DNT': '1',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[Bing] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Bing result items are in <li class="b_algo"> blocks
    const liRegex = /<li\s+class="b_algo">([\s\S]*?)<\/li>/g;
    let liMatch: RegExpExecArray | null;

    while ((liMatch = liRegex.exec(html)) !== null && results.length < numResults) {
      const block = liMatch[1];

      // Extract URL+title from <h2><a href="...">...</a></h2>
      const hMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!hMatch) continue;

      let rawUrl = hMatch[1];
      const rawTitle = hMatch[2];

      // Skip Bing's internal tracking URLs
      if (rawUrl.startsWith('/')) continue;

      // Extract snippet from <p class="b_lineclamp...">
      const pMatch = block.match(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        block.match(/<p(?![^>]*class="b_hide")[^>]*>([\s\S]*?)<\/p>/i);
      const rawSnippet = pMatch ? pMatch[1] : '';

      const name = rawTitle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const snippet = rawSnippet.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      let host_name = '';
      try { host_name = new URL(rawUrl).hostname.replace(/^www\./, ''); } catch { /* skip */ }

      if (name && rawUrl && rawUrl.startsWith('http')) {
        results.push({ url: rawUrl, name, snippet, host_name, rank: results.length });
      }
    }

    console.log(`[Bing] Found ${results.length} results for "${simplifiedQuery.slice(0, 40)}"`);
    return results;
  } catch (e) {
    console.error('[Bing] Search failed:', e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Multi-engine search: tries Gemini → DuckDuckGo → Bing in that order,
 * merging and deduplicating results from all successful sources.
 * This is the highest-quality, highest-reliability search function.
 */
export async function multiEngineSearch(
  query: string,
  numResults: number = 10
): Promise<SearchResult[]> {
  const seenUrls = new Set<string>();
  const merged: SearchResult[] = [];

  function addResults(newResults: SearchResult[]) {
    for (const r of newResults) {
      if (!seenUrls.has(r.url) && r.url && r.url.startsWith('http')) {
        seenUrls.add(r.url);
        merged.push(r);
      }
    }
  }

  // Track per-engine errors
  let ddgDone = false;
  let bingDone = false;

  // Launch DDG and Bing in parallel — much faster
  const [ddgResults, bingResults] = await Promise.allSettled([
    duckduckgoSearch(query, numResults),
    bingSearch(query, numResults),
  ]);

  if (ddgResults.status === 'fulfilled') { addResults(ddgResults.value); ddgDone = true; }
  if (bingResults.status === 'fulfilled') { addResults(bingResults.value); bingDone = true; }

  console.log(`[MultiEngine] DDG:${ddgDone ? ddgResults.status === 'fulfilled' ? (ddgResults.value?.length || 0) : 0 : 'fail'} Bing:${bingDone ? bingResults.status === 'fulfilled' ? (bingResults.value?.length || 0) : 0 : 'fail'} → ${merged.length} merged`);

  return merged.slice(0, numResults * 2); // Return more than requested for better coverage
}



export interface WebPage {
  title: string;
  url: string;
  html: string;
  text: string;
  publishedTime?: string;
}

/**
 * Direct page fetch with browser-like headers.
 * Fetches HTML, strips scripts/styles/nav/footer/tags, returns clean text.
 */
export async function readWebPage(url: string): Promise<WebPage | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[PageReader] HTTP ${res.status}: ${url.slice(0, 60)}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml')
    ) {
      console.warn(`[PageReader] Non-HTML (${contentType.slice(0, 30)}): ${url.slice(0, 60)}`);
      return null;
    }

    const html = await res.text();
    if (html.length < 200) {
      console.warn(`[PageReader] Too short: ${url.slice(0, 60)}`);
      return null;
    }

    // Extract title
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim();
    }

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 100) {
      console.warn(`[PageReader] Text too short (${text.length}): ${url.slice(0, 60)}`);
      return null;
    }

    return {
      title,
      url: res.url || url,
      html,
      text,
    };
  } catch (e) {
    console.warn(
      `[PageReader] Failed: ${url.slice(0, 60)} — ${e instanceof Error ? e.message : e}`
    );
    return null;
  }
}

// =====================
// JSON Parser
// =====================

export function parseJSONResponse<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }

  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }

  return JSON.parse(cleaned) as T;
}
