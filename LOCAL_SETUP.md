# Price Compare AI — Local Setup Guide (Gemini API)

Run this project on your own machine using your **Gemini API key** in ~5 minutes.

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 20+ | `node -v` |
| **npm** (or bun) | any | `npm -v` |
| **Git** | any | `git -v` |

---

## Step 1 — Get the code

```bash
git clone <your-repo-url> price-compare-ai
cd price-compare-ai
```

## Step 2 — Install dependencies

```bash
npm install
```

## Step 3 — Configure your Gemini API key  (IMPORTANT)

This app supports **both** Z.ai and Gemini. It auto-detects which one you're using based on the `baseUrl` in `.z-ai-config`.

### Create the config file

```bash
cp .z-ai-config.example .z-ai-config
```

### Edit `.z-ai-config` — paste your Gemini key

```json
{
  "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
  "apiKey": "Your_API_Key",
  "model": "gemini-2.5-flash"
}
```

> Replace the apiKey with your own Gemini key if different.
> The `baseUrl` just needs to contain `googleapis.com` — the app detects Gemini from this.
> `.z-ai-config` is gitignored — your key stays private.

### How it works under the hood

When the app detects `googleapis.com` in your config, it automatically switches to **Gemini mode**:

| Feature | How it works with Gemini |
|---------|--------------------------|
| **LLM** (chat, price extraction, summaries) | Gemini native `generateContent` API |
| **Web search** (finding store pages) | Google Search grounding via Gemini API (same key!) |
| **Page reading** (scraping prices) | Direct HTTP fetch + HTML parsing |

No separate web-search API key needed — Google Search grounding is built into the Gemini API.

## Step 4 — Set up the database

```bash
npx prisma db push
```

This creates `db/custom.db` (SQLite — no external database needed).

## Step 5 — Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

You should see `[AI] Provider: Gemini (native API + Google Search grounding)` in the terminal.

Try searching `iPhone 16 128GB` — the first search takes ~60-90s (live web search + page scraping), then results are cached for 3 minutes.

---

## Quick copy-paste (all steps)

```bash
git clone <your-repo-url> price-compare-ai
cd price-compare-ai
npm install
cp .z-ai-config.example .z-ai-config

# Edit .z-ai-config and paste your Gemini API key
# (see Step 3 above)

npx prisma db push
npm run dev
```

Then open http://localhost:3000

---

## Verify it works

| Feature | How to test |
|---------|-------------|
| Provider detection | Terminal shows `[AI] Provider: Gemini` on first API call |
| Search | Type `iPhone 16 128GB` → Enter → wait ~60s → see live prices |
| Price History | Click the "Price History" tab on a result |
| Coupons | Click the "Coupons" tab |
| AI Chat | Click the green floating button (bottom-right) → ask a question |
| Wishlist | Click the ♥ heart icon on any store listing |
| Dark mode | Click the moon/sun icon in the header |

---

## Troubleshooting

### "User location is not supported for the API use"
→ Gemini API is blocked in some regions. From India it works fine. If you're in a restricted region, use a Z.ai key instead (see below).

### "429 Quota exceeded" / "limit: 0"
→ Your Gemini free tier is exhausted. Either:
- Enable billing on your Google Cloud project (pay-as-you-go)
- Wait for the quota to reset (daily reset for free tier)
- Try a different model: change `"model": "gemini-2.5-flash"` to `"gemini-1.5-flash"` or `"gemini-2.0-flash"` in `.z-ai-config`

### "403 Forbidden" / "API key not valid"
→ Your API key is wrong or expired. Get a new one at https://aistudio.google.com/apikey

### "Configuration file not found"
→ `.z-ai-config` is missing from the project root. Redo Step 3.

### Search returns no results
→ The web search grounding might not find enough store pages. Try a more specific product name (e.g. "iPhone 16 128GB" not just "iPhone").

### Port 3000 already in use
```bash
# Find and kill the process
lsof -i :3000        # Mac/Linux
netstat -ano | findstr :3000   # Windows
# Then: kill <PID>
# Or use a different port:
npx next dev -p 3001
```

### Prisma errors
```bash
rm db/custom.db
npx prisma db push
```

---

## Using Z.ai instead of Gemini (alternative)

If you prefer Z.ai (the original provider), create `.z-ai-config` with:

```json
{
  "baseUrl": "https://api.z.ai/v1",
  "apiKey": "YOUR_ZAI_API_KEY"
}
```

Get a Z.ai key from https://z.ai. The app auto-detects and switches to Z.ai SDK mode.

---

## Project structure

```
price-compare-ai/
├── .z-ai-config          ← YOUR API key (gitignored) — create from example
├── .z-ai-config.example  ← template (committed)
├── .env                  ← DATABASE_URL
├── prisma/schema.prisma  ← DB models
├── src/
│   ├── app/
│   │   ├── api/          ← 9 API routes (search, chat, coupons, ...)
│   │   ├── page.tsx      ← main page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── price-compare/ ← 15 feature components
│   │   └── ui/            ← shadcn/ui components
│   ├── lib/
│   │   ├── zai.ts        ← AI provider layer (auto-detects Gemini vs Z.ai)
│   │   ├── price-engine.ts
│   │   ├── db.ts
│   │   └── helpers.ts
│   ├── store/            ← Zustand store
│   └── types/            ← TypeScript types
└── package.json
```

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui**
- **Prisma ORM** + SQLite
- **Zustand** + **Framer Motion** + **Recharts**
- **AI**: Gemini API (native + Google Search grounding) or Z.ai SDK
