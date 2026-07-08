'use client';

import { Tag, Github, Twitter, Linkedin, Mail, ArrowUpRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getStoreLogo } from '@/lib/store-logos';

const storeList = [
  'Amazon',
  'Flipkart',
  'Croma',
  'Reliance Digital',
  'Tata CLiQ',
  'Vijay Sales',
  'Apple',
  'Myntra',
];

const footerLinks = {
  Product: [
    { label: 'Price Comparison', href: '#' },
    { label: 'Price Prediction', href: '#' },
    { label: 'Coupon Finder', href: '#' },
    { label: 'Review Summary', href: '#' },
  ],
  Company: [
    { label: 'About Us', href: '#' },
    { label: 'How It Works', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Disclaimer', href: '#' },
    { label: 'Contact Us', href: '#' },
  ],
};

const socialLinks = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Mail, label: 'Email', href: '#' },
];

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/50 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Store Logos Row */}
        <div className="mb-10">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Compare prices across 20+ stores
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {storeList.map((store) => (
              <div
                key={store}
                className="group flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-card px-3.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                title={store}
              >
                <img
                  src={getStoreLogo(store)}
                  alt={store}
                  className="h-5 w-5 rounded-sm object-contain"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {store}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-10 bg-border/60" />

        {/* Footer Columns */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Tag className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold">
                Price Compare <span className="text-primary">AI</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI-powered price intelligence helping shoppers find the best deals across all
              major Indian online stores.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    aria-label={social.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-border/60" />

        {/* Bottom Row */}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2025 Price Compare AI. Powered by AI. Built for Indian shoppers.
          </p>
          <p className="text-xs text-muted-foreground">
            Prices are live & may change. Always verify on the store page.
          </p>
        </div>
      </div>
    </footer>
  );
}
