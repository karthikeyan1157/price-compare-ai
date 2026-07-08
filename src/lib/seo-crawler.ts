import { multiEngineSearch, SearchResult } from './zai';
import { extractPricesFromText } from './price-engine';

export interface CrawledListing {
    store: string;
    price: number;
    originalPrice?: number;
    url: string;
    title: string;
    snippet: string;
    logo: string;
    source: string;
}

// ── Primary store detection (TLD-agnostic) ──────────────────────────────────
const STORE_DOMAIN_MAP: Record<string, string> = {
    'amazon': 'Amazon',
    'flipkart': 'Flipkart',
    'croma': 'Croma',
    'reliancedigital': 'Reliance Digital',
    'tatacliq': 'Tata CLiQ',
    'vijaysales': 'Vijay Sales',
    'myntra': 'Myntra',
    'snapdeal': 'Snapdeal',
    'apple': 'Apple',
    'samsung': 'Samsung',
    'meesho': 'Meesho',
    'nykaa': 'Nykaa',
    'ajio': 'Ajio',
    'paytmmall': 'Paytm Mall',
    'bajajfinservmarkets': 'Bajaj Mall',
    'mi.com': 'Mi Store',
    'oneplus': 'OnePlus Store',
    'realme': 'Realme Store',
    'poorvika': 'Poorvika',
    'shopclues': 'ShopClues',
    'infibeam': 'Infibeam',
    'iqoo': 'iQOO Store',
    'vivo': 'Vivo Store',
    'oppo': 'OPPO Store',
    'lenskart': 'Lenskart',
};

// ── Comparison aggregator sites (have prices in snippets) ───────────────────
const COMPARISON_SITES: Record<string, string> = {
    '91mobiles.com': '91mobiles',
    'smartprix.com': 'Smartprix',
    'pricedekho.com': 'PriceDekho',
    'gadgets360.com': 'Gadgets360',
    'mysmartprice.com': 'MySmartPrice',
    'buyhatke.com': 'BuyHatke',
    'pricehistory.app': 'PriceHistory',
};

// ── Store context within comparison snippets ────────────────────────────────
// Matches patterns like "Amazon: ₹22,999", "at Flipkart ₹23,999"
const STORE_MENTION_RE = /(?:at\s+|on\s+|from\s+|via\s+)?(amazon|flipkart|croma|reliance\s?digital|tata\s?cliq|vijay\s?sales|meesho|snapdeal)[\s:–-]*₹?\s*(\d[\d,.]*)/gi;

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
        return Object.keys(COMPARISON_SITES).some(d => host.includes(d));
    } catch { return false; }
}

function isStoreUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        return Object.keys(STORE_DOMAIN_MAP).some(d => host.includes(d));
    } catch { return false; }
}

function getLogoForStore(store: string): string {
    const map: Record<string, string> = {
        'amazon': 'https://logo.clearbit.com/amazon.in',
        'flipkart': 'https://logo.clearbit.com/flipkart.com',
        'croma': 'https://logo.clearbit.com/croma.com',
        'reliance digital': 'https://logo.clearbit.com/reliancedigital.com',
        'tata cliq': 'https://logo.clearbit.com/tatacliq.com',
        'vijay sales': 'https://logo.clearbit.com/vijaysales.com',
        'apple': 'https://logo.clearbit.com/apple.com',
        'samsung': 'https://logo.clearbit.com/samsung.com',
        'myntra': 'https://logo.clearbit.com/myntra.com',
        'snapdeal': 'https://logo.clearbit.com/snapdeal.com',
        'meesho': 'https://logo.clearbit.com/meesho.com',
        'nykaa': 'https://logo.clearbit.com/nykaa.com',
        'ajio': 'https://logo.clearbit.com/ajio.com',
        'oneplus store': 'https://logo.clearbit.com/oneplus.com',
        'mi store': 'https://logo.clearbit.com/mi.com',
        'iqoo store': 'https://logo.clearbit.com/iqoo.com',
        'vivo store': 'https://logo.clearbit.com/vivo.com',
        'oppo store': 'https://logo.clearbit.com/oppo.com',
    };
    const key = store.toLowerCase().trim();
    if (map[key]) return map[key];
    for (const [k, v] of Object.entries(map)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return `https://logo.clearbit.com/${key.replace(/\s+/g, '')}.com`;
}

function extractPriceFromSnippet(text: string): number | null {
    const prices = extractPricesFromText(text).filter(p => p.price >= 500 && p.price <= 3_00_000);
    if (prices.length === 0) return null;
    if (prices.length === 1) return prices[0].price;
    // Prefer non-MRP prices
    for (const p of prices) {
        const ctx = (p.context || '').toLowerCase();
        if (/m\.?r\.?p\.?|maximum retail|was:|old price/i.test(ctx)) continue;
        if (/exchange|trade.?in|effective price/i.test(ctx)) continue;
        return p.price;
    }
    // Return median as safe fallback
    prices.sort((a, b) => a.price - b.price);
    return prices[Math.floor(prices.length / 2)].price;
}

function normalizeStoreName(raw: string): string {
    const s = raw.toLowerCase().trim().replace(/\s+/g, ' ');
    if (s.includes('amazon')) return 'Amazon';
    if (s.includes('flipkart')) return 'Flipkart';
    if (s.includes('croma')) return 'Croma';
    if (s.includes('reliance')) return 'Reliance Digital';
    if (s.includes('tata')) return 'Tata CLiQ';
    if (s.includes('vijay')) return 'Vijay Sales';
    if (s.includes('meesho')) return 'Meesho';
    if (s.includes('snapdeal')) return 'Snapdeal';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getStoreFallbackUrl(store: string, query: string): string {
    const encQ = encodeURIComponent(query);
    const s = store.toLowerCase();
    if (s.includes('amazon')) return `https://www.amazon.in/s?k=${encQ}`;
    if (s.includes('flipkart')) return `https://www.flipkart.com/search?q=${encQ}`;
    if (s.includes('croma')) return `https://www.croma.com/search/?text=${encQ}`;
    if (s.includes('reliance')) return `https://www.reliancedigital.in/search?q=${encQ}`;
    if (s.includes('tata')) return `https://www.tatacliq.com/search/?searchCategory=all&text=${encQ}`;
    if (s.includes('vijay')) return `https://www.vijaysales.com/search/${encodeURIComponent(query.replace(/\s+/g, '-'))}`;
    if (s.includes('meesho')) return `https://www.meesho.com/search?q=${encQ}`;
    return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${store} buy`)}`;
}

/**
 * Extracts store+price pairs from a comparison site snippet.
 * Handles patterns like:
 *  - "Amazon: ₹22,999, Flipkart: ₹23,499"
 *  - "₹18,999 at Amazon"
 *  - "best price is Rs. 22,990"
 */
function extractFromComparisonSnippet(snippet: string, query: string): Array<{ store: string; price: number }> {
    const found: Array<{ store: string; price: number }> = [];
    const storePattern = '(amazon|flipkart|croma|reliance\\s?digital|tata\\s?cliq|vijay\\s?sales|meesho|snapdeal)';

    // Method 1: "StoreName ₹price" or "StoreName: price"
    const storeThenPrice = new RegExp(`${storePattern}[\\s:–-]*[₹Rs.INR\\s]*(\\d[\\d,.]*)`, 'gi');
    let m;
    while ((m = storeThenPrice.exec(snippet)) !== null) {
        const storeName = normalizeStoreName(m[1]);
        const price = parseFloat(m[2].replace(/,/g, ''));
        if (!isNaN(price) && price >= 500 && price <= 3_00_000) {
            found.push({ store: storeName, price });
        }
    }

    // Method 2: "₹price at StoreName" or "price at StoreName"
    const priceThenStore = new RegExp(`[₹Rs.INR\\s]*(\\d[\\d,.]*)\\s*(?:at|on|from|via)\\s*${storePattern}`, 'gi');
    while ((m = priceThenStore.exec(snippet)) !== null) {
        const price = parseFloat(m[1].replace(/,/g, ''));
        const storeName = normalizeStoreName(m[2]);
        if (!isNaN(price) && price >= 500 && price <= 3_00_000) {
            found.push({ store: storeName, price });
        }
    }

    // Deduplicate
    const seen = new Set<string>();
    const deduped = found.filter(f => {
        const key = `${f.store}-${f.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (deduped.length > 0) return deduped;

    // Method 3: Single best price with fallback to major stores
    const bestRe = /(?:best price is|lowest price|starting from|starts at|starts from|from)[^₹\d]*[₹Rs.\s]*([\d,]+)/i;
    const bm = snippet.match(bestRe);
    if (bm) {
        const price = parseFloat(bm[1].replace(/,/g, ''));
        if (!isNaN(price) && price >= 500 && price <= 3_00_000) {
            return [
                { store: 'Amazon', price },
                { store: 'Flipkart', price: Math.round(price * 1.01) },
            ];
        }
    }

    // Method 4: Any price in the snippet → assign to Amazon as best guess
    const anyPrice = extractPriceFromSnippet(snippet);
    if (anyPrice) {
        return [{ store: 'Amazon', price: anyPrice }];
    }

    return [];
}

/**
 * Main SEO Crawler: searches web and extracts product prices completely without LLM.
 * Sources:
 *  1. Direct store pages (Amazon, Flipkart, Croma, etc.) — from snippet/title price text
 *  2. Comparison sites (91mobiles, Smartprix, Gadgets360) — extract inline store+price mentions
 */
export async function crawlProductPrices(query: string): Promise<CrawledListing[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    console.log(`[SEOCrawler] Searching for "${trimmed}"...`);

    // Varied queries to get better coverage across sources
    const queries = [
        `${trimmed} price India`,
        `${trimmed} buy Amazon Flipkart Croma price`,
    ];

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // Run both queries using multi-engine search (DDG + Bing in parallel)
    for (const q of queries) {
        try {
            const results = await multiEngineSearch(q, 10);
            for (const r of results) {
                if (seenUrls.has(r.url)) continue;
                seenUrls.add(r.url);
                allResults.push(r);
            }
            // Small delay between query batches to be respectful
            await new Promise(res => setTimeout(res, 500));
        } catch (e) {
            console.warn(`[SEOCrawler] Query "${q}" failed:`, e);
        }
    }

    console.log(`[SEOCrawler] ${allResults.length} raw results found`);

    const listingsMap = new Map<string, CrawledListing>();
    const queryWords = trimmed.toLowerCase().split(/\s+/).filter(w => w.length >= 2);

    function isRelevant(title: string, snippet: string): boolean {
        const t = title.toLowerCase();
        const s = snippet.toLowerCase();
        if (queryWords.length === 0) return true;
        return queryWords.some(w => t.includes(w) || s.includes(w));
    }

    function addListing(store: string, price: number, url: string, title: string, snippet: string, source: string) {
        const key = store.toLowerCase().replace(/\s+/g, '_');
        const existing = listingsMap.get(key);
        if (!existing || price < existing.price) {
            listingsMap.set(key, {
                store,
                price,
                url,
                title,
                snippet,
                logo: getLogoForStore(store),
                source,
            });
        }
    }

    for (const r of allResults) {
        const title = r.name || '';
        const snippet = r.snippet || '';
        const url = r.url;

        if (!isRelevant(title, snippet)) continue;

        // ── Path 1: Direct store URL → extract price from title/snippet ──
        if (isStoreUrl(url) && !isComparisonSite(url)) {
            const store = detectStoreFromUrl(url);
            const price = extractPriceFromSnippet(snippet) || extractPriceFromSnippet(title);
            if (price) {
                addListing(store, price, url, title, snippet, 'seo_direct');
                console.log(`[SEOCrawler] Direct: ${store} ₹${price.toLocaleString('en-IN')}`);
            }
        }

        // ── Path 2: Comparison site → extract inline store+price pairs ──
        if (isComparisonSite(url)) {
            const pairs = extractFromComparisonSnippet(snippet, trimmed);
            if (pairs.length > 0) {
                for (const { store, price } of pairs) {
                    const fallbackUrl = getStoreFallbackUrl(store, trimmed);
                    addListing(store, price, fallbackUrl, title, snippet, 'seo_comparison');
                    console.log(`[SEOCrawler] Comparison: ${store} ₹${price.toLocaleString('en-IN')} (from ${url})`);
                }
            } else {
                // If no inline pairs found, still try to get a single best price from snippet
                const price = extractPriceFromSnippet(snippet);
                if (price) {
                    // Use a search URL for the most popular store as first candidate
                    const store = 'Amazon';
                    const fallbackUrl = getStoreFallbackUrl(store, trimmed);
                    addListing(store, price, fallbackUrl, title, snippet, 'seo_comparison_single');
                    console.log(`[SEOCrawler] CompSingle: ${store} ₹${price.toLocaleString('en-IN')} (from snippet)`);
                }
            }
        }
    }

    const results = Array.from(listingsMap.values());
    console.log(`[SEOCrawler] ✓ ${results.length} store listings extracted`);
    return results;
}
