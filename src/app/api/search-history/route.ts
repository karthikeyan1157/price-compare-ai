import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// GET — Fetch recent search history (default: last 20)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const items = await db.searchHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      searches: items.map((item) => ({
        id: item.id,
        query: item.query,
        resultCount: item.resultCount,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Search history GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search history.' },
      { status: 500 }
    );
  }
}

// DELETE — Clear all search history (or a specific item via ?id=xxx)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await db.searchHistory.delete({ where: { id: id.trim() } });
      return NextResponse.json({ success: true, id: id.trim() });
    }

    // Clear all
    await db.searchHistory.deleteMany({});
    return NextResponse.json({ success: true, cleared: true });
  } catch (error) {
    console.error('Search history DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to clear search history.' },
      { status: 500 }
    );
  }
}
