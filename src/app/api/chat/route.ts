import { NextRequest, NextResponse } from 'next/server';
import { callLLM, webSearch, readWebPage, isApiKeyInvalid } from '@/lib/zai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CHAT_SYSTEM_PROMPT = `You are an AI Shopping Assistant for Price Compare AI, a price comparison platform for Indian e-commerce. Your role:

1. Help users find the best deals across Indian stores (Amazon India, Flipkart, Croma, Reliance Digital, Tata CLiQ, etc.)
2. Compare products and suggest alternatives
3. Explain specifications in simple terms
4. Suggest money-saving tips (coupons, bank offers, exchange, EMI, timing of purchase)
5. Advise on genuine vs fake discounts
6. Recommend when to buy (sale events, festive seasons)
7. Be concise but helpful — keep responses under 150 words unless detailed comparison is needed

CRITICAL RULES:
- Always use ₹ (INR) for prices
- When you have REAL web search data, cite the actual prices and stores you found
- When you don't have real data, be honest: "I don't have the exact current price, but based on my knowledge..."
- Be friendly and enthusiastic about saving money
- Mention Indian sale events (Amazon Great Indian Festival, Flipkart Big Billion Days, etc.) when relevant
- If asked about specific prices, recommend the user search on Price Compare AI for live data
- Never make up specific discount codes — say "check the coupons section on Price Compare AI"
- Format responses with bullet points or numbered lists when comparing multiple items`;

/** Detect if the user message is asking about a specific product or price */
function isProductQuery(message: string): boolean {
  const productKeywords = [
    'price', 'cost', 'buy', 'purchase', 'best deal', 'cheapest',
    'compare', 'worth', 'rate', 'how much', '₹', 'rs.', 'discount',
    'offer', 'amazon', 'flipkart', 'croma', 'reliance digital',
    'iphone', 'samsung', 'macbook', 'oneplus', 'xiaomi', 'laptop',
    'phone', 'tablet', 'earbuds', 'headphone', 'watch', 'tv',
    'refrigerator', 'washing machine', 'ac', 'camera',
  ];
  const lower = message.toLowerCase();
  return productKeywords.some(kw => lower.includes(kw));
}

/** Build a search query from the user's message */
function buildSearchQueryFromMessage(message: string): string {
  // Clean up the message to extract the product-focused part
  let query = message
    .replace(/what is|what's|what are|how much|how many|which|best|good|recommend|suggest/gi, '')
    .replace(/under|below|above|between|within|around|about/gi, '')
    .replace(/₹[\d,]+/g, '') // Remove price mentions
    .replace(/\?|!|\.|,/g, '')
    .trim();
  return query || message;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    const trimmedMessage = message.trim();

    // Build message history
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // If the query is product/price related, search the web for real-time data
    if (isProductQuery(trimmedMessage)) {
      const searchQuery = buildSearchQueryFromMessage(trimmedMessage);
      const searchResults = await webSearch(
        `${searchQuery} price India buy 2025`,
        5
      );

      if (searchResults.length > 0) {
        // Try to read the top result page for detailed info
        const topUrl = searchResults[0]?.url;
        let pageContext = '';

        if (topUrl) {
          const pageData = await readWebPage(topUrl);
          if (pageData && pageData.text) {
            pageContext = pageData.text.slice(0, 2000);
          }
        }

        const webContext = searchResults
          .slice(0, 5)
          .map((r, i) => `[${i + 1}] ${r.name} (${r.host_name}) — ${r.snippet}`)
          .join('\n');

        const enhancedMessage = `${trimmedMessage}

---
REAL-TIME WEB DATA (use this to give accurate answers):

${webContext}
${pageContext ? `\nDetailed page content from ${topUrl}:\n${pageContext}` : ''}

IMPORTANT: Use the real prices and information above in your response. If the user asks about a specific product, reference the actual prices and stores found. Be specific about where the deals are.`;

        messages.push({ role: 'user', content: enhancedMessage });
      } else {
        messages.push({ role: 'user', content: trimmedMessage });
      }
    } else {
      messages.push({ role: 'user', content: trimmedMessage });
    }

    const response = await callLLM(messages, 2, { useSearch: false });

    if (isApiKeyInvalid) {
      return NextResponse.json({
        message: "⚠️ API Authentication Error: The configured \`GEMINI_API_KEY\` is invalid or unauthenticated (returned HTTP 401). Please update the API key in your Render Dashboard settings."
      });
    }

    if (!response || response.trim().length === 0) {
      console.warn('[Chat API] LLM returned empty response — check GEMINI_API_KEY');
      return NextResponse.json(
        { error: 'AI provider not configured or returned no response. Configure GEMINI_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again.' },
      { status: 500 }
    );
  }
}