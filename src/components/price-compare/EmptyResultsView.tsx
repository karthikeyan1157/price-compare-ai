'use client';

import { motion } from 'framer-motion';
import { SearchX, Globe, AlertTriangle, ArrowLeft, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';

interface EmptyResultsViewProps {
  query: string;
  recommendation?: string;
  dataSource?: string;
}

const searchTips = [
  'Use the exact product model name (e.g. "iPhone 16 128GB")',
  'Include storage variant (e.g. "Samsung Galaxy S25 Ultra 256GB")',
  'Try adding "price" or "buy" to your search',
  'Search for popular brands: iPhone, Samsung, OnePlus, MacBook',
];

export default function EmptyResultsView({ query, recommendation, dataSource }: EmptyResultsViewProps) {
  const { setView } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => setView('home')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Search
      </Button>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>

        <h2 className="text-lg font-semibold">No prices found for &ldquo;{query}&rdquo;</h2>

        {dataSource === 'google_search' && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Searched Google but no store listings with prices appeared
          </div>
        )}

        {recommendation && (
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            {recommendation}
          </p>
        )}

        <div className="mt-6 w-full max-w-md rounded-xl border border-border/50 bg-muted/30 p-4 text-left">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">Search Tips</p>
          </div>
          <ul className="space-y-1.5">
            {searchTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setView('home')}>
            Try Another Search
          </Button>
          <Button
            onClick={() => {
              const store = useAppStore.getState();
              store.setIsChatOpen(true);
            }}
          >
            Ask AI Assistant
          </Button>
        </div>
      </div>
    </motion.div>
  );
}