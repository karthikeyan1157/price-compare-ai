# Price Compare AI

AI-powered price comparison platform for Indian e-commerce. Compare live prices across Amazon, Flipkart, Croma & 20+ stores with AI deal scoring, price history, coupons, and fake-discount detection.

## Quick Start

```bash
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000

## Configuration

Your Gemini API key is pre-configured in `.z-ai-config`:

```json
{
  "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
  "apiKey": "YOUR_KEY",
  "model": "gemini-2.5-flash"
}
```

The app auto-detects Gemini and uses Google Search grounding for live web search.

## Features

- **Live Price Comparison** — scrapes 20+ Indian stores in real-time
- **AI Recommendation** — deal scoring with savings analysis
- **Price Prediction** — AI forecasts future price movements
- **Price History** — 30-day interactive charts
- **Coupon Finder** — bank offers, cashback, EMI deals
- **Review Summary** — AI-distilled pros/cons from thousands of reviews
- **Fake Discount Detector** — spots inflated MRPs
- **AI Chat Assistant** — ask anything about products & deals
- **Wishlist** — save deals for later
- **Dark Mode** — light/dark theme toggle

## Tech Stack

- Next.js 16, TypeScript 5, Tailwind CSS 4, shadcn/ui
- Prisma ORM + SQLite
- Zustand, Framer Motion, Recharts
- Gemini API (native + Google Search grounding)

## Troubleshooting

See `LOCAL_SETUP.md` for detailed setup and troubleshooting.
# price-compare-ai
