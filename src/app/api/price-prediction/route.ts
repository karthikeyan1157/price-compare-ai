import { NextRequest, NextResponse } from 'next/server';
import { callLLM, parseJSONResponse } from '@/lib/zai';
import type { PricePrediction } from '@/types';

export const runtime = 'nodejs';

const PREDICTION_SYSTEM_PROMPT = `You are a price prediction analyst for Price Compare AI, an Indian price comparison platform. You predict future price movements for products sold on Indian e-commerce stores.

RULES:
- Return ONLY valid JSON. No explanation, no markdown.
- Base predictions on product lifecycle, seasonal patterns, and Indian e-commerce sale cycles
- Be realistic — most consumer electronics see 5-15% drops over 3-6 months
- Consider Indian sale events: Amazon Great Indian Festival (Oct), Flipkart Big Billion Days (Oct), Republic Day (Jan), Diwali sales (Nov)`;

function buildPredictionPrompt(
  productName: string,
  currentPrice: number
): string {
  const today = new Date();
  const month = today.toLocaleString('en-IN', { month: 'long' });

  return `Predict the future price movement for:
Product: "${productName}"
Current Price: ₹${currentPrice.toLocaleString('en-IN')}
Current Date: ${today.toISOString().split('T')[0]} (${month})

Return a PricePrediction JSON object:
{
  "currentPrice": ${currentPrice},
  "predictedPrice": 11999,
  "predictedDrop": 346,
  "predictedDropPercent": 2.8,
  "confidence": 72,
  "timeframe": "2-4 weeks",
  "direction": "down",
  "reasoning": "2-3 sentence explanation of why the price is predicted to move in this direction. Consider: upcoming sales, product age, competitor pricing, seasonal demand, new model launches."
}

Guidelines:
1. predictedPrice: Should be realistic (don't predict more than 20% change)
2. direction: "up" (price increase expected), "down" (price drop expected), or "stable"
3. predictedDrop: Only positive number, represents the absolute change
4. predictedDropPercent: Percentage of the current price
5. confidence: 55-85% (price prediction is inherently uncertain)
6. timeframe: "1-2 weeks", "2-4 weeks", "1-2 months", "2-3 months"
7. Consider: Is this a new product? (prices tend to drop), Is a new model coming? (prices drop), Festive season approaching? (good deals)
8. If the product is likely to see price INCREASE, set direction to "up" and predictedDrop to the increase amount
9. If stable, set predictedDrop and predictedDropPercent to 0`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, currentPrice } = body;

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

    if (typeof currentPrice !== 'number' || currentPrice <= 0) {
      return NextResponse.json(
        { error: 'Valid current price is required' },
        { status: 400 }
      );
    }

    const prompt = buildPredictionPrompt(productName.trim(), currentPrice);

    const rawResult = await callLLM(
      [
        { role: 'system', content: PREDICTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      2
    );

    const pricePrediction = parseJSONResponse<PricePrediction>(rawResult);

    return NextResponse.json({ pricePrediction });
  } catch (error) {
    console.error('Price Prediction API error:', error);
    return NextResponse.json(
      { error: 'Failed to predict price. Please try again.' },
      { status: 500 }
    );
  }
}