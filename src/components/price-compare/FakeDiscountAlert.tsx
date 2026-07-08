'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { FakeDiscountAlert as FakeDiscountAlertType } from '@/types';

interface FakeDiscountAlertProps {
  alert: FakeDiscountAlertType;
}

export default function FakeDiscountAlert({ alert }: FakeDiscountAlertProps) {
  const isGenuine = alert.isGenuine;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn(
        'rounded-xl border p-4 sm:p-6',
        isGenuine
          ? 'border-success/30 bg-success/5'
          : 'border-destructive/30 bg-destructive/5',
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        {isGenuine ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        )}
        <h3 className="text-sm font-semibold">
          {isGenuine ? 'Genuine Discount Verified' : 'Fake Discount Detected!'}
        </h3>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] border-0',
            isGenuine
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {alert.confidence}% confidence
        </Badge>
      </div>

      {/* Analysis */}
      <p className="mb-4 text-sm leading-relaxed text-foreground/80">
        {alert.analysis}
      </p>

      {/* Price Range Info */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-lg bg-background/60 p-3">
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">Lowest Ever</span>
          </div>
          <span className="font-bold text-success">{formatPrice(alert.lowestEverPrice)}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-background/60 p-3">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Highest Ever</span>
          </div>
          <span className="font-bold text-destructive">{formatPrice(alert.highestEverPrice)}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-background/60 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Typical Range</span>
          </div>
          <span className="text-sm font-semibold">
            {formatPrice(alert.typicalPriceRange[0])} — {formatPrice(alert.typicalPriceRange[1])}
          </span>
        </div>
      </div>

      {/* Price History Context */}
      {alert.currentPriceHistory && (
        <div className="mt-4 rounded-lg border border-border/50 bg-card p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Price History Context</p>
          <p className="text-sm leading-relaxed text-foreground/80">{alert.currentPriceHistory}</p>
        </div>
      )}
    </motion.div>
  );
}