'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Clock, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatPrice } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { PricePrediction } from '@/types';

interface PricePredictionProps {
  prediction: PricePrediction;
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
  }, [value]);
  return (
    <span>
      {prefix}{formatPrice(display)}{suffix}
    </span>
  );
}

export default function PricePredictionCard({ prediction }: PricePredictionProps) {
  const isDown = prediction.direction === 'down';
  const isUp = prediction.direction === 'up';
  const isStable = prediction.direction === 'stable';

  const DirectionIcon = isDown ? TrendingDown : isUp ? TrendingUp : Minus;
  const directionColor = isDown ? 'text-success' : isUp ? 'text-destructive' : 'text-warning';
  const directionBg = isDown
    ? 'bg-success/10 border-success/20'
    : isUp
      ? 'bg-destructive/10 border-destructive/20'
      : 'bg-warning/10 border-warning/20';
  const directionLabel = isDown ? 'Price Drop Expected' : isUp ? 'Price Increase' : 'Price Stable';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl border border-border/50 bg-card p-4 sm:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">Price Prediction</h3>
        <Badge variant="outline" className={cn('text-[10px] border-0', directionBg, directionColor)}>
          <DirectionIcon className="mr-1 h-3 w-3" />
          {directionLabel}
        </Badge>
      </div>

      {/* Price Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Current Price</p>
          <p className="text-xl font-bold">{formatPrice(prediction.currentPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Predicted Price</p>
          <p className={cn('text-xl font-bold', directionColor)}>
            <AnimatedNumber value={prediction.predictedPrice} />
          </p>
        </div>
      </div>

      {/* Drop Amount */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <DirectionIcon className={cn('h-5 w-5', directionColor)} />
          <div>
            <p className="text-sm font-semibold">
              {isDown ? 'Save' : isUp ? 'Extra Cost' : 'No Change'}
            </p>
            <p className="text-xs text-muted-foreground">{prediction.timeframe}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-lg font-bold', directionColor)}>
            {isDown ? '' : '+'}
            {formatPrice(prediction.predictedDrop)}
          </p>
          <p className={cn('text-xs font-medium', directionColor)}>
            {isDown ? '' : '+'}{prediction.predictedDropPercent}%
          </p>
        </div>
      </div>

      {/* Confidence */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            AI Confidence
          </span>
          <span className="font-semibold">{prediction.confidence}%</span>
        </div>
        <Progress value={prediction.confidence} className="h-2" />
      </div>

      {/* Reasoning */}
      {prediction.reasoning && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {prediction.reasoning}
        </p>
      )}
    </motion.div>
  );
}