import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// GET — Fetch all wishlist items
export async function GET() {
  try {
    const items = await db.wishlistItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      wishlist: items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productKey: item.productKey,
        store: item.store,
        price: item.price,
        currency: item.currency,
        imageUrl: item.imageUrl,
        storeUrl: item.storeUrl,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist items.' },
      { status: 500 }
    );
  }
}

// POST — Add a new wishlist item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, productKey, store, price, currency, imageUrl, storeUrl } = body;

    // Validate required fields
    if (!productName || typeof productName !== 'string' || productName.trim().length === 0) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (!productKey || typeof productKey !== 'string' || productKey.trim().length === 0) {
      return NextResponse.json({ error: 'Product key is required' }, { status: 400 });
    }
    if (!store || typeof store !== 'string' || store.trim().length === 0) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.wishlistItem.findFirst({
      where: { productKey: productKey.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This product is already in your wishlist' },
        { status: 409 }
      );
    }

    const item = await db.wishlistItem.create({
      data: {
        productName: productName.trim(),
        productKey: productKey.trim(),
        store: store.trim(),
        price,
        currency: typeof currency === 'string' ? currency.trim() : 'INR',
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : undefined,
        storeUrl: typeof storeUrl === 'string' ? storeUrl.trim() : undefined,
      },
    });

    return NextResponse.json({
      id: item.id,
      productName: item.productName,
      productKey: item.productKey,
      store: item.store,
      price: item.price,
      currency: item.currency,
      imageUrl: item.imageUrl,
      storeUrl: item.storeUrl,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Wishlist POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add item to wishlist.' },
      { status: 500 }
    );
  }
}

// DELETE — Remove a wishlist item by ID (via query param)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Item ID is required (query param: ?id=xxx)' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existing = await db.wishlistItem.findUnique({
      where: { id: id.trim() },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Wishlist item not found' },
        { status: 404 }
      );
    }

    await db.wishlistItem.delete({
      where: { id: id.trim() },
    });

    return NextResponse.json({ success: true, id: id.trim() });
  } catch (error) {
    console.error('Wishlist DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from wishlist.' },
      { status: 500 }
    );
  }
}