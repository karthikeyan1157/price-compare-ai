// =====================
// Product & Store Types
// =====================

export interface StoreListing {
  store: string;
  storeLogo: string;
  price: number;
  originalPrice?: number;
  currency: string;
  delivery: string;
  deliveryCost: number;
  rating: number;
  ratingCount: number;
  inStock: boolean;
  storeUrl?: string;
  couponCode?: string;
  cashback?: string;
  exchangeOffer?: string;
  emiAvailable: boolean;
  emiInfo?: string;
  sellerName?: string;
  priceValidated?: boolean;
  dealScore?: number;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  normalizedQuery: string;
  imageUrl: string;
  brand: string;
  category: string;
  keySpecs: string[];
  listings: StoreListing[];
  bestPrice: number;
  bestStore: string;
  savings: number;
  savingsPercent: number;
  aiRecommendation: string;
  overallRating: number;
  priceHistory: PriceHistoryPoint[];
  pricePrediction?: PricePrediction;
  coupons: Coupon[];
  reviewSummary?: ReviewSummary | null;
  fakeDiscountAlert?: FakeDiscountAlert | null;
  dataSource?: string;
  pagesScraped?: number;
  searchQueriesUsed?: number;
  totalResultsFound?: number;
  searchSuggestions?: string[];
}

// =====================
// Price History
// =====================

export interface PriceHistoryPoint {
  date: string;
  price: number;
  store: string;
}

export interface PricePrediction {
  currentPrice: number;
  predictedPrice: number;
  predictedDrop: number;
  predictedDropPercent: number;
  confidence: number;
  timeframe: string;
  direction: 'up' | 'down' | 'stable';
  reasoning: string;
}

// =====================
// Coupons & Deals
// =====================

export interface Coupon {
  code: string;
  description: string;
  discount: string;
  discountType: 'percentage' | 'flat' | 'cashback';
  store: string;
  validTill: string;
  terms: string;
  category: 'coupon' | 'bank_offer' | 'exchange' | 'emi' | 'cashback';
}

// =====================
// AI Review Summary
// =====================

export interface ReviewSummary {
  totalReviews: number;
  overallRating: number;
  pros: string[];
  cons: string[];
  summary: string;
  sentiment: 'positive' | 'mixed' | 'negative';
  highlights: string[];
}

// =====================
// Fake Discount
// =====================

export interface FakeDiscountAlert {
  isGenuine: boolean;
  confidence: number;
  analysis: string;
  highestEverPrice: number;
  lowestEverPrice: number;
  typicalPriceRange: [number, number];
  currentPriceHistory: string;
}

// =====================
// AI Chat
// =====================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  isActive: boolean;
}

// =====================
// Wishlist
// =====================

export interface WishlistItem {
  id: string;
  productName: string;
  productKey: string;
  store: string;
  price: number;
  currency: string;
  imageUrl?: string;
  storeUrl?: string;
  createdAt: string;
}

// =====================
// App State
// =====================

export type AppView = 'home' | 'results' | 'product-detail' | 'wishlist';

export interface TrendingSearch {
  query: string;
  category: string;
  count: number;
}