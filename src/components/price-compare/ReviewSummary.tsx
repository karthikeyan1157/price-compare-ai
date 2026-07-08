'use client';

import { motion } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, Minus, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ReviewSummary as ReviewSummaryType } from '@/types';

interface ReviewSummaryProps {
  summary: ReviewSummaryType;
}

function StarBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 text-right font-medium">{rating}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-muted-foreground">{count}</span>
    </div>
  );
}

export default function ReviewSummary({ summary }: ReviewSummaryProps) {
  const sentimentConfig = {
    positive: {
      color: 'text-success',
      bg: 'bg-success/10 border-success/20',
      icon: ThumbsUp,
      label: 'Positive',
    },
    mixed: {
      color: 'text-warning',
      bg: 'bg-warning/10 border-warning/20',
      icon: Minus,
      label: 'Mixed',
    },
    negative: {
      color: 'text-destructive',
      bg: 'bg-destructive/10 border-destructive/20',
      icon: ThumbsDown,
      label: 'Negative',
    },
  };

  const sentiment = sentimentConfig[summary.sentiment];
  const SentimentIcon = sentiment.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border/50 bg-card p-4 sm:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">Review Summary</h3>
        </div>
        <Badge variant="outline" className={cn('text-[10px] border-0', sentiment.bg, sentiment.color)}>
          <SentimentIcon className="mr-1 h-3 w-3" />
          {sentiment.label} Sentiment
        </Badge>
      </div>

      {/* Rating Overview */}
      <div className="mb-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold">{summary.overallRating}</p>
          <div className="mt-1 flex items-center justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-3.5 w-3.5',
                  star <= Math.round(summary.overallRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-muted text-muted',
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.totalReviews.toLocaleString('en-IN')} reviews
          </p>
        </div>

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            // Simulate distribution based on overall rating
            const base = summary.overallRating;
            const dist = rating <= Math.round(base) ? 60 - (rating - 1) * 10 : 15;
            const count = Math.round((dist / 100) * summary.totalReviews);
            return <StarBar key={rating} rating={rating} count={count} total={summary.totalReviews} />;
          })}
        </div>
      </div>

      {/* AI Summary */}
      {summary.summary && (
        <div className="mb-4 rounded-lg bg-muted/50 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">AI Summary</p>
          <p className="text-sm leading-relaxed">{summary.summary}</p>
        </div>
      )}

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {summary.pros.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-success">Pros</p>
            <ul className="space-y-1.5">
              {summary.pros.slice(0, 4).map((pro, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Star className="h-2.5 w-2.5 text-success" />
                  </span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary.cons.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-destructive">Cons</p>
            <ul className="space-y-1.5">
              {summary.cons.slice(0, 4).map((con, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <span className="text-[10px] font-bold text-destructive">×</span>
                  </span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Key Highlights</p>
          <div className="flex flex-wrap gap-1.5">
            {summary.highlights.map((highlight, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}