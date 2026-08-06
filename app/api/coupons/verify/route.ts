import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { code, amount, context } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 });
    }

    const docSnap = await getDoc(doc(db, 'coupons', code.toUpperCase()));
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 404 });
    }

    const coupon = docSnap.data();
    if (coupon.active === false) {
      return NextResponse.json({ error: 'Coupon is inactive.' }, { status: 400 });
    }

    // Check application scope context
    if (coupon.applicable_to && coupon.applicable_to !== 'all') {
      if (coupon.applicable_to !== context) {
        return NextResponse.json({ 
          error: `This coupon is not applicable for ${context || 'this type of'} bookings.` 
        }, { status: 400 });
      }
    }

    // Check expiry
    if (coupon.expiry_date) {
      const expiry = new Date(coupon.expiry_date);
      if (new Date() > expiry) {
        return NextResponse.json({ error: 'Coupon has expired.' }, { status: 400 });
      }
    }

    // Check usage limits
    if (coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit) {
      return NextResponse.json({ error: 'Coupon usage limit reached.' }, { status: 400 });
    }

    // Check minimum purchase amount
    if (coupon.min_amount && amount < coupon.min_amount) {
      return NextResponse.json({
        error: `Minimum amount required to use this coupon is ${coupon.min_amount}.`,
      }, { status: 400 });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percent') {
      discount = (amount * coupon.value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      // flat discount
      discount = coupon.value;
    }

    const finalAmount = Math.max(0, amount - discount);

    return NextResponse.json({
      ok: true,
      discount,
      finalAmount,
      code: code.toUpperCase(),
      type: coupon.type,
      value: coupon.value,
    });
  } catch (error: any) {
    console.error('Verify coupon error:', error);
    return NextResponse.json({ error: 'Internal verification failure.' }, { status: 500 });
  }
}
