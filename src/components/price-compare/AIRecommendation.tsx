'use client';

import { motion } from 'framer-motion';
import { Sparkles, ExternalLink, Star, Clock, TrendingDown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StoreLogo from './StoreLogo';
import { formatPrice } from '@/lib/helpers';
import type { ProductSearchResult } from '@/types';

interface AIRecommendationProps {
  result: ProductSearchResult;
}

export default function AIRecommendation({ result }: AIRecommendationProps) {
  const bestListing = result.listings.find(
    (l) => l.store === result.bestStore,
  ) || result.listings[0];

  if (!bestListing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-xl border border-success/30 bg-gradient-to-br from-success/5 to-transparent"
    >
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
            <Sparkles className="h-4 w-4 text-success" />
          </div>
          <h3 className="text-sm font-semibold">AI Recommendation</h3>
          <Badge className="bg-success/10 text-success text-[10px] border-0">
            Best Deal
          </Badge>
        </div>

        {/* Store & Price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <StoreLogo store={bestListing.store} />
            <div>
              <p className="font-semibold">{bestListing.store}</p>
              <p className="text-2xl font-bold text-success">{formatPrice(bestListing.price)}</p>
              {bestListing.originalPrice && bestListing.originalPrice > bestListing.price && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatPrice(bestListing.originalPrice)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-success" />
              Savings
            </div>
            <p className="mt-0.5 text-sm font-bold text-success">
              {formatPrice(result.savings)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              Rating
            </div>
            <p className="mt-0.5 text-sm font-bold">
              {bestListing.rating || 'N/A'}{' '}
              {bestListing.ratingCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({bestListing.ratingCount.toLocaleString('en-IN')})
                </span>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Delivery
            </div>
            <p className="mt-0.5 text-sm font-bold">{bestListing.delivery || 'Standard'}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-success" />
              Stock
            </div>
            <p className="mt-0.5 text-sm font-bold text-success">
              {bestListing.inStock ? 'Available' : 'Out of Stock'}
            </p>
          </div>
        </div>

        {/* AI Reasoning */}
        {result.aiRecommendation && (
          <div className="mt-4 rounded-lg border border-border/50 bg-card p-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">AI Analysis</p>
            <p className="text-sm leading-relaxed text-foreground/80">{result.aiRecommendation}</p>
          </div>
        )}

        {/* CTA */}
        <Button
          className="mt-4 w-full gap-2 bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
          asChild
        >
          <a href={bestListing.storeUrl || '#'} target="_blank" rel="noopener noreferrer">
            <Sparkles className="h-4 w-4" />
            Buy at {bestListing.store}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </motion.div>
  );
}