import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { calculateCouponDiscount, isCouponExpired } from '@/lib/coupons';

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code required.' }, { status: 400 });
    const amount = Number(subtotal);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'Invalid order subtotal.' }, { status: 400 });
    }

    const snap = await adminDb.collection('coupons')
      .where('code', '==', code.toUpperCase())
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 404 });
    }

    const data = snap.docs[0].data();
    if (data.active === false) {
      return NextResponse.json({ error: 'This coupon is inactive.' }, { status: 400 });
    }

    // Check scope
    if (data.applicable_to && data.applicable_to !== 'all') {
      if (data.applicable_to !== 'shop') {
        return NextResponse.json({ error: 'This coupon is not applicable for shop purchases.' }, { status: 400 });
      }
    }

    if (isCouponExpired(data.expiry_date ?? data.expires_at)) {
      return NextResponse.json({ error: 'This code has expired.' }, { status: 400 });
    }
    const usageLimit = Number(data.usage_limit ?? data.max_uses ?? 0);
    const usageCount = Number(data.usage_count ?? data.uses ?? 0);
    if (usageLimit > 0 && usageCount >= usageLimit) {
      return NextResponse.json({ error: 'This code has reached its limit.' }, { status: 400 });
    }
    const minAmount = Number(data.min_amount ?? data.min_subtotal ?? 0);
    if (amount < minAmount) {
      return NextResponse.json(
        { error: `Minimum subtotal is ₹${minAmount}.` },
        { status: 400 }
      );
    }

    const discount = calculateCouponDiscount(amount, data);

    return NextResponse.json({ ok: true, code: data.code || code.toUpperCase(), discount, type: data.type ?? data.kind, value: Number(data.value) });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
