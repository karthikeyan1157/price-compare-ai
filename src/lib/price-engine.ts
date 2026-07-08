/**
 * Price Engine — Price Intelligence Utilities
 * No external imports — uses only built-in Node/TypeScript APIs.
 */

// ─── extractPricesFromText ──────────────────────────────────────────

export function extractPricesFromText(
  text: string
): Array<{ price: number; context: string }> {
  const results: Array<{ price: number; context: string }> = [];
  const CONTEXT_HALF = 50;
  const MIN_PRICE = 100;
  const MAX_PRICE = 50_00_000;

  const rupeeSymbolRe = /[₹$]\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;
  const rsPrefixRe = /Rs\.?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;
  const inrPrefixRe = /INR\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;

  const patterns = [rupeeSymbolRe, rsPrefixRe, inrPrefixRe];

  for (const re of patterns) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const rawNumber = match[1].replace(/,/g, '');
      const price = parseFloat(rawNumber);
      if (isNaN(price) || price < MIN_PRICE || price > MAX_PRICE) continue;

      const start = Math.max(0, match.index - CONTEXT_HALF);
      const end = Math.min(text.length, match.index + match[0].length + CONTEXT_HALF);
      let context = text.slice(start, end).replace(/\s+/g, ' ').trim();
      results.push({ price, context });
    }
  }

  // Deduplicate by rounded price
  const seen = new Set<number>();
  return results.filter((r) => {
    const rounded = Math.round(r.price);
    if (seen.has(rounded)) return false;
    seen.add(rounded);
    return true;
  });
}

// ─── calculateDealScore ─────────────────────────────────────────────

interface Listing { price: number; originalPrice?: number; }

interface DealScoreResult { score: number; label: string; color: string; }

export function calculateDealScore(
  listing: Listing,
  allPrices: number[]
): DealScoreResult {
  if (allPrices.length === 0) return { score: 50, label: '📊 Average', color: 'text-orange-500' };
  const lowest = Math.min(...allPrices);
  if (lowest <= 0) return { score: 50, label: '📊 Average', color: 'text-orange-500' };

  const deltaPercent = ((listing.price - lowest) / lowest) * 100;
  let score: number;

  if (listing.price === lowest || deltaPercent === 0) {
    score = 90 + (allPrices.length > 1 ? 3 : 5);
  } else if (deltaPercent <= 2) {
    score = 70 + (deltaPercent / 2) * 14;
  } else if (deltaPercent <= 5) {
    score = 69 - ((deltaPercent - 2) / 3) * 14;
  } else if (deltaPercent <= 10) {
    score = 54 - ((deltaPercent - 5) / 5) * 14;
  } else {
    const excess = Math.min(deltaPercent - 10, 50);
    score = 39 - (excess / 50) * 29;
  }

  if (listing.originalPrice && listing.originalPrice > 0) {
    const discountPercent = ((listing.originalPrice - listing.price) / listing.originalPrice) * 100;
    if (discountPercent > 15) score = Math.min(100, score + 10);
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  if (score >= 85) return { score, label: '🔥 Steal Deal', color: 'text-emerald-500' };
  if (score >= 70) return { score, label: '✨ Great Deal', color: 'text-green-500' };
  if (score >= 55) return { score, label: '👍 Good Price', color: 'text-amber-500' };
  if (score >= 40) return { score, label: '📊 Average', color: 'text-orange-500' };
  return { score, label: '⚠️ Overpriced', color: 'text-red-500' };
}

// ─── detectProductCategory ──────────────────────────────────────────

const CATEGORY_KEYWORDS: Array<[string[], string]> = [
  [['iphone', 'samsung galaxy', 'oneplus ', 'pixel ', 'redmi', 'realme', 'vivo', 'oppo', 'nothing phone', 'smartphone', 'mobile phone', 'motog'], 'Smartphones'],
  [['laptop', 'macbook', 'notebook', 'chromebook', 'thinkpad', 'surface laptop', 'spectre', 'pavilion', 'inspiron', 'legion', 'predator', 'zenbook', 'vivobook'], 'Laptops'],
  [['ipad', 'tablet', 'galaxy tab', 'redmi pad', 'surface pro', 'fire tab'], 'Tablets'],
  [['headphone', 'earbuds', 'earphone', 'airpods', 'galaxy buds', 'neckband', 'headset', 'airpod', 'tws'], 'Headphones/Earbuds'],
  [['tv', 'television', 'smart tv', 'oled tv', 'qled tv', 'led tv', '4k tv'], 'Televisions'],
  [['camera', 'dslr', 'mirrorless', 'gopro', 'action camera', 'instax', 'camcorder', 'sony alpha', 'canon eos'], 'Cameras'],
  [['watch', 'smartwatch', 'apple watch', 'galaxy watch', 'fitbit', 'noise watch', 'fastrack', 'titan watch'], 'Watches/Smartwatches'],
  [['refrigerator', 'fridge', 'side by side', 'double door fridge'], 'Refrigerators'],
  [['washing machine', 'washer', 'front load', 'top load', 'washer dryer'], 'Washing Machines'],
  [['air conditioner', 'ac ', 'inverter ac', 'split ac', 'window ac'], 'Air Conditioners'],
  [['speaker', 'soundbar', 'home theatre', 'jbl ', 'bose ', 'bluetooth speaker', 'woofer'], 'Audio Speakers'],
  [['ps5', 'xbox', 'nintendo switch', 'playstation', 'gaming console', 'rtx ', 'gtx ', 'graphics card', 'gpu'], 'Gaming'],
  [['shirt', 't-shirt', 'jeans', 'sneakers', 'shoes', 'dress', 'kurta', 'saree', 'jacket', 'hoodie', 'sunglasses', 'handbag', 'wallet', 'belt'], 'Fashion'],
  [['microwave', 'air fryer', 'water purifier', 'vacuum cleaner', 'iron', 'geyser', 'water heater', 'chimney', 'mixer grinder', 'induction', 'dishwasher'], 'Home Appliances'],
];

export function detectProductCategory(query: string): string {
  const lower = query.toLowerCase();
  for (const [keywords, category] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return 'General';
}

// ─── generateSearchSuggestions ──────────────────────────────────────

export function generateSearchSuggestions(query: string): string[] {
  const trimmed = query.trim();
  const suffixes = ['price India', 'review', 'best price', 'vs', 'deals', 'buy online'];
  const count = 4 + Math.floor(Math.random() * 2);
  const shuffled = [...suffixes].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((s) => `${trimmed} ${s}`);
}