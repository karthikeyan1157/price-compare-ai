import { NextRequest, NextResponse } from 'next/server';
import { callLLM, parseJSONResponse, webSearch } from '@/lib/zai';
import type { ReviewSummary } from '@/types';

export const runtime = 'nodejs';

const REVIEW_SYSTEM_PROMPT = `You are an AI review analyzer for Price Compare AI, an Indian price comparison platform. You analyze customer reviews from Indian e-commerce platforms and generate comprehensive summaries.

RULES:
- Return ONLY valid JSON. No explanation, no markdown.
- Base your analysis on real product reputation and common user feedback patterns
- Be honest and balanced — mention both pros and cons
- Use realistic review counts and ratings for the Indian market`;

function buildReviewPrompt(productName: string, webContext: string): string {
  return `Generate a comprehensive review summary for:
Product: "${productName}"

Web search results about this product's reviews:
${webContext}

Return a ReviewSummary JSON object:
{
  "totalReviews": 5000,
  "overallRating": 4.3,
  "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5"],
  "cons": ["Con 1", "Con 2", "Con 3"],
  "summary": "A 3-4 sentence comprehensive summary of what customers think about this product, covering build quality, performance, value for money, and overall satisfaction.",
  "sentiment": "positive",
  "highlights": ["Most praised feature", "Best value aspect", "Common compliment from reviewers"]
}

Requirements:
1. totalReviews: Realistic count (1000-50000 for popular products)
2. overallRating: Between 3.5-4.8 for good products
3. pros: 4-5 specific, realistic pros (not generic)
4. cons: 2-3 realistic cons (even good products have some)
5. summary: Detailed but concise (3-4 sentences)
6. sentiment: "positive" (4.0+), "mixed" (3.0-3.9), or "negative" (below 3.0)
7. highlights: 3 specific things that stand out in reviews
8. Make pros/cons specific to the product category and type`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName } = body;

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

    // Web search for review context
    const searchResults = await webSearch(
      `${trimmedProduct} review India amazon flipkart customer feedback`,
      8
    );

    const webContext = searchResults
      .slice(0, 8)
      .map(
        (r, i) =>
          `[${i + 1}] ${r.name} - ${r.snippet}`
      )
      .join('\n');

    const prompt = buildReviewPrompt(
      trimmedProduct,
      webContext.length > 0
        ? webContext
        : '(No web results available — use general product knowledge and common customer feedback patterns.)'
    );

    const rawResult = await callLLM(
      [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      2
    );

    const reviewSummary = parseJSONResponse<ReviewSummary>(rawResult);

    return NextResponse.json({ reviewSummary });
  } catch (error) {
    console.error('Review Summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate review summary. Please try again.' },
      { status: 500 }
    );
  }
}