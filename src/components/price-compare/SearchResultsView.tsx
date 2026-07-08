'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  History,
  Ticket,
  MessageSquare,
  Globe,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/app-store';
import ComparisonTable from './ComparisonTable';
import PriceHistoryChart from './PriceHistoryChart';
import CouponFinder from './CouponFinder';
import AIRecommendation from './AIRecommendation';
import PricePredictionCard from './PricePrediction';
import ReviewSummary from './ReviewSummary';
import FakeDiscountAlert from './FakeDiscountAlert';
import type { ProductSearchResult } from '@/types';

interface SearchResultsViewProps {
  result: ProductSearchResult;
}

const dataSourceLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  real_web: { label: 'Live from Store Pages', icon: Shield, color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20' },
  search_snippets: { label: 'From Search Snippets', icon: Globe, color: 'text-amber-600 bg-amber-50 border-amber-200/60 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20' },
  google_search: { label: 'From Search', icon: Globe, color: 'text-amber-600 bg-amber-50 border-amber-200/60 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20' },
  no_data: { label: 'No Data', icon: Globe, color: 'text-muted-foreground bg-muted border-border' },
};

export default function SearchResultsView({ result }: SearchResultsViewProps) {
  const {
    showPriceHistory,
    setShowPriceHistory,
    selectedListingForHistory,
    setSelectedListingForHistory,
    setView,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState('compare');

  const source = dataSourceLabels[result.dataSource || 'google_search'] || dataSourceLabels.google_search;
  const SourceIcon = source.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Back Button & Product Title */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setView('home')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{result.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {result.category && (
                <Badge variant="secondary" className="text-xs">{result.category}</Badge>
              )}
              {result.brand && (
                <Badge variant="outline" className="text-xs">{result.brand}</Badge>
              )}
              {result.keySpecs?.slice(0, 3).map((spec) => (
                <Badge key={spec} variant="outline" className="text-xs text-muted-foreground">{spec}</Badge>
              ))}
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 gap-1 text-xs border-0 ${source.color}`}>
            <SourceIcon className="h-3 w-3" />
            {source.label}
          </Badge>
        </div>
      </div>

      {/* AI Recommendation + Price Prediction Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AIRecommendation result={result} />
        {result.pricePrediction && <PricePredictionCard prediction={result.pricePrediction} />}
      </div>

      {/* Tabs Section — no AnimatePresence (causes duplicate key error with Radix Tabs) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger
            value="compare"
            className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <span className="hidden sm:inline">💰</span> Compare Prices
            {result.listings?.length > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-primary-foreground/20">
                {result.listings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Price History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger
            value="coupons"
            className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Ticket className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Coupons</span>
            <span className="sm:hidden">Coupons</span>
            {result.coupons?.length > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-primary-foreground/20">
                {result.coupons.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reviews</span>
            <span className="sm:hidden">Reviews</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab content rendered conditionally — only one at a time, no duplicate keys */}
        <div className="pt-4">
          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ComparisonTable result={result} />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-border/50 bg-card p-4 sm:p-6"
            >
              <PriceHistoryChart
                data={result.priceHistory || []}
                productName={result.name}
                store={result.bestStore}
              />
            </motion.div>
          )}

          {activeTab === 'coupons' && (
            <motion.div
              key="coupons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {result.coupons && result.coupons.length > 0 ? (
                <CouponFinder coupons={result.coupons} productName={result.name} />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-border/50 bg-card text-sm text-muted-foreground">
                  No coupons available for this product
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {result.reviewSummary && (
                <ReviewSummary summary={result.reviewSummary} />
              )}
              {result.fakeDiscountAlert && (
                <FakeDiscountAlert alert={result.fakeDiscountAlert} />
              )}
              {!result.reviewSummary && !result.fakeDiscountAlert && (
                <div className="flex h-32 items-center justify-center rounded-xl border border-border/50 bg-card text-sm text-muted-foreground">
                  No review data available for this product
                </div>
              )}
            </motion.div>
          )}
        </div>
      </Tabs>

      {/* Price History Dialog */}
      <Dialog open={showPriceHistory} onOpenChange={setShowPriceHistory}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Price History
            </DialogTitle>
            <DialogDescription>
              {selectedListingForHistory
                ? `${result.name} — ${selectedListingForHistory.store}`
                : result.name}
            </DialogDescription>
          </DialogHeader>
          <PriceHistoryChart
            data={
              selectedListingForHistory
                ? (result.priceHistory || []).filter(
                    (p) => p.store === selectedListingForHistory.store,
                  )
                : result.priceHistory || []
            }
            productName={result.name}
            store={selectedListingForHistory?.store || result.bestStore}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}