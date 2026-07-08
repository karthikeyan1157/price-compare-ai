import { create } from 'zustand';
import type {
  AppView,
  ProductSearchResult,
  ChatMessage,
  WishlistItem,
  TrendingSearch,
  StoreListing,
} from '@/types';

export type SearchErrorResult = { error: string };
export type SearchResult = ProductSearchResult | SearchErrorResult;

interface AppState {
  // Navigation
  currentView: AppView;
  setView: (view: AppView) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  setIsSearching: (v: boolean) => void;
  searchResults: SearchResult | null;
  setSearchResults: (r: SearchResult | null) => void;
  searchHistory: string[];
  addToSearchHistory: (q: string) => void;
  searchError: string | null;
  setSearchError: (e: string | null) => void;

  // Selected product detail
  selectedProduct: ProductSearchResult | null;
  setSelectedProduct: (p: ProductSearchResult | null) => void;

  // Price History
  showPriceHistory: boolean;
  setShowPriceHistory: (v: boolean) => void;
  selectedListingForHistory: StoreListing | null;
  setSelectedListingForHistory: (l: StoreListing | null) => void;

  // AI Chat
  chatMessages: ChatMessage[];
  addChatMessage: (m: ChatMessage) => void;
  updateChatMessage: (id: string, content: string) => void;
  isChatTyping: boolean;
  setIsChatTyping: (v: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  clearChat: () => void;

  // Wishlist
  wishlist: WishlistItem[];
  setWishlist: (items: WishlistItem[]) => void;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (productKey: string) => boolean;

  // Coupons panel
  showCoupons: boolean;
  setShowCoupons: (v: boolean) => void;

  // Trending
  trendingSearches: TrendingSearch[];
  setTrendingSearches: (t: TrendingSearch[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'home',
  setView: (view) => set({ currentView: view }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  isSearching: false,
  setIsSearching: (v) => set({ isSearching: v }),
  searchResults: null,
  setSearchResults: (r) => set({ searchResults: r }),
  searchHistory: [],
  addToSearchHistory: (q) =>
    set((s) => ({
      searchHistory: [q, ...s.searchHistory.filter((h) => h !== q)].slice(0, 10),
    })),
  searchError: null,
  setSearchError: (e) => set({ searchError: e }),

  // Selected product
  selectedProduct: null,
  setSelectedProduct: (p) => set({ selectedProduct: p }),

  // Price History
  showPriceHistory: false,
  setShowPriceHistory: (v) => set({ showPriceHistory: v }),
  selectedListingForHistory: null,
  setSelectedListingForHistory: (l) => set({ selectedListingForHistory: l }),

  // AI Chat
  chatMessages: [],
  addChatMessage: (m) =>
    set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  updateChatMessage: (id, content) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content, isLoading: false } : m
      ),
    })),
  isChatTyping: false,
  setIsChatTyping: (v) => set({ isChatTyping: v }),
  isChatOpen: false,
  setIsChatOpen: (v) => set({ isChatOpen: v }),
  clearChat: () => set({ chatMessages: [] }),

  // Wishlist
  wishlist: [],
  setWishlist: (items) => set({ wishlist: items }),
  addToWishlist: (item) =>
    set((s) => {
      if (s.wishlist.some((w) => w.productKey === item.productKey)) return s;
      return { wishlist: [...s.wishlist, item] };
    }),
  removeFromWishlist: (id) =>
    set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) })),
  isInWishlist: (productKey) =>
    get().wishlist.some((w) => w.productKey === productKey),

  // Coupons
  showCoupons: false,
  setShowCoupons: (v) => set({ showCoupons: v }),

  // Trending
  trendingSearches: [
    { query: 'iPhone 16 128GB', category: 'Mobiles', count: 12400 },
    { query: 'MacBook Air M4', category: 'Laptops', count: 8900 },
    { query: 'Sony WH-1000XM6', category: 'Audio', count: 6700 },
    { query: 'Samsung Galaxy S25 Ultra', category: 'Mobiles', count: 11200 },
    { query: 'PS5 Pro', category: 'Gaming', count: 9300 },
    { query: 'AirPods Pro 3', category: 'Audio', count: 7800 },
    { query: 'OnePlus 14', category: 'Mobiles', count: 5400 },
    { query: 'Fire-Boltt Phoenix Ultra', category: 'Wearables', count: 4200 },
  ],
  setTrendingSearches: (t) => set({ trendingSearches: t }),
}));