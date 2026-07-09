import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/zai';

export async function GET() {
  try {
    const envKey = process.env.GEMINI_API_KEY ? 'env' : null;
    const cfg = loadConfig();
    const fileKey = cfg?.apiKey ? '.z-ai-config' : null;

    return NextResponse.json({
      gemini_key_source: envKey || fileKey || 'none',
      gemini_model: process.env.GEMINI_MODEL || cfg?.model || null,
      baseUrl: process.env.GEMINI_BASEURL || cfg?.baseUrl || null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
