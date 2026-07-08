import { NextRequest, NextResponse } from 'next/server';
import { callLLM, parseJSONResponse } from '@/lib/zai';
import type { PriceHistoryPoint } from '@/types';

export const runtime = 'nodejs';

const PRICE_HISTORY_SYSTEM_PROMPT = `You are a price history data generator for Price Compare AI. You generate realistic historical price data for products sold on Indian e-commerce stores.

RULES:
- Return ONLY valid JSON array. No explanation, no markdown.
- Generate exactly 180 data points (daily data for 6 months going back from today).
- Prices should fluctuate realistically with ±3-8% variation.
- Show realistic price trends: gradual drops before sales, spikes after product launches, etc.
- All prices must be in INR (numeric values only, no currency symbols).`;

function buildPriceHistoryPrompt(
  productName: string,
  store: string
): string {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 6);
  const startDateStr = startDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  return `Generate 180 daily price history data points for:
Product: "${productName}"
Store: "${store}"
Date range: ${startDateStr} to ${todayStr}

The current approximate price should be around a realistic market price for this product in India (INR).

Return a JSON array of objects:
[
  {"date": "YYYY-MM-DD", "price": 12345, "store": "${store}"},
  ...
]

Requirements:
1. Exactly 180 entries, one per day from ${startDateStr} to ${todayStr}
2. Dates must be consecutive (no gaps)
3. Start with a slightly higher price 6 months ago and show realistic gradual changes
4. Include 2-3 "sale event" dips of 5-12% (e.g., around festive seasons)
5. End with a price close to the realistic current price
6. Price variations should be smooth, not jumping randomly
7. All prices must be realistic for the Indian market in INR`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, store } = body;

    if (
      !productName ||
      typeof productName !== 'string' ||
      productName.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!store || typeof store !== 'string' || store.trim().length === 0) {
      return NextResponse.json(
        { error: 'Store name is required' },
        { status: 400 }
      );
    }

    const trimmedProduct = productName.trim();
    const trimmedStore = store.trim();

    const prompt = buildPriceHistoryPrompt(trimmedProduct, trimmedStore);

    const rawResult = await callLLM(
      [
        { role: 'system', content: PRICE_HISTORY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      2
    );

    const priceHistory = parseJSONResponse<PriceHistoryPoint[]>(rawResult);

    // Validate basic structure
    if (!Array.isArray(priceHistory)) {
      throw new Error('Response is not an array');
    }

    return NextResponse.json({ priceHistory });
  } catch (error) {
    console.error('Price History API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate price history. Please try again.' },
      { status: 500 }
    );
  }
}