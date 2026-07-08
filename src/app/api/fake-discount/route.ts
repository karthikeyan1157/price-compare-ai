import { NextRequest, NextResponse } from 'next/server';
import { callLLM, parseJSONResponse } from '@/lib/zai';
import type { FakeDiscountAlert } from '@/types';

export const runtime = 'nodejs';

const FAKE_DISCOUNT_SYSTEM_PROMPT = `You are a fake discount detection expert for Price Compare AI, an Indian price comparison platform. You analyze whether displayed discounts on e-commerce sites are genuine or artificially inflated.

RULES:
- Return ONLY valid JSON. No explanation, no markdown.
- Base analysis on common e-commerce pricing patterns in India
- Be objective and data-driven in your assessment
- Consider typical price manipulation tactics used by Indian e-commerce stores`;

function buildFakeDiscountPrompt(
  productName: string,
  currentPrice: number,
  originalPrice: number
): string {
  const discountPercent =
    originalPrice > 0
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

  return `Analyze whether the discount on this product is genuine:

Product: "${productName}"
Current Price: ₹${currentPrice.toLocaleString('en-IN')}
Displayed Original Price (MRP): ₹${originalPrice.toLocaleString('en-IN')}
Displayed Discount: ${discountPercent}%

Return a FakeDiscountAlert JSON object:
{
  "isGenuine": true,
  "confidence": 85,
  "analysis": "2-3 sentence detailed analysis explaining whether the discount is genuine or inflated. Consider: Has this product ever actually been sold at the 'original' price? Is the discount percentage realistic for this product category? What pricing tactics might be at play?",
  "highestEverPrice": 15999,
  "lowestEverPrice": 11999,
  "typicalPriceRange": [12500, 14500],
  "currentPriceHistory": "Brief note: Has the 'original price' been artificially raised before the sale? Is the current price actually a good deal?"
}

Analysis guidelines:
1. Typical genuine discounts: 5-15% on electronics, 10-30% on fashion, 5-20% on appliances
2. Red flags: discounts >40% on electronics (rarely genuine), MRP significantly above launch price
3. Consider: festive sale vs regular pricing, product age, category norms
4. Confidence: 60-95% range (never 100% certain)
5. typicalPriceRange: [low, high] — what this product actually sells for across stores
6. highestEverPrice: the actual highest price this product has been sold at
7. lowestEverPrice: the best deal this product has ever been available at`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, currentPrice, originalPrice } = body;

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

    if (
      typeof currentPrice !== 'number' ||
      currentPrice <= 0
    ) {
      return NextResponse.json(
        { error: 'Valid current price is required' },
        { status: 400 }
      );
    }

    if (
      typeof originalPrice !== 'number' ||
      originalPrice <= 0
    ) {
      return NextResponse.json(
        { error: 'Valid original price is required' },
        { status: 400 }
      );
    }

    const prompt = buildFakeDiscountPrompt(
      productName.trim(),
      currentPrice,
      originalPrice
    );

    const rawResult = await callLLM(
      [
        { role: 'system', content: FAKE_DISCOUNT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      2
    );

    const fakeDiscountAlert = parseJSONResponse<FakeDiscountAlert>(rawResult);

    return NextResponse.json({ fakeDiscountAlert });
  } catch (error) {
    console.error('Fake Discount API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze discount. Please try again.' },
      { status: 500 }
    );
  }
}