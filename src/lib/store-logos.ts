/**
 * Store logo mapping for Indian e-commerce stores.
 * Uses Clearbit Logo API for consistent, high-quality logos.
 */

const STORE_LOGO_MAP: Record<string, string> = {
  'amazon': 'https://logo.clearbit.com/amazon.in',
  'amazon.in': 'https://logo.clearbit.com/amazon.in',
  'flipkart': 'https://logo.clearbit.com/flipkart.com',
  'flipkart.com': 'https://logo.clearbit.com/flipkart.com',
  'myntra': 'https://logo.clearbit.com/myntra.com',
  'myntra.com': 'https://logo.clearbit.com/myntra.com',
  'snapdeal': 'https://logo.clearbit.com/snapdeal.com',
  'snapdeal.com': 'https://logo.clearbit.com/snapdeal.com',
  'croma': 'https://logo.clearbit.com/croma.com',
  'croma.com': 'https://logo.clearbit.com/croma.com',
  'reliance digital': 'https://logo.clearbit.com/reliancedigital.com',
  'reliance digital store': 'https://logo.clearbit.com/reliancedigital.com',
  'tata cliq': 'https://logo.clearbit.com/tatacliq.com',
  'tatacliq': 'https://logo.clearbit.com/tatacliq.com',
  'bajaj mall': 'https://logo.clearbit.com/bajajfinserv.in',
  'croma store': 'https://logo.clearbit.com/croma.com',
  'vijay sales': 'https://logo.clearbit.com/vijaysales.com',
  'vijaysales': 'https://logo.clearbit.com/vijaysales.com',
  'paytm mall': 'https://logo.clearbit.com/paytm.com',
  'paytm': 'https://logo.clearbit.com/paytm.com',
  'meesho': 'https://logo.clearbit.com/meesho.com',
  'shopclues': 'https://logo.clearbit.com/shopclues.com',
  'ebay': 'https://logo.clearbit.com/ebay.in',
  'ebay.in': 'https://logo.clearbit.com/ebay.in',
  'apple': 'https://logo.clearbit.com/apple.com',
  'apple store': 'https://logo.clearbit.com/apple.com',
  'samsung': 'https://logo.clearbit.com/samsung.com',
  'samsung store': 'https://logo.clearbit.com/samsung.com',
  'oneplus store': 'https://logo.clearbit.com/oneplus.com',
  'mi store': 'https://logo.clearbit.com/mi.com',
  'realme store': 'https://logo.clearbit.com/realme.com',
  'boat': 'https://logo.clearbit.com/boAt-lifestyle.com',
  'crossbeats': 'https://logo.clearbit.com/crossbeats.com',
  'noise': 'https://logo.clearbit.com/noise.com',
};

/**
 * Get the logo URL for a given store name.
 * Falls back to a generic placeholder if the store is unknown.
 */
export function getStoreLogo(storeName: string): string {
  const key = storeName.toLowerCase().trim();
  if (STORE_LOGO_MAP[key]) {
    return STORE_LOGO_MAP[key];
  }

  // Try partial matching
  for (const [mapKey, url] of Object.entries(STORE_LOGO_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return url;
    }
  }

  // Fallback: use first word of store name with .com
  const domain = key.replace(/\s+/g, '').toLowerCase();
  return `https://logo.clearbit.com/${domain}.com`;
}