'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Search,
  BarChart3,
  Ticket,
  MessageSquare,
  ShieldCheck,
  History,
  Store,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: Sparkles,
    title: 'AI Price Comparison',
    description: 'Compare live prices across 20+ stores instantly with AI-powered deal scoring.',
    accent: 'from-emerald-500/15 to-teal-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Natural language search that understands any product and finds it in seconds.',
    accent: 'from-teal-500/15 to-cyan-500/5',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    icon: BarChart3,
    title: 'Price Prediction',
    description: 'AI predicts future price movements so you know the perfect time to buy.',
    accent: 'from-cyan-500/15 to-sky-500/5',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    icon: Ticket,
    title: 'Coupon Finder',
    description: 'Auto-discover applicable coupons, bank offers, and cashback in one click.',
    accent: 'from-violet-500/15 to-purple-500/5',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: MessageSquare,
    title: 'Review Summary',
    description: 'AI reads thousands of reviews and distills them into an honest summary.',
    accent: 'from-amber-500/15 to-orange-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: ShieldCheck,
    title: 'Fake Discount Detector',
    description: 'Spot inflated MRPs and fake sales. Know if a deal is genuinely worth it.',
    accent: 'from-rose-500/15 to-red-500/5',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    icon: History,
    title: 'Price History',
    description: 'Track 30-day price trends across all stores with detailed interactive charts.',
    accent: 'from-indigo-500/15 to-blue-500/5',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    icon: Store,
    title: 'Multi-Store Support',
    description: 'Amazon, Flipkart, Croma, Reliance, Tata CLiQ, Vijay Sales & 15+ more.',
    accent: 'from-fuchsia-500/15 to-pink-500/5',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
];

const steps = [
  {
    number: '01',
    title: 'Search any product',
    description: 'Type a product name — iPhone, MacBook, headphones, anything.',
  },
  {
    number: '02',
    title: 'AI scans 20+ stores',
    description: 'We scrape live prices from Amazon, Flipkart, Croma & more in real-time.',
  },
  {
    number: '03',
    title: 'Get the best deal',
    description: 'Compare, apply coupons, track history & buy at the lowest verified price.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export default function FeaturesSection() {
  return (
    <section className="w-full">
      {/* How It Works */}
      <div className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              How It Works
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Three steps to the best price
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-6 hidden translate-x-1/2 md:block">
                    <ArrowRight className="h-5 w-5 text-border" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Powerful Tools
          </p>
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent dark:from-primary dark:to-emerald-400">
              save money
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Powerful AI tools that help you make smarter shopping decisions and find the best
            deals across all major online stores.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="shine-on-hover group relative h-full overflow-hidden border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  />
                  <div className="relative p-5 sm:p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-background/80 transition-transform duration-300 group-hover:scale-110">
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <h3 className="mb-1.5 text-sm font-semibold">{feature.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
