import { NextRequest, NextResponse } from 'next/server';
import { callLLM, parseJSONResponse, webSearch } from '@/lib/zai';

export const runtime = 'nodejs';

const RECOMMEND_SYSTEM_PROMPT = `You are a product recommendation engine for Price Compare AI, an Indian price comparison platform. You recommend similar or alternative products based on user queries.

RULES:
- Return ONLY valid JSON. No explanation, no markdown.
- Focus on products available on Indian e-commerce stores
- Provide realistic Indian market prices in INR
- Include a mix of direct alternatives and value-for-money options`;

interface RecommendedProduct {
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  store: string;
  rating: number;
  keySpecs: string[];
  whyRecommended: string;
  imageUrl: string;
}

function buildRecommendPrompt(
  query: string,
  category?: string,
  budget?: number
): string {
  const budgetInfo = budget
    ? `Budget: ₹${budget.toLocaleString('en-IN')} max`
    : 'No specific budget constraint';

  const categoryInfo = category
    ? `Category: ${category}`
    : 'Infer the category from the query';

  return `Recommend 5 alternative/similar products for:
Query: "${query}"
${categoryInfo}
${budgetInfo}

Return a JSON object:
{
  "query": "${query}",
  "recommendations": [
    {
      "name": "Full product name",
      "brand": "Brand name",
      "price": 12345,
      "originalPrice": 14999,
      "store": "Best price store",
      "rating": 4.3,
      "keySpecs": ["spec1", "spec2", "spec3"],
      "whyRecommended": "1-2 sentence reason why this is a good alternative",
      "imageUrl": "https://picsum.photos/seed/alt-product/400/400"
    }
  ]
}

Requirements:
1. Exactly 5 recommendations
2. Mix of premium alternatives and budget-friendly options
3. All prices must be realistic for Indian market in INR
4. Sort by relevance (most similar first)
5. If budget is specified, keep most recommendations within budget (allow 1 slightly over)
6. Include diverse brands and price points
7. Each product should have a clear reason for recommendation`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category, budget } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    // Web search for additional context
    const searchResults = await webSearch(
      `${trimmedQuery} alternatives India 2025 best buy`,
      8
    );

    const webContext = searchResults
      .slice(0, 5)
      .map(
        (r, i) => `[${i + 1}] ${r.name} - ${r.snippet}`
      )
      .join('\n');

    const prompt =
      buildRecommendPrompt(
        trimmedQuery,
        category,
        budget
      ) + `\n\nAdditional web context:\n${webContext}`;

    const rawResult = await callLLM(
      [
        { role: 'system', content: RECOMMEND_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      2
    );

    const result = parseJSONResponse<{
      query: string;
      recommendations: RecommendedProduct[];
    }>(rawResult);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Recommend API error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations. Please try again.' },
      { status: 500 }
    );
  }
}