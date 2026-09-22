import { NextResponse } from 'next/server';
import { syncCartItemToGoogleSheet, removeCartItemFromGoogleSheet } from '@/lib/google-sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, productId, productName, quantity, unitPrice, currency, customerName, email, location } = body || {};

    if (!userId || !productId || !productName) {
      return NextResponse.json({ error: 'Missing required cart parameters' }, { status: 400 });
    }

    await syncCartItemToGoogleSheet({
      userId,
      productId,
      productName,
      quantity: quantity || 1,
      unitPrice: unitPrice || 0,
      currency: currency || 'INR',
      customerName,
      email,
      location,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API Sync Cart POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Cart sync error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');

    if (!userId || !productId) {
      return NextResponse.json({ error: 'userId and productId required' }, { status: 400 });
    }

    await removeCartItemFromGoogleSheet(userId, productId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API Sync Cart DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Cart remove error' }, { status: 500 });
  }
}
