'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft, ExternalLink, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import StoreLogo from './StoreLogo';
import { formatPrice, formatDate } from '@/lib/helpers';

export default function WishlistView() {
  const { wishlist, setWishlist, removeFromWishlist, setView, setSearchQuery, setIsSearching, setSearchResults } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wishlist')
      .then((res) => res.json())
      .then((data) => {
        const items = data?.wishlist || data || [];
        if (Array.isArray(items)) {
          setWishlist(items);
        }
      })
      .catch(() => {
        // Wishlist API not available — use local state
      })
      .finally(() => setLoading(false));
  }, [setWishlist]);

  const handleCompare = (productName: string) => {
    setSearchQuery(productName);
    setIsSearching(true);
    setView('results');

    fetch(`/api/search?q=${encodeURIComponent(productName)}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Search failed');
          });
        }
        return res.json();
      })
      .then((data) => {
        setSearchResults(data);
        setIsSearching(false);
      })
      .catch((err) => {
        console.error('Wishlist compare error:', err);
        setIsSearching(false);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setView('home')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" />
          <h1 className="text-xl font-bold sm:text-2xl">Wishlist</h1>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              ({wishlist.length} items)
            </span>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-border/50 bg-muted/30"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && wishlist.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No items in wishlist</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Start comparing prices and add your favorite deals to the wishlist
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setView('home')}
          >
            <Package className="mr-2 h-4 w-4" />
            Start Shopping
          </Button>
        </motion.div>
      )}

      {/* Wishlist Grid */}
      {!loading && wishlist.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {wishlist.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="group rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-border hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StoreLogo store={item.store} size="sm" />
                    <div>
                      <p className="text-sm font-medium leading-tight line-clamp-2">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.store}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={async () => {
                      try {
                        await fetch(`/api/wishlist?id=${item.id}`, { method: 'DELETE' });
                      } catch (e) {
                        console.error('Failed to delete from DB:', e);
                      }
                      removeFromWishlist(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-primary">{formatPrice(item.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDate(item.createdAt)}
                    </p>
                  </div>
                  {item.storeUrl ? (
                    <Button
                      size="sm"
                      className="h-8 gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                      asChild
                    >
                      <a href={item.storeUrl} target="_blank" rel="noopener noreferrer">
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleCompare(item.productName)}
                    >
                      Compare
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}