import { NextRequest, NextResponse } from 'next/server';
import { callLLM, parseJSONResponse } from '@/lib/zai';
import type { Coupon } from '@/types';

export const runtime = 'nodejs';

const COUPONS_SYSTEM_PROMPT = `You are a coupon and deals finder for Price Compare AI, an Indian price comparison platform. You find the best applicable coupons, bank offers, exchange deals, and EMI options for products.

RULES:
- Return ONLY valid JSON array. No explanation, no markdown.
- Focus on Indian e-commerce stores (Amazon India, Flipkart, Croma, Reliance Digital, Tata CLiQ, etc.)
- Generate realistic, commonly available offers for the product category
- Use valid date ranges in the future`;

function buildCouponsPrompt(
  productName: string,
  category: string
): string {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setMonth(futureDate.getMonth() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const futureStr = futureDate.toISOString().split('T')[0];

  return `Find applicable coupons and deals for:
Product: "${productName}"
Category: "${category || 'General'}"

Return a JSON array of 4-6 coupon/deal objects:
[
  {
    "code": "CODE123",
    "description": "Brief description of the offer",
    "discount": "10%",
    "discountType": "percentage",
    "store": "Amazon",
    "validTill": "${futureStr}",
    "terms": "Min purchase ₹5000, applicable on select items",
    "category": "coupon"
  }
]

Categories to include: "coupon", "bank_offer", "exchange", "emi", "cashback"
Generate a mix of:
1. Store-specific coupon codes (realistic ones like SAVE10, DEAL500, etc.)
2. Bank offers (HDFC, SBI, ICICI, Axis, Kotak credit/debit cards)
3. Exchange offers for the product category
4. No-cost EMI options
5. Cashback offers (UPI, wallet, credit card)

Make them realistic for Indian e-commerce. Valid dates should be between ${todayStr} and ${futureStr}.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, category } = body;

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

    const trimmedProduct = productName.trim();
    const trimmedCategory = category?.trim() || '';

    const prompt = buildCouponsPrompt(trimmedProduct, trimmedCategory);

    const rawResult = await callLLM(
      [
        { role: 'system', content: COUPONS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      2
    );

    const coupons = parseJSONResponse<Coupon[]>(rawResult);

    if (!Array.isArray(coupons)) {
      throw new Error('Response is not an array');
    }

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Coupons API error:', error);
    return NextResponse.json(
      { error: 'Failed to find coupons. Please try again.' },
      { status: 500 }
    );
  }
}