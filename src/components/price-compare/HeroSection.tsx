'use client';

import { Search, TrendingUp, Sparkles, Zap, ShieldCheck, Bot, Clock, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface RecentSearch {
  id: string;
  query: string;
  resultCount: number;
  createdAt: string;
}

export default function HeroSection() {
  const {
    searchQuery,
    setSearchQuery,
    trendingSearches,
    isSearching,
    setIsSearching,
    setSearchResults,
    setView,
  } = useAppStore();

  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(timer);
  }, []);

  // Fetch recent searches from database on mount
  useEffect(() => {
    fetch('/api/search-history?limit=8')
      .then((res) => res.json())
      .then((data) => {
        if (data?.searches) setRecentSearches(data.searches);
      })
      .catch(() => {});
  }, []);

  const handleClearHistory = async () => {
    try {
      await fetch('/api/search-history', { method: 'DELETE' });
      setRecentSearches([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setView('results');

    fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Search failed');
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.error) {
          setSearchResults({ error: data.error } as any);
        } else {
          setSearchResults(data);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Search failed. Please try again.';
        setSearchResults({ error: msg } as any);
      })
      .finally(() => {
        setIsSearching(false);
      });
  };

  const handleTrendingClick = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setView('results');

    fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Search failed');
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.error) {
          setSearchResults({ error: data.error } as any);
        } else {
          setSearchResults(data);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Search failed. Please try again.';
        setSearchResults({ error: msg } as any);
      })
      .finally(() => {
        setIsSearching(false);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const trustStats = [
    { icon: Zap, label: 'Real-time', value: 'Live Prices' },
    { icon: ShieldCheck, label: 'Verified', value: '20+ Stores' },
    { icon: Bot, label: 'AI-Powered', value: 'Smart Deals' },
  ];

  return (
    <section className="relative w-full overflow-hidden">
      {/* Mesh gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="orb-float absolute -left-20 top-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl dark:opacity-25"
          style={{ background: 'radial-gradient(circle, oklch(0.72 0.17 155), transparent 70%)' }}
        />
        <div
          className="orb-float-2 absolute -right-32 top-20 h-[460px] w-[460px] rounded-full opacity-35 blur-3xl dark:opacity-20"
          style={{ background: 'radial-gradient(circle, oklch(0.68 0.15 180), transparent 70%)' }}
        />
        <div
          className="orb-float absolute left-1/3 top-40 h-[300px] w-[300px] rounded-full opacity-25 blur-3xl dark:opacity-15"
          style={{ background: 'radial-gradient(circle, oklch(0.72 0.16 135), transparent 70%)' }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="grid-pattern pointer-events-none absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              AI-Powered Price Intelligence
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Stop overpaying.
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-primary dark:via-emerald-400 dark:to-teal-400">
              Find the best price.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Compare live prices across Amazon, Flipkart, Croma & 20+ stores. AI finds the
            real best deal &mdash; with coupons, price history & fake-discount alerts.
          </motion.p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mx-auto mt-9 max-w-2xl"
        >
          <div
            className={cn(
              'relative rounded-2xl border bg-card/80 shadow-lg backdrop-blur-xl transition-all duration-300',
              isFocused
                ? 'border-primary/50 shadow-xl shadow-primary/10 ring-4 ring-primary/5'
                : 'border-border/60 shadow-black/5',
            )}
          >
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder='Try "iPhone 16 128GB" or "MacBook Air M4"...'
              className="h-14 rounded-2xl border-0 bg-transparent pl-12 pr-32 text-base shadow-none focus-visible:ring-0 sm:text-lg"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2.5 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 sm:px-6"
            >
              {isSearching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Compare</span>
                </>
              )}
            </Button>
          </div>

          {/* Trust stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="mt-5 flex items-center justify-center gap-4 sm:gap-8"
          >
            {trustStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="leading-tight">
                  <p className="font-semibold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Trending Searches */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Trending Searches
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {trendingSearches.slice(0, 6).map((trend, i) => (
              <motion.button
                key={trend.query}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.85 + i * 0.05, duration: 0.3 }}
                onClick={() => handleTrendingClick(trend.query)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-sm sm:text-sm"
              >
                <Sparkles className="h-3 w-3 text-primary/60 transition-colors group-hover:text-primary" />
                {trend.query}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Searches from Database */}
        {recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 0.5 }}
            className="mt-8 text-center"
          >
            <div className="mb-3 flex items-center justify-center gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Your Recent Searches
              </p>
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-destructive"
                title="Clear search history"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {recentSearches.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + i * 0.04, duration: 0.25 }}
                  onClick={() => handleTrendingClick(s.query)}
                  className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:text-sm"
                >
                  <span className="font-medium">{s.query}</span>
                  {s.resultCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                      {s.resultCount}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
