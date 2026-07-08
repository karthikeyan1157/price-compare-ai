'use client';

import { Search, Tag, Heart, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const {
    searchQuery,
    setSearchQuery,
    wishlist,
    setView,
    currentView,
    isSearching,
    setIsSearching,
    setSearchResults,
  } = useAppStore();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mobileSearchOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleLogoClick = () => {
    setView('home');
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Tag className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden text-lg font-bold sm:block">
            Price<span className="text-primary">Compare</span>
            <span className="ml-0.5 text-primary">.AI</span>
          </span>
        </button>

        {/* Desktop Search */}
        <div className="hidden max-w-xl flex-1 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search any product..."
              className="h-10 rounded-full border-border/50 bg-muted/50 pl-10 pr-24 text-sm focus-visible:border-primary/40 focus-visible:ring-primary/20"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={isSearching}
                className="h-7 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {isSearching ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                  />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full"
            onClick={() => {
              setView(currentView === 'wishlist' ? 'home' : 'wishlist');
            }}
            aria-label="Wishlist"
          >
            <Heart className="h-4.5 w-4.5" />
            {wishlist.length > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {wishlist.length}
              </Badge>
            )}
          </Button>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full md:hidden"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-full border-b border-border/40 bg-background/95 backdrop-blur-xl p-3 md:hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                    setMobileSearchOpen(false);
                  }
                }}
                placeholder="Search any product..."
                className="h-10 rounded-full border-border/50 bg-muted/50 pl-10 pr-12 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
