'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/helpers';
import type { PriceHistoryPoint } from '@/types';

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  productName: string;
  store: string;
}

export default function PriceHistoryChart({
  data,
  productName,
  store,
}: PriceHistoryChartProps) {
  const { min, max, currentPrice } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, currentPrice: 0 };
    const prices = data.map((d) => d.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currentPrice: prices[prices.length - 1],
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No price history data available
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
    shortDate: new Date(d.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <div className="w-full space-y-4">
      {/* Summary Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-success/30 text-success text-xs">
          Lowest: {formatPrice(min)}
        </Badge>
        <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">
          Highest: {formatPrice(max)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Current: {formatPrice(currentPrice)}
        </Badge>
      </div>

      {/* Chart */}
      <div className="h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.55 0.17 145)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.55 0.17 145)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 155)" />
            <XAxis
              dataKey="shortDate"
              tick={{ fontSize: 11, fill: 'oklch(0.50 0.02 155)' }}
              axisLine={{ stroke: 'oklch(0.85 0.01 155)' }}
              tickLine={false}
            />
            <YAxis
              domain={[min * 0.95, max * 1.05]}
              tick={{ fontSize: 11, fill: 'oklch(0.50 0.02 155)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'oklch(0.98 0 0)',
                border: '1px solid oklch(0.91 0.01 155)',
                borderRadius: '0.5rem',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatPrice(value), 'Price']}
              labelFormatter={(label: string) => `Date: ${label}`}
            />
            <ReferenceLine
              y={currentPrice}
              stroke="oklch(0.55 0.17 145)"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="oklch(0.45 0.18 155)"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: 'oklch(0.45 0.18 155)',
                stroke: 'white',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-primary" />
          <span>Price Trend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 border-t-2 border-dashed border-primary" />
          <span>Current Price</span>
        </div>
      </div>
    </div>
  );
}