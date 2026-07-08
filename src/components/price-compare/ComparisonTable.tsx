'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, ExternalLink, Heart, Clock, TrendingDown, ArrowUpDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store/app-store';
import StoreLogo from './StoreLogo';
import { formatPrice } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { ProductSearchResult } from '@/types';

type SortKey = 'price' | 'rating' | 'delivery';

function parseDeliveryDays(delivery: string): number {
  const match = delivery.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

function StarDisplay({ rating }: { rating: number }) {
  if (!rating || rating === 0) return <span className="text-xs text-muted-foreground">N/A</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-3.5 w-3.5',
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted',
          )}
        />
      ))}
    </div>
  );
}

interface ComparisonTableProps {
  result: ProductSearchResult;
}

export default function ComparisonTable({ result }: ComparisonTableProps) {
  const { addToWishlist, setShowPriceHistory, setSelectedListingForHistory, isInWishlist } =
    useAppStore();
  const [sortBy, setSortBy] = useState<SortKey>('price');

  const validListings = result.listings.filter((l) => l.price > 0);
  const highestPrice = Math.max(...validListings.map((l) => l.price));

  const sortedListings = useMemo(() => {
    const sorted = [...validListings];
    switch (sortBy) {
      case 'price':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'delivery':
        sorted.sort((a, b) => parseDeliveryDays(a.delivery) - parseDeliveryDays(b.delivery));
        break;
    }
    return sorted;
  }, [validListings, sortBy]);

  const handleViewHistory = (listing: (typeof sortedListings)[0]) => {
    setSelectedListingForHistory(listing);
    setShowPriceHistory(true);
  };

  const handleAddToWishlist = async (listing: (typeof sortedListings)[0]) => {
    const productKey = `${result.id}-${listing.store}`;
    if (isInWishlist(productKey)) return;
    // Persist to database via API
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: result.name || result.normalizedQuery,
          productKey,
          store: listing.store,
          price: listing.price,
          currency: listing.currency || 'INR',
          storeUrl: listing.storeUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addToWishlist({
          id: data.id,
          productName: data.productName,
          productKey: data.productKey,
          store: data.store,
          price: data.price,
          currency: data.currency,
          storeUrl: data.storeUrl,
          createdAt: data.createdAt,
        });
      }
    } catch (e) {
      console.error('Failed to save wishlist item:', e);
    }
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'price', label: 'Price' },
    { key: 'rating', label: 'Rating' },
    { key: 'delivery', label: 'Delivery' },
  ];

  if (validListings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border/50 bg-card text-sm text-muted-foreground">
        No valid price listings found
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sort Controls */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {validListings.length} store{validListings.length !== 1 ? 's' : ''} found
          {result.dataSource === 'real_web' && (
            <span className="ml-1.5 inline-flex items-center gap-1 text-primary">
              <Globe className="h-3 w-3" />
              live
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
          {sortOptions.map((opt) => (
            <Button
              key={opt.key}
              variant={sortBy === opt.key ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 rounded-md text-xs',
                sortBy === opt.key && 'bg-primary text-primary-foreground',
              )}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table Header - Desktop */}
      <div className="hidden rounded-t-xl border border-border/50 bg-muted/50 px-4 py-2.5 lg:grid lg:grid-cols-[1fr_120px_100px_90px_80px_160px] lg:gap-4">
        <span className="text-xs font-medium text-muted-foreground">Store</span>
        <span className="text-xs font-medium text-muted-foreground">Price</span>
        <span className="text-xs font-medium text-muted-foreground">Delivery</span>
        <span className="text-xs font-medium text-muted-foreground">Rating</span>
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <span className="text-xs font-medium text-muted-foreground">Actions</span>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {sortedListings.map((listing, idx) => {
          const isBest = listing.price === result.bestPrice && result.bestPrice > 0;
          const savings = highestPrice - listing.price;
          const savingsPercent = highestPrice > 0 ? ((savings / highestPrice) * 100).toFixed(0) : '0';
          const inWishlist = isInWishlist(`${result.id}-${listing.store}`);

          return (
            <motion.div
              key={listing.store + listing.price}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={cn(
                'rounded-xl border bg-card p-4 transition-all hover:shadow-md',
                isBest
                  ? 'price-glow border-success/40'
                  : 'border-border/50 hover:border-border',
              )}
            >
              {/* Desktop Layout */}
              <div className="hidden items-center gap-4 lg:grid lg:grid-cols-[1fr_120px_100px_90px_80px_160px]">
                {/* Store */}
                <div className="flex items-center gap-3">
                  <StoreLogo store={listing.store} />
                  <div>
                    <p className="text-sm font-medium">{listing.store}</p>
                    {listing.sellerName && (
                      <p className="text-xs text-muted-foreground">{listing.sellerName}</p>
                    )}
                  </div>
                  {isBest && (
                    <Badge className="bg-success text-success-foreground text-[10px]">
                      Best Price
                    </Badge>
                  )}
                </div>

                {/* Price */}
                <div>
                  <p
                    className={cn(
                      'text-base font-bold',
                      isBest ? 'text-success' : 'text-foreground',
                    )}
                  >
                    {formatPrice(listing.price)}
                  </p>
                  {listing.originalPrice && listing.originalPrice > listing.price && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(listing.originalPrice)}
                    </p>
                  )}
                  {savings > 0 && (
                    <p className="flex items-center gap-1 text-xs text-success">
                      <TrendingDown className="h-3 w-3" />
                      Save {savingsPercent}%
                    </p>
                  )}
                </div>

                {/* Delivery */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {listing.delivery || 'Standard'}
                </div>

                {/* Rating */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1.5">
                        <StarDisplay rating={listing.rating || 0} />
                        {listing.ratingCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({listing.ratingCount.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{listing.rating || 'N/A'} out of 5</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Stock */}
                <div>
                  {listing.inStock !== false ? (
                    <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                      In Stock
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Out of Stock
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {result.priceHistory && result.priceHistory.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewHistory(listing)}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Price History</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('h-8 w-8', inWishlist && 'text-destructive')}
                          onClick={() => handleAddToWishlist(listing)}
                        >
                          <Heart
                            className={cn(
                              'h-4 w-4',
                              inWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground',
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <a
                      href={listing.storeUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StoreLogo store={listing.store} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{listing.store}</p>
                        {isBest && (
                          <Badge className="bg-success text-success-foreground text-[10px]">
                            Best Price
                          </Badge>
                        )}
                      </div>
                      <StarDisplay rating={listing.rating || 0} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-lg font-bold',
                        isBest ? 'text-success' : 'text-foreground',
                      )}
                    >
                      {formatPrice(listing.price)}
                    </p>
                    {listing.originalPrice && listing.originalPrice > listing.price && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(listing.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {listing.delivery || 'Standard'}
                    </span>
                    {listing.inStock !== false ? (
                      <span className="text-success">In Stock</span>
                    ) : (
                      <span className="text-destructive">Out of Stock</span>
                    )}
                    {savings > 0 && (
                      <span className="flex items-center gap-0.5 text-success">
                        <TrendingDown className="h-3 w-3" />
                        {savingsPercent}% off
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleAddToWishlist(listing)}
                    >
                      <Heart
                        className={cn(
                          'h-4 w-4',
                          inWishlist ? 'fill-destructive' : '',
                        )}
                      />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground"
                      asChild
                    >
                      <a
                        href={listing.storeUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}