'use client';

import { useState } from 'react';
import { Copy, Check, Tag, CreditCard, ArrowRightLeft, Banknote, Percent, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { Coupon } from '@/types';

interface CouponFinderProps {
  coupons: Coupon[];
  productName: string;
}

const categoryConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  all: { label: 'All', icon: Tag, color: '' },
  coupon: { label: 'Coupons', icon: Percent, color: 'text-primary' },
  bank_offer: { label: 'Bank Offers', icon: Banknote, color: 'text-amber-500' },
  exchange: { label: 'Exchange', icon: ArrowRightLeft, color: 'text-violet-500' },
  emi: { label: 'EMI', icon: CreditCard, color: 'text-sky-500' },
  cashback: { label: 'Cashback', icon: Gift, color: 'text-success' },
};

export default function CouponFinder({ coupons, productName }: CouponFinderProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success(`Coupon "${code}" copied to clipboard!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy coupon code');
    }
  };

  const categories = ['all', 'coupon', 'bank_offer', 'exchange', 'emi', 'cashback'] as const;
  const filteredCoupons = (cat: string) =>
    cat === 'all' ? coupons : coupons.filter((c) => c.category === cat);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Coupons & Offers for &ldquo;{productName}&rdquo;
        </h3>
        <Badge variant="secondary" className="text-xs">
          {coupons.length} offers
        </Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="mb-4 w-full min-w-0 justify-start gap-1">
            {categories.map((cat) => {
              const config = categoryConfig[cat];
              const Icon = config.icon;
              const count =
                cat === 'all' ? coupons.length : filteredCoupons(cat).length;
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{config.label}</span>
                  {count > 0 && (
                    <span className="ml-0.5 rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-primary-foreground/20">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-0">
            <div className="space-y-3">
              {filteredCoupons(cat).map((coupon, idx) => (
                <CouponCard
                  key={coupon.code + idx}
                  coupon={coupon}
                  isCopied={copiedId === coupon.code + idx}
                  onCopy={() => handleCopy(coupon.code, coupon.code + idx)}
                />
              ))}
              {filteredCoupons(cat).length === 0 && (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No offers in this category
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CouponCard({
  coupon,
  isCopied,
  onCopy,
}: {
  coupon: Coupon;
  isCopied: boolean;
  onCopy: () => void;
}) {
  const config = categoryConfig[coupon.category] || categoryConfig.coupon;
  const Icon = config.icon;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-border hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', config.color)} />
            <Badge variant="secondary" className="text-xs">
              {coupon.discount}
            </Badge>
            <span className="text-xs text-muted-foreground">{coupon.store}</span>
          </div>
          <p className="text-sm font-medium">{coupon.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Valid till {formatDate(coupon.validTill)}</span>
          </div>
          {coupon.terms && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Terms & Conditions
              </summary>
              <p className="mt-1 text-muted-foreground/80">{coupon.terms}</p>
            </details>
          )}
        </div>

        {/* Copyable Code */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-1.5">
            <code className="text-sm font-bold tracking-wider text-primary">{coupon.code}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCopy}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-primary" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}