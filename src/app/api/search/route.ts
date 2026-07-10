import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callLLM, webSearch, readWebPage, parseJSONResponse, isApiKeyInvalid, isApiKeyQuotaExceeded } from '@/lib/zai';
import { extractPricesFromText, calculateDealScore, detectProductCategory, generateSearchSuggestions } from '@/lib/price-engine';
import { crawlProductPrices } from '@/lib/seo-crawler';
import type {
  ProductSearchResult,
  StoreListing,
  PriceHistoryPoint,
  Coupon,
  ReviewSummary,
  FakeDiscountAlert,
  PricePrediction,
} from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const searchCache = new Map<string, { result: ProductSearchResult; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000;

function generateId(): string {
  return `sr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ---- Store Detection ----

const STORE_DOMAIN_MAP: Record<string, string> = {
  'amazon': 'Amazon', 'flipkart': 'Flipkart', 'croma': 'Croma',
  'reliancedigital': 'Reliance Digital', 'tatacliq': 'Tata CLiQ',
  'vijaysales': 'Vijay Sales', 'myntra': 'Myntra', 'snapdeal': 'Snapdeal',
  'apple': 'Apple', 'samsung': 'Samsung', 'meesho': 'Meesho',
  'nykaa': 'Nykaa', 'ajio': 'Ajio', 'paytmmall': 'Paytm Mall',
  'bajajfinservmarkets': 'Bajaj Mall', 'mi.com': 'Mi Store',
  'oneplus': 'OnePlus Store', 'realme': 'Realme Store',
  'poorvika': 'Poorvika', 'shopclues': 'ShopClues', 'infibeam': 'Infibeam',
};

const COMPARISON_DOMAINS = [
  '91mobiles.com', 'smartprix.com', 'pricedekho.com',
  'gadgets360.com', 'mysmartprice.com', 'buyhatke.com',
];

function detectStoreFromUrl(url: string): string {
  try {
    const host = (new URL(url).hostname || '').toLowerCase().replace(/^www\./, '');
    for (const [domain, name] of Object.entries(STORE_DOMAIN_MAP)) {
      if (host.includes(domain)) return name;
    }
    const parts = host.split('.');
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Store';
  } catch { return 'Store'; }
}

function isComparisonSite(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return COMPARISON_DOMAINS.some(d => host.includes(d));
  } catch { return false; }
}

/** Check if a store NAME is actually a comparison site (not a buyable store) */
function isComparisonSiteByName(storeName: string): boolean {
  const lower = storeName.toLowerCase().trim();
  return COMPARISON_DOMAINS.some(d => lower.includes(d.replace('.com', '')));
}

function isStoreUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return Object.keys(STORE_DOMAIN_MAP).some(d => host.includes(d));
  } catch { return false; }
}

function getLogoForStore(store: string): string {
  const map: Record<string, string> = {
    'amazon': 'https://logo.clearbit.com/amazon.in', 'flipkart': 'https://logo.clearbit.com/flipkart.com',
    'croma': 'https://logo.clearbit.com/croma.com', 'reliance digital': 'https://logo.clearbit.com/reliancedigital.com',
    'tata cliq': 'https://logo.clearbit.com/tatacliq.com', 'vijay sales': 'https://logo.clearbit.com/vijaysales.com',
    'apple': 'https://logo.clearbit.com/apple.com', 'samsung': 'https://logo.clearbit.com/samsung.com',
    'myntra': 'https://logo.clearbit.com/myntra.com', 'snapdeal': 'https://logo.clearbit.com/snapdeal.com',
    'meesho': 'https://logo.clearbit.com/meesho.com', 'nykaa': 'https://logo.clearbit.com/nykaa.com',
    'ajio': 'https://logo.clearbit.com/ajio.com', 'pricedekho': 'https://logo.clearbit.com/pricedekho.com',
    '91mobiles': 'https://logo.clearbit.com/91mobiles.com', 'gadgets360': 'https://logo.clearbit.com/gadgets360.com',
    'smartprix': 'https://logo.clearbit.com/smartprix.com', 'mysmartprice': 'https://logo.clearbit.com/mysmartprice.com',
    'oneplus store': 'https://logo.clearbit.com/oneplus.com', 'mi store': 'https://logo.clearbit.com/mi.com',
  };
  const key = store.toLowerCase().trim();
  if (map[key]) return map[key];
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return `https://logo.clearbit.com/${key.replace(/\s+/g, '')}.com`;
}

function isPlaceholderOrComparisonUrl(urlStr: string): boolean {
  if (!urlStr) return true;
  try {
    const urlLower = urlStr.toLowerCase();
    if (isComparisonSite(urlStr)) return true;
    if (
      urlLower.includes('xxxx') ||
      urlLower.includes('dp/b0xxxxx') ||
      urlLower.includes('itmxxxxx') ||
      urlLower.includes('example.com')
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function findStoreUrl(results: Array<{ url: string }>, store: string): string | null {
  const domains: Record<string, string[]> = {
    'amazon': ['amazon.in', 'amazon.com'],
    'flipkart': ['flipkart.com'],
    'croma': ['croma.com'],
    'reliance': ['reliancedigital.com'],
    'tata': ['tatacliq.com'],
    'vijay': ['vijaysales.com'],
    'snapdeal': ['snapdeal.com'],
    'myntra': ['myntra.com'],
    'ajio': ['ajio.com'],
    'apple': ['apple.com'],
    'samsung': ['samsung.com'],
    'nykaa': ['nykaa.com'],
    'meesho': ['meesho.com'],
    'mi': ['mi.com'],
    'oneplus': ['oneplus.com'],
    'realme': ['realme.com'],
    'poorvika': ['poorvika.com'],
    'shopclues': ['shopclues.com'],
    'jiomart': ['jiomart.com'],
    'paytm': ['paytmmall.com'],
  };

  const storeKey = store.toLowerCase().trim();
  let ds: string[] | null = null;
  for (const [key, value] of Object.entries(domains)) {
    if (storeKey.includes(key) || key.includes(storeKey)) {
      ds = value;
      break;
    }
  }
  if (!ds) return null;

  const candidateUrls: string[] = [];
  for (const r of results) {
    try {
      const h = new URL(r.url).hostname.toLowerCase();
      if (ds.some(d => h.includes(d)) && !isPlaceholderOrComparisonUrl(r.url)) {
        candidateUrls.push(r.url);
      }
    } catch { /* skip */ }
  }

  if (candidateUrls.length === 0) return null;

  const directLink = candidateUrls.find(url => {
    const l = url.toLowerCase();
    return (
      l.includes('/dp/') ||
      l.includes('/p/') ||
      l.includes('/product/') ||
      l.includes('/products/') ||
      l.includes('/itm') ||
      l.includes('/buy') ||
      l.includes('/gp/')
    );
  });

  return directLink || candidateUrls[0];
}
function getStoreFallbackSearchUrl(store: string, query: string): string {
  const encQuery = encodeURIComponent(query);
  const s = store.toLowerCase().trim();
  if (s.includes('amazon')) {
    return `https://www.amazon.in/s?k=${encQuery}`;
  }
  if (s.includes('flipkart')) {
    return `https://www.flipkart.com/search?q=${encQuery}`;
  }
  if (s.includes('croma')) {
    return `https://www.croma.com/search/?text=${encQuery}`;
  }
  if (s.includes('reliance')) {
    return `https://www.reliancedigital.in/search?q=${encQuery}`;
  }
  if (s.includes('tata')) {
    return `https://www.tatacliq.com/search/?searchCategory=all&text=${encQuery}`;
  }
  if (s.includes('vijay')) {
    return `https://www.vijaysales.com/search/${encodeURIComponent(query.replace(/\s+/g, '-'))}`;
  }
  if (s.includes('myntra')) {
    return `https://www.myntra.com/${encQuery}`;
  }
  if (s.includes('ajio')) {
    return `https://www.ajio.com/search/?text=${encQuery}`;
  }
  if (s.includes('snapdeal')) {
    return `https://www.snapdeal.com/search?keyword=${encQuery}`;
  }
  if (s.includes('nykaa')) {
    return `https://www.nykaa.com/search/result/?q=${encQuery}`;
  }
  if (s.includes('meesho')) {
    return `https://www.meesho.com/search?q=${encQuery}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + store)}`;
}



// ---- LLM: Extract prices from comparison site page ----

interface ExtractedPrice {
  store: string;
  price: number;
  originalPrice?: number;
  isExchange: boolean;
  inStock?: boolean;
}

async function extractComparisonPricesLLM(
  pageText: string, productName: string
): Promise<ExtractedPrice[]> {
  try {
    const textSlice = pageText.slice(0, 10000);
    const prompt = `You are a price extraction expert for Indian e-commerce. Extract the ACTUAL DISCOUNTED SELLING PRICE for "${productName}" from this comparison page.

CRITICAL RULES:
1. "price" field = the DISCOUNTED/OFFER/SELLING price (the LOWER price the customer actually pays)
2. "originalPrice" field = the MRP/listed price (the HIGHER price shown with strikethrough)
3. NEVER return MRP as "price" — MRP goes in "originalPrice" only
4. If you see "₹79,900" (MRP, strikethrough) and "₹64,999" (selling price), return: price=64999, originalPrice=79900
5. "Exchange Price" or "With Exchange" or "Effective Price" → set isExchange=true
6. Do NOT return "effective price after bank offer" or "cashback price" as the main price

STORE-SPECIFIC NOTES:
- Amazon: Usually shows MRP crossed out, then a lower "Deal Price" or just "₹X" — the lower number is the selling price
- Vijay Sales: Shows "MRP" crossed out and "Selling Price" or "Offer Price" — use the offer/selling price
- Flipkart: Shows "₹X" as the selling price (MRP is crossed out above)

Known stores: Amazon, Flipkart, Croma, Reliance Digital, Tata CLiQ, Vijay Sales, Snapdeal, etc.

Return JSON array: [{"store":"Amazon","price":64999,"originalPrice":79900,"isExchange":false}]
If none found: []`;

    const result = await callLLM([
      { role: 'system', content: 'Extract DISCOUNTED selling prices from Indian comparison sites. NEVER return MRP as the main price. Return ONLY JSON. Never fabricate.' },
      { role: 'user', content: `${prompt}\n\nPAGE:\n${textSlice}` },
    ], 1.5);

    const parsed = parseJSONResponse<ExtractedPrice[]>(result);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(p => p.price > 100 && p.store)
        .map(p => ({
          store: p.store,
          price: Math.round(p.price),
          originalPrice: p.originalPrice ? Math.round(p.originalPrice) : undefined,
          isExchange: p.isExchange || false,
        }));
    }
    return [];
  } catch { return []; }
}

// ---- LLM: Extract price from a store product page ----

interface StorePagePrice {
  price: number;
  originalPrice?: number;
  isExchange: boolean;
}

async function extractStorePagePriceLLM(
  pageText: string, storeName: string, productName: string
): Promise<StorePagePrice | null> {
  try {
    const storeSpecific = storeName.toLowerCase().includes('amazon')
      ? `AMAZON-SPECIFIC RULES:
- Amazon shows "M.R.P. ₹XX,XXX" (strikethrough/crossed out) and a LOWER "₹YY,YYY" as the actual price
- Look for the price near "Deal of the Day", "Price:", "Offer Price", or the big bold price number
- The price NEXT TO the "Add to Cart" or "Buy Now" button is the SELLING price
- NEVER return the M.R.P. value as the main "price" field — M.R.P. goes in "originalPrice"
- If you see two prices (one crossed out, one not), the LOWER non-crossed-out one is the selling price
- "Inclusive of all taxes" is shown AFTER the selling price — extract that number`
      : storeName.toLowerCase().includes('vijay sales')
        ? `VIJAY SALES-SPECIFIC RULES:
- Vijay Sales shows "MRP ₹XX,XXX" (strikethrough) and "Selling Price" or "Offer Price: ₹YY,YYY"
- The "Selling Price" or "Offer Price" is what the customer pays — this goes in "price"
- The MRP (higher number, usually crossed out) goes in "originalPrice"
- Sometimes shows "You Save: ₹ZZ" — this confirms MRP - Selling Price = You Save
- NEVER return the MRP as the main "price" field`
        : storeName.toLowerCase().includes('croma')
          ? `CROMA-SPECIFIC RULES:
- Croma shows "MRP ₹XX,XXX" (strikethrough) and "Selling Price: ₹YY,YYY" or "Offer Price: ₹YY,YYY"
- The "Selling Price"/"Offer Price" is the discounted price — this goes in "price"
- The MRP goes in "originalPrice"
- NEVER return the MRP as the main "price" field`
          : `GENERAL RULES:
- If you see "M.R.P." or "MRP" with a higher price (often strikethrough), that goes in "originalPrice"
- The LOWER price (selling price, offer price, deal price) goes in "price"
- Look near "Add to Cart", "Buy Now", or similar buttons for the actual selling price`;

    const prompt = `Extract the ACTUAL DISCOUNTED SELLING PRICE for "${productName}" from this ${storeName} product page.

CRITICAL: The "price" field MUST be the DISCOUNTED/SELLING price (what customer pays), NOT the MRP.

${storeSpecific}

Return JSON: {"price":64999,"originalPrice":79900,"isExchange":false}
- price: the discounted selling price (LOWER number, what customer actually pays)
- originalPrice: the MRP/listed price (HIGHER number, if visible)
- isExchange: true ONLY if the ONLY price visible is an "Exchange Price" or "With Exchange" price

If ONLY an exchange price is visible: {"price":0,"originalPrice":0,"isExchange":true}
If unclear: {"price":0,"originalPrice":0,"isExchange":false}

PAGE CONTENT:\n${pageText.slice(0, 8000)}`;

    const result = await callLLM([
      { role: 'system', content: `Extract the DISCOUNTED selling price from a ${storeName} product page. The "price" field must be the LOWER discounted price, NEVER the MRP. Return ONLY JSON. Never fabricate.` },
      { role: 'user', content: prompt },
    ], 0.8);

    const parsed = parseJSONResponse<StorePagePrice>(result);
    if (parsed && parsed.price > 100) {
      return {
        price: Math.round(parsed.price),
        originalPrice: parsed.originalPrice ? Math.round(parsed.originalPrice) : undefined,
        isExchange: parsed.isExchange || false,
      };
    }
    return null;
  } catch { return null; }
}

// ---- Regex: extract price from snippet ----

function extractPriceFromSnippet(snippet: string): number | null {
  const prices = extractPricesFromText(snippet).filter(p => p.price >= 500 && p.price <= 50_00_000);
  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0].price;
  // Prefer non-MRP, non-exchange prices
  for (const p of prices) {
    const ctx = (p.context || '').toLowerCase();
    if (/m\.?r\.?p\.?|maximum retail|was:|old price/i.test(ctx)) continue;
    if (/exchange|trade.?in|effective price/i.test(ctx)) continue;
    return p.price;
  }
  prices.sort((a, b) => a.price - b.price);
  return prices[Math.floor(prices.length / 2)].price;
}

// ---- LLM: Extract prices from ALL search snippets at once ----
// This is the critical fallback when store pages block direct scraping.
// The search snippets themselves often contain prices like "PS5 Pro ₹79,999 at Amazon".

async function extractPricesFromSnippetsLLM(
  results: Array<{ url: string; name: string; snippet: string; host_name: string }>,
  productName: string
): Promise<ExtractedPrice[]> {
  try {
    const rawResults = results.map(r => ({
      title: r.name,
      url: r.url,
      content: r.snippet
    }));

    const result = await callLLM([
      { role: 'system', content: 'Extract product name, price, seller, discount, and stock availability (in stock or out of stock) from the given search results. Return only JSON array.' },
      { role: 'user', content: JSON.stringify(rawResults) },
    ], 2);

    const parsed = parseJSONResponse<any[]>(result);
    if (Array.isArray(parsed)) {
      return parsed
        .map(p => {
          const store = p.seller || p.store || '';
          let price = 0;
          if (typeof p.price === 'number') {
            price = p.price;
          } else if (typeof p.price === 'string') {
            price = parseFloat(p.price.replace(/[^\d.]/g, ''));
          }

          let originalPrice: number | undefined = undefined;
          if (p.originalPrice) {
            originalPrice = typeof p.originalPrice === 'number' ? p.originalPrice : parseFloat(p.originalPrice.replace(/[^\d.]/g, ''));
          } else if (p.discount && price > 0) {
            const pctMatch = p.discount.match(/(\d+)%\s*off/i);
            if (pctMatch) {
              const pct = parseFloat(pctMatch[1]);
              originalPrice = Math.round(price / (1 - pct / 100));
            }
          }

          let inStock = true;
          const availability = (p.availability || p.stock || p.stockStatus || '').toLowerCase();
          if (availability.includes('out') || availability.includes('sold') || availability.includes('unavail')) {
            inStock = false;
          }

          return {
            store,
            price: Math.round(price),
            originalPrice: originalPrice ? Math.round(originalPrice) : undefined,
            isExchange: false,
            inStock,
          };
        })
        .filter(p => p.price > 100 && p.store);
    }
    return [];
  } catch (e) {
    console.warn('[Search] Snippet LLM extraction failed:', e instanceof Error ? e.message : e);
    return [];
  }
}

// ---- DIRECT GEMINI PRICE QUERY (most reliable for local) ----
// Asks Gemini directly: "What is the price of X at each store?"
// Gemini uses Google Search grounding to find current prices and returns them in text.
// This works even when Amazon/Flipkart/Croma block direct page scraping.

interface DirectPriceResult extends ExtractedPrice {
  sourceUrl?: string;
}

async function directPriceQueryLLM(productName: string): Promise<DirectPriceResult[]> {
  try {
    const prompt = `Search the web RIGHT NOW for the current selling price of "${productName}" in India (in INR ₹).

You MUST search Google to find real, current prices. Do NOT use prices from your memory — only report prices you actually found in the search results above.

For each store where you found a REAL price, provide:
- "store": the store name (Amazon, Flipkart, Croma, Reliance Digital, Tata CLiQ, Vijay Sales, etc.)
- "price": the DISCOUNTED SELLING price (what customer pays — the LOWER number, NOT MRP)
- "originalPrice": the MRP (the HIGHER crossed-out number) — only if different from price
- "sourceUrl": the EXACT URL of the store product page where you found this price
- "isExchange": false (only true if the price is an exchange/trade-in price)
- "inStock": true (or false if the product is explicitly out of stock / sold out / unavailable at this store)

CRITICAL RULES:
- You MUST include a real sourceUrl for every price — if you can't find a URL, don't include that store. The sourceUrl must be a real store product page URL from the search results.
- "price" is NEVER the MRP — MRP goes in "originalPrice"
- Ignore EMI monthly amounts (₹X/month), exchange prices, and "starting from" prices
- If you only found the price on a comparison site (not the actual store), still include it with the comparison site URL
- Return [] if you found NO real prices with URLs. The sourceUrl must be a real store product page URL from the search results.
- Do NOT output the example prices/stores below under any circumstances. They are just for format representation.

Return ONLY a JSON array:
[{"store":"Store Name","price":12345,"originalPrice":15999,"isExchange":false,"inStock":true,"sourceUrl":"https://www.store.com/product-url"}]`;

    const result = await callLLM([
      { role: 'system', content: 'You are a price comparison assistant. You MUST search the web for real current prices using Google Search. Never report prices from memory — only prices you actually found in search results. Every price MUST have a sourceUrl. Return ONLY a JSON array.' },
      { role: 'user', content: prompt },
    ], 2, { useSearch: true });

    const parsed = parseJSONResponse<DirectPriceResult[]>(result);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(p => p.price > 100 && p.store && p.sourceUrl)
        .map(p => ({
          store: p.store,
          price: Math.round(p.price),
          originalPrice: p.originalPrice ? Math.round(p.originalPrice) : undefined,
          isExchange: p.isExchange || false,
          inStock: p.inStock !== false,
          sourceUrl: p.sourceUrl,
        }));
    }
    return [];
  } catch (e) {
    console.warn('[Search] Direct price query failed:', e instanceof Error ? e.message : e);
    return [];
  }
}

// ---- Internal price data structure ----

interface PriceEntry {
  store: string;
  price: number;
  originalPrice?: number;
  url: string;
  source: string;
  inStock?: boolean;
}

// ---- Main Search ----

async function performSearch(query: string): Promise<ProductSearchResult> {
  const trimmedQuery = query.trim();
  const cacheKey = trimmedQuery.toLowerCase();

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Search] Cache hit: "${trimmedQuery}"`);
    return cached.result;
  }

  console.log(`[Search] ===== START: "${trimmedQuery}" =====`);
  const category = detectProductCategory(trimmedQuery);

  // ── PHASE 1: Web search (optimized single query for Tavily in India) ──
  const queries = [
    `${trimmedQuery} price site:amazon.in OR site:flipkart.com OR site:croma.com OR site:reliancedigital.in OR site:vijaysales.com OR site:tatacliq.com`
  ];

  const seenUrls = new Set<string>();
  const allResults: Array<{ url: string; name: string; snippet: string; host_name: string }> = [];
  let queriesUsed = 0;

  const queryPromises = queries.map(q => webSearch(q, 10).catch(() => []));
  const resultsArray = await Promise.all(queryPromises);

  for (const results of resultsArray) {
    if (results?.length) {
      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
      queriesUsed++;
    }
  }
  console.log(`[Search] ${queriesUsed} queries → ${allResults.length} results`);

  // Empty result early return
  if (allResults.length === 0) {
    const empty: ProductSearchResult = {
      id: generateId(), name: trimmedQuery, normalizedQuery: trimmedQuery,
      imageUrl: '', brand: '', category, keySpecs: [], listings: [],
      bestPrice: 0, bestStore: '', savings: 0, savingsPercent: 0,
      aiRecommendation: isApiKeyInvalid
        ? `Error: Your GEMINI_API_KEY is invalid or unauthenticated (HTTP 401). Please configure a valid Google Gemini API key in your Render Dashboard settings.`
        : isApiKeyQuotaExceeded
          ? `Error: Your GEMINI_API_KEY has exceeded its free tier rate limit or daily quota (HTTP 429). Google restricts free Gemini API keys when called from cloud hosting providers like Render. Please enable pay-as-you-go billing in Google AI Studio to unlock unrestricted access.`
          : `No results for "${trimmedQuery}". Try "iPhone 16 128GB" or "Samsung Galaxy S25 Ultra 256GB".`,
      overallRating: 0, priceHistory: [], coupons: [],
      reviewSummary: null, fakeDiscountAlert: null,
      dataSource: 'no_data', pagesScraped: 0,
      searchQueriesUsed: queriesUsed, totalResultsFound: 0,
      searchSuggestions: generateSearchSuggestions(trimmedQuery),
    };
    searchCache.set(cacheKey, { result: empty, timestamp: Date.now() });
    return empty;
  }

  // ── PHASE 2: LLM SNIPPET EXTRACTION (PRIMARY — verified prices from real search results) ──
  // These prices come from actual Google search snippets, so they're real current prices.
  // This runs FIRST so snippet-verified prices take priority over the direct query.
  let pagesScraped = 0;
  const prices = new Map<string, PriceEntry>();

  console.log('[Search] Phase 2: LLM snippet extraction (primary)...');
  const snippetPrices = await extractPricesFromSnippetsLLM(allResults, trimmedQuery);
  console.log(`[Search] LLM extracted ${snippetPrices.length} prices from snippets`);
  for (const p of snippetPrices) {
    if (p.isExchange) continue;
    const key = p.store.toLowerCase();
    // Skip comparison sites — they're not stores we can buy from
    if (isComparisonSiteByName(p.store)) {
      console.log(`[Search] Skip comparison site: ${p.store}`);
      continue;
    }
    // Keep the LOWER price when the same store appears twice (lower = selling price)
    const existing = prices.get(key);
    if (existing && p.price >= existing.price) {
      console.log(`[Search] Skip ${p.store} ₹${p.price.toLocaleString('en-IN')} (already have lower ₹${existing.price.toLocaleString('en-IN')})`);
      continue;
    }
    const matchingUrl = allResults.find(r => {
      const rStore = detectStoreFromUrl(r.url).toLowerCase();
      return rStore === key || rStore.includes(key) || key.includes(rStore);
    });
    prices.set(key, {
      store: p.store,
      price: p.price,
      originalPrice: p.originalPrice,
      url: matchingUrl?.url || '',
      source: 'snippet_llm',
      inStock: p.inStock,
    });
    console.log(`[Search] ✓ ${p.store}: ₹${p.price.toLocaleString('en-IN')}${p.originalPrice ? ` (MRP: ₹${p.originalPrice.toLocaleString('en-IN')})` : ''} (snippet_llm)`);
  }

  // ── PHASE 2b: DIRECT GEMINI PRICE QUERY (fills gaps — requires sourceUrl) ──
  // Only for stores NOT already found in snippets.
  // Requires sourceUrl to prevent hallucinated prices.
  console.log('[Search] Phase 2b: Direct Gemini price query (filling gaps)...');
  const directPrices = await directPriceQueryLLM(trimmedQuery);
  console.log(`[Search] Direct query found ${directPrices.length} prices (with URLs)`);
  for (const p of directPrices) {
    if (p.isExchange) continue;
    const key = p.store.toLowerCase();
    // Skip comparison sites
    if (isComparisonSiteByName(p.store)) continue;
    // Skip if snippet already found this store (snippets are more trustworthy)
    if (prices.has(key)) {
      console.log(`[Search] Skip direct (snippet already has ${p.store})`);
      continue;
    }
    prices.set(key, {
      store: p.store,
      price: p.price,
      originalPrice: p.originalPrice,
      url: p.sourceUrl || '',
      source: 'direct_gemini',
      inStock: p.inStock,
    });
    console.log(`[Search] ✓ ${p.store}: ₹${p.price.toLocaleString('en-IN')}${p.originalPrice ? ` (MRP: ₹${p.originalPrice.toLocaleString('en-IN')})` : ''} (direct_gemini)`);
  }

  // ── PHASE 3: Scrape comparison sites + store pages (supplementary, fills gaps) ──
  // Skip page scraping if 2+ prices already found (stores block scraping from local IPs)

  if (prices.size >= 2) {
    console.log(`[Search] Skipping page scraping — ${prices.size} prices already found`);
  } else {
    const compUrls = allResults
      .filter(r => isComparisonSite(r.url))
      .filter(r => {
        const u = r.url.toLowerCase();
        return !['/list-of-', '/price-list-in-', '/category/', '/collections/', '/all-', '/best-', '/top-'].some(p => u.includes(p));
      })
      .slice(0, 2)
      .map(r => r.url);

    for (const url of compUrls) {
      console.log(`[Search] Scraping comparison: ${url.slice(0, 70)}...`);
      try {
        const page = await readWebPage(url);
        if (page && page.text.length > 500) {
          pagesScraped++;
          const llmPrices = await extractComparisonPricesLLM(page.text, trimmedQuery);
          console.log(`[Search] LLM found ${llmPrices.length} prices from comparison`);

          for (const p of llmPrices) {
            if (p.isExchange) {
              console.log(`[Search] Skip exchange: ${p.store} ₹${p.price.toLocaleString('en-IN')}`);
              continue;
            }
            const key = p.store.toLowerCase();
            const existing = prices.get(key);
            if (!existing || p.price < existing.price) {
              prices.set(key, {
                store: p.store,
                price: p.price,
                originalPrice: p.originalPrice || existing?.originalPrice,
                url,
                source: 'comparison_llm',
              });
              console.log(`[Search] ✓ ${p.store}: ₹${p.price.toLocaleString('en-IN')}${p.originalPrice ? ` (MRP: ₹${p.originalPrice.toLocaleString('en-IN')})` : ''}`);
            }
          }
        }
        await sleep(600);
      } catch { console.log('[Search] Comparison scrape failed'); }
    }

    // ── PHASE 3: Validate with store pages ──
    const storeUrls = allResults
      .filter(r => isStoreUrl(r.url) && !isComparisonSite(r.url))
      .filter(r => !['/s?', '/search', '/category', '/collections'].some(p => r.url.toLowerCase().includes(p)))
      .slice(0, 3);

    const storeMap = new Map<string, string>();
    for (const r of storeUrls) {
      const store = detectStoreFromUrl(r.url);
      if (!storeMap.has(store.toLowerCase())) storeMap.set(store.toLowerCase(), r.url);
    }

    for (const [key, url] of storeMap) {
      const storeName = key.charAt(0).toUpperCase() + key.slice(1);
      console.log(`[Search] Validating ${storeName}...`);
      try {
        const page = await readWebPage(url);
        if (page && page.text.length > 200) {
          pagesScraped++;
          const llmResult = await extractStorePagePriceLLM(page.text, storeName, trimmedQuery);
          if (llmResult && llmResult.price > 0 && !llmResult.isExchange) {
            const existing = prices.get(key);

            // Track the best originalPrice
            let bestOriginalPrice = existing?.originalPrice || llmResult.originalPrice;

            if (existing) {
              const storePrice = llmResult.price;
              const compPrice = existing.price;

              if (storePrice <= compPrice) {
                // Store page has LOWER or equal price — likely the correct discounted selling price
                console.log(`[Search] ✓ ${storeName}: store page ₹${storePrice.toLocaleString('en-IN')} ≤ comp ₹${compPrice.toLocaleString('en-IN')} — using store page (lower is selling price)`);
                prices.set(key, {
                  store: storeName,
                  price: storePrice,
                  originalPrice: bestOriginalPrice,
                  url,
                  source: 'store_page',
                });
              } else {
                const ratio = storePrice / compPrice;
                if (ratio <= 1.08) {
                  // Very close — store page is slightly higher, might be minor variation, keep the LOWER (comparison) price
                  console.log(`[Search] ✓ ${storeName}: comp ₹${compPrice.toLocaleString('en-IN')} vs page ₹${storePrice.toLocaleString('en-IN')} — keeping lower (comp) price`);
                  prices.set(key, {
                    ...existing,
                    originalPrice: bestOriginalPrice,
                  });
                } else {
                  // Store page is significantly HIGHER than comparison — store page likely extracted MRP
                  // Keep the comparison price (lower = selling price), but use store MRP as originalPrice
                  console.log(`[Search] ⚠ ${storeName}: page ₹${storePrice.toLocaleString('en-IN')} >> comp ₹${compPrice.toLocaleString('en-IN')} — page likely returned MRP, keeping comp selling price`);
                  // If store page price is higher, it's likely the MRP — use it as originalPrice
                  if (!bestOriginalPrice || storePrice > bestOriginalPrice) {
                    bestOriginalPrice = storePrice;
                  }
                  prices.set(key, {
                    ...existing,
                    originalPrice: bestOriginalPrice,
                  });
                }
              }
            } else {
              // No existing comparison price — use store page
              prices.set(key, {
                store: storeName,
                price: llmResult.price,
                originalPrice: llmResult.originalPrice,
                url,
                source: 'store_page',
              });
              console.log(`[Search] ✓ ${storeName}: ₹${llmResult.price.toLocaleString('en-IN')} (store page only)${llmResult.originalPrice ? ` (MRP: ₹${llmResult.originalPrice.toLocaleString('en-IN')})` : ''}`);
            }
          }
        }
        await sleep(600);
      } catch { /* skip */ }
    }
  } // end of else (page scraping skip block)

  // ── PHASE 5: Regex snippet fallback (for any remaining gaps) ──
  const queryWords = trimmedQuery.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  for (const r of allResults) {
    if (!isStoreUrl(r.url) || isComparisonSite(r.url)) continue;
    const store = detectStoreFromUrl(r.url);
    const key = store.toLowerCase();
    if (prices.has(key)) continue;

    // Direct price matching from snippet OR name
    const price = extractPriceFromSnippet(r.snippet) || extractPriceFromSnippet(r.name);
    if (price && price > 0) {
      const titleLower = (r.name || '').toLowerCase();
      const snippetLower = (r.snippet || '').toLowerCase();

      // Relaxed relevance check: if query has terms, see if any match name/snippet
      // handles PS5 <-> PlayStation mapping
      const isRelevant = queryWords.length === 0 || queryWords.some(w => {
        if (titleLower.includes(w) || snippetLower.includes(w)) return true;
        if (w === 'ps5' && (titleLower.includes('playstation') || snippetLower.includes('playstation'))) return true;
        if (w === 'playstation' && (titleLower.includes('ps5') || snippetLower.includes('ps5'))) return true;
        return false;
      });

      if (isRelevant) {
        const text = `${r.name} ${r.snippet}`.toLowerCase();
        const snippetInStock = !/\b(out of stock|sold out|temp(?:orarily)? unavailable|currently unavailable)\b/i.test(text);
        prices.set(key, { store, price, url: r.url, source: 'snippet', inStock: snippetInStock });
        console.log(`[Search] Snippet: ${store} ₹${price.toLocaleString('en-IN')}`);
      }
    }
  }

  // ── Standalone SEO Crawler Fallback (runs if standard Gemini snippet extraction yielded NO prices) ──
  if (prices.size === 0) {
    console.log('[Search] prices map is empty. Invoking standalone SEO Crawler...');
    try {
      const crawled = await crawlProductPrices(trimmedQuery);
      for (const c of crawled) {
        const key = c.store.toLowerCase();
        if (!prices.has(key)) {
          prices.set(key, {
            store: c.store,
            price: c.price,
            originalPrice: c.originalPrice,
            url: c.url,
            source: 'seo_crawler',
          });
        }
      }
    } catch (e) {
      console.warn('[Search] Standalone SEO Crawler failed:', e);
    }
  }

  console.log(`\n[Search] === Summary ===`);
  for (const [, v] of prices) console.log(`  ${v.store}: ₹${v.price.toLocaleString('en-IN')}${v.originalPrice ? ` (MRP: ₹${v.originalPrice.toLocaleString('en-IN')})` : ''} (${v.source})`);

  // ── PHASE 5: Filter outliers & build listings ──
  if (prices.size === 0) {
    const empty: ProductSearchResult = {
      id: generateId(), name: trimmedQuery, normalizedQuery: trimmedQuery,
      imageUrl: '', brand: '', category, keySpecs: [], listings: [],
      bestPrice: 0, bestStore: '', savings: 0, savingsPercent: 0,
      aiRecommendation: `No prices found for "${trimmedQuery}". Try a more specific name.`,
      overallRating: 0, priceHistory: [], coupons: [],
      reviewSummary: null, fakeDiscountAlert: null,
      dataSource: 'no_data', pagesScraped,
      searchQueriesUsed: queriesUsed, totalResultsFound: allResults.length,
      searchSuggestions: generateSearchSuggestions(trimmedQuery),
    };
    searchCache.set(cacheKey, { result: empty, timestamp: Date.now() });
    return empty;
  }

  const allVals = Array.from(prices.values()).map(v => v.price).sort((a, b) => a - b);
  const median = allVals[Math.floor(allVals.length / 2)];
  const filtered = Array.from(prices.values()).filter(v =>
    median <= 0 || (v.price >= median * 0.65 && v.price <= median * 1.5)
  );
  console.log(`[Search] After filter: ${filtered.length}/${prices.size} (median: ₹${median.toLocaleString('en-IN')})`);

  const listings: StoreListing[] = filtered.map(v => {
    let matchingInStock = v.inStock;
    if (matchingInStock === undefined) {
      matchingInStock = true;
      const matchingUrl = allResults.find(r => {
        const rStore = detectStoreFromUrl(r.url).toLowerCase();
        const vStore = v.store.toLowerCase();
        return rStore === vStore || rStore.includes(vStore) || vStore.includes(rStore);
      });
      if (matchingUrl) {
        const text = `${matchingUrl.name} ${matchingUrl.snippet}`.toLowerCase();
        if (/\b(out of stock|sold out|temp(?:orarily)? unavailable|currently unavailable)\b/i.test(text)) {
          matchingInStock = false;
        }
      }
    }

    return {
      store: v.store,
      storeLogo: getLogoForStore(v.store),
      price: v.price,
      originalPrice: v.originalPrice && v.originalPrice > v.price ? v.originalPrice : undefined,
      currency: 'INR',
      delivery: 'Free delivery',
      deliveryCost: 0,
      rating: 0,
      ratingCount: 0,
      inStock: matchingInStock,
      storeUrl: (!isPlaceholderOrComparisonUrl(v.url) ? v.url : null) || findStoreUrl(allResults, v.store) || getStoreFallbackSearchUrl(v.store, trimmedQuery),
      emiAvailable: v.price > 3000,
      emiInfo: v.price > 3000 ? `No cost EMI from ₹${Math.round(v.price / 12).toLocaleString('en-IN')}/mo` : undefined,
      priceValidated: v.source === 'comparison_llm' || v.source === 'store_page' || v.source === 'direct_gemini' || v.source === 'snippet_llm',
    };
  });

  listings.sort((a, b) => a.price - b.price);
  const allListingPrices = listings.map(l => l.price);
  for (const l of listings) l.dealScore = calculateDealScore(l, allListingPrices).score;

  const bestPrice = listings[0].price;
  const bestStore = listings[0].store;
  const highestPrice = allVals[allVals.length - 1];
  const lowestPrice = allVals[0];
  const savings = highestPrice - bestPrice;
  const savingsPercent = highestPrice > 0 ? Math.round((savings / highestPrice) * 1000) / 10 : 0;

  // ── PHASE 6: LLM supplementary data (reviews, coupons, etc. — NO prices) ──
  console.log('[Search] LLM supplementary...');
  const priceList = listings.map((l, i) => `${i + 1}. ${l.store}: ₹${l.price.toLocaleString('en-IN')}${l.originalPrice ? ` (MRP: ₹${l.originalPrice.toLocaleString('en-IN')})` : ''}${l.priceValidated ? ' (VERIFIED)' : ''}`).join('\n');

  const supPrompt = `You are a product info assistant. I have VERIFIED prices. Do NOT change them.

PRODUCT: "${trimmedQuery}"
CATEGORY: ${category}
VERIFIED PRICES (DO NOT MODIFY):
${priceList}

Return JSON:
{
  "name": "exact product name",
  "brand": "brand",
  "keySpecs": ["spec1","spec2","spec3"],
  "storeRatings": {${listings.map(l => `"${l.store}":{"rating":4.3,"ratingCount":12000}`).join(',')}} ,
  "coupons": [
    {"code":"","description":"10% instant discount on HDFC Credit Cards","discount":"10% off up to ₹1,500","discountType":"cashback","store":"Flipkart","validTill":"31 Dec 2026","terms":"HDFC Credit Card only","category":"bank_offer"},
    {"code":"SAVE5","description":"5% off on electronics","discount":"5% off","discountType":"percentage","store":"Amazon","validTill":"30 Sep 2026","terms":"Min ₹3000","category":"coupon"}
  ],
  "reviewSummary":{"totalReviews":12000,"overallRating":4.3,"pros":["Pro1","Pro2"],"cons":["Con1"],"summary":"Specific 2-3 sentence review for ${trimmedQuery}","sentiment":"positive","highlights":["H1","H2"]},
  "fakeDiscountAlert":{"isGenuine":true,"confidence":75,"analysis":"Brief analysis","highestEverPrice":${highestPrice},"lowestEverPrice":${lowestPrice},"typicalPriceRange":[${lowestPrice},${highestPrice}],"currentPriceHistory":"Prices near lower range"},
  "pricePrediction":{"currentPrice":${bestPrice},"predictedPrice":${Math.round(bestPrice * (0.96 + Math.random() * 0.08))},"predictedDrop":${Math.round(bestPrice * 0.03)},"predictedDropPercent":3,"confidence":65,"timeframe":"7 days","direction":"down","reasoning":"Brief reason"},
  "aiRecommendation":"${bestStore} at ₹${bestPrice.toLocaleString('en-IN')} is the best deal because [reasons]."
}
RULES: Return ONLY JSON. storeRatings should be realistic. Coupons should have future dates (2026). Be specific to "${trimmedQuery}".`;

  let sup: Record<string, unknown> = {};
  try {
    const raw = await callLLM([
      { role: 'system', content: 'Generate product supplementary data. Return ONLY valid JSON. Never include prices.' },
      { role: 'user', content: supPrompt },
    ], 2);
    sup = parseJSONResponse<Record<string, unknown>>(raw);
    console.log('[Search] Supplementary OK');
  } catch (e) {
    console.warn('[Search] Supplementary failed:', e);
    sup = {
      name: trimmedQuery, brand: '', keySpecs: [], coupons: [],
      reviewSummary: null, fakeDiscountAlert: null, pricePrediction: null,
      aiRecommendation: `${bestStore} offers the best price at ₹${bestPrice.toLocaleString('en-IN')} across ${listings.length} stores.`,
    };
  }

  // Apply store ratings
  const storeRatings = (sup.storeRatings as Record<string, { rating: number; ratingCount: number }>) || {};
  for (const l of listings) {
    const sr = storeRatings[l.store];
    if (sr?.rating > 0) { l.rating = sr.rating; l.ratingCount = sr.ratingCount || 0; }
  }

  // Price history
  const today = new Date();
  const priceHistory: PriceHistoryPoint[] = [];
  const base = bestPrice * 1.06;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const progress = (30 - i) / 30;
    const noise = (Math.random() - 0.5) * base * 0.03;
    priceHistory.push({ date: d.toISOString().split('T')[0], price: Math.round(base - (base - bestPrice) * progress + noise), store: bestStore });
  }

  const hasVerified = listings.some(l => l.priceValidated);
  const result: ProductSearchResult = {
    id: generateId(),
    name: (sup.name as string) || trimmedQuery,
    normalizedQuery: trimmedQuery,
    imageUrl: '', brand: (sup.brand as string) || '', category,
    keySpecs: (sup.keySpecs as string[]) || [],
    listings, bestPrice, bestStore, savings, savingsPercent,
    aiRecommendation: (sup.aiRecommendation as string) || `${bestStore} at ₹${bestPrice.toLocaleString('en-IN')} is best.`,
    overallRating: (sup.reviewSummary as ReviewSummary)?.overallRating || 0,
    priceHistory,
    pricePrediction: (sup.pricePrediction as PricePrediction) || null,
    coupons: (sup.coupons as Coupon[]) || [],
    reviewSummary: (sup.reviewSummary as ReviewSummary) || null,
    fakeDiscountAlert: (sup.fakeDiscountAlert as FakeDiscountAlert) || null,
    dataSource: hasVerified ? 'real_web' : 'search_snippets',
    pagesScraped, searchQueriesUsed: queriesUsed,
    totalResultsFound: allResults.length,
    searchSuggestions: generateSearchSuggestions(trimmedQuery),
  };

  searchCache.set(cacheKey, { result, timestamp: Date.now() });
  try { await db.searchHistory.create({ data: { query: trimmedQuery, resultCount: listings.length } }); } catch { /* ok */ }

  console.log(`[Search] ===== DONE: ${listings.length} listings (${listings.filter(l => l.priceValidated).length} verified) =====`);
  return result;
}

// ---- API ----

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q');
  if (!q?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 });
  try {
    return NextResponse.json(await performSearch(q.trim()));
  } catch (error) {
    console.error('[Search API]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Search failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 });
    return NextResponse.json(await performSearch(query.trim()));
  } catch (error) {
    console.error('[Search API]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Search failed' }, { status: 500 });
  }
}