'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const storeColorMap: Record<string, { bg: string; text: string; fallback: string }> = {
  amazon: { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', fallback: 'A' },
  flipkart: { bg: 'bg-yellow-100 dark:bg-yellow-950/40', text: 'text-yellow-600 dark:text-yellow-400', fallback: 'F' },
  'flipkart big billion days': { bg: 'bg-yellow-100 dark:bg-yellow-950/40', text: 'text-yellow-600 dark:text-yellow-400', fallback: 'F' },
  apple: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', fallback: '' },
  myntra: { bg: 'bg-pink-100 dark:bg-pink-950/40', text: 'text-pink-600 dark:text-pink-400', fallback: 'M' },
  snapdeal: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', fallback: 'S' },
  'croma retail': { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', fallback: 'C' },
  'tata cliq luxury': { bg: 'bg-violet-100 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400', fallback: 'T' },
  'reliance digital': { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', fallback: 'R' },
  ' Vijay Sales': { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', fallback: 'V' },
  'paytm mall': { bg: 'bg-sky-100 dark:bg-sky-950/40', text: 'text-sky-600 dark:text-sky-400', fallback: 'P' },
  'shopclues': { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', fallback: 'S' },
  ebay: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', fallback: 'E' },
};

function getStoreConfig(store: string) {
  const key = store.toLowerCase().trim();
  for (const [k, v] of Object.entries(storeColorMap)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // Default: use first letter with green theme
  const firstLetter = store.charAt(0).toUpperCase();
  return {
    bg: 'bg-primary/10',
    text: 'text-primary',
    fallback: firstLetter,
  };
}

interface StoreLogoProps {
  store: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StoreLogo({ store, size = 'md' }: StoreLogoProps) {
  const config = getStoreConfig(store);
  const fallback = config.fallback || store.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <Avatar className={cn(sizeClasses[size], config.bg, 'shrink-0')}>
      <AvatarFallback className={cn('font-bold', config.text, 'bg-transparent')}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}