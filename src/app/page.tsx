'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAppStore, type SearchResult } from '@/store/app-store';
import Header from '@/components/price-compare/Header';
import HeroSection from '@/components/price-compare/HeroSection';
import FeaturesSection from '@/components/price-compare/FeaturesSection';
import SearchResultsView from '@/components/price-compare/SearchResultsView';
import EmptyResultsView from '@/components/price-compare/EmptyResultsView';
import WishlistView from '@/components/price-compare/WishlistView';
import AIChatPanel from '@/components/price-compare/AIChatPanel';
import Footer from '@/components/price-compare/Footer';

function LoadingView() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-80" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function isErrorResult(r: SearchResult | null): r is { error: string } {
  return !!r && 'error' in r;
}

function isProductResult(r: SearchResult | null): r is import('@/types').ProductSearchResult {
  return !!r && 'listings' in r;
}

export default function Home() {
  const {
    currentView,
    isSearching,
    searchResults,
    searchQuery,
    setSearchResults,
    setView,
  } = useAppStore();

  useEffect(() => {
    if (currentView === 'home') {
      setSearchResults(null);
    }
  }, [currentView, setSearchResults]);

  const hasError = isErrorResult(searchResults);
  const hasNoListings = isProductResult(searchResults) && (!searchResults.listings || searchResults.listings.length === 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <HeroSection />
              <FeaturesSection />
            </motion.div>
          )}

          {currentView === 'results' && isSearching && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-8"
            >
              <LoadingView />
            </motion.div>
          )}

          {currentView === 'results' && !isSearching && hasError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center px-4 py-24 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {searchResults.error}
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setView('home')}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </motion.div>
          )}

          {currentView === 'results' && !isSearching && hasNoListings && isProductResult(searchResults) && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-5xl px-4 py-6 sm:px-6"
            >
              <EmptyResultsView
                query={searchQuery}
                recommendation={searchResults.aiRecommendation}
                dataSource={searchResults.dataSource}
              />
            </motion.div>
          )}

          {currentView === 'results' && !isSearching && isProductResult(searchResults) && !hasNoListings && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-5xl px-4 py-6 sm:px-6"
            >
              <SearchResultsView result={searchResults} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <AIChatPanel />
    </div>
  );
}