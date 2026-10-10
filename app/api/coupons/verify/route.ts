import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getExchangeRates } from '@/lib/exchange-rates';
import { convertInrToCurrency } from '@/lib/currency';
import { calculateCouponDiscount, isCouponExpired } from '@/lib/coupons';

export async function POST(req: Request) {
  try {
    const { code, amount, context, currency = 'INR' } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 });
    }
    const amountInCurrency = Number(amount);
    if (!Number.isFinite(amountInCurrency) || amountInCurrency < 0) {
      return NextResponse.json({ error: 'Invalid order amount.' }, { status: 400 });
    }

    const currencyCode = String(currency).toUpperCase();
    let targetRate = 1;
    if (currencyCode !== 'INR') {
      const ratesData = await getExchangeRates();
      targetRate = ratesData.rates?.[currencyCode] || 0;
      if (!targetRate) {
        return NextResponse.json({ error: 'Exchange rate is unavailable for this currency.' }, { status: 400 });
      }
    }
    const amountInr = currencyCode === 'INR' ? amountInCurrency : amountInCurrency / targetRate;

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
      const isLegacyBookingScope = context === 'sessions' && coupon.applicable_to === 'bookings';
      if (coupon.applicable_to !== context && !isLegacyBookingScope) {
        return NextResponse.json({ 
          error: `This coupon is not applicable for ${context || 'this type of'} bookings.` 
        }, { status: 400 });
      }
    }

    // Check expiry
    if (isCouponExpired(coupon.expiry_date)) {
      return NextResponse.json({ error: 'Coupon has expired.' }, { status: 400 });
    }

    // Check usage limits
    const usageLimit = Number(coupon.usage_limit ?? 0);
    if (usageLimit > 0 && Number(coupon.usage_count || 0) >= usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached.' }, { status: 400 });
    }

    // Check minimum purchase amount
    const minAmount = Number(coupon.min_amount || 0);
    if (amountInr < minAmount) {
      return NextResponse.json({
        error: `Minimum amount required to use this coupon is ₹${minAmount}.`,
      }, { status: 400 });
    }

    const discountInr = calculateCouponDiscount(amountInr, coupon);
    const discount = currencyCode === 'INR'
      ? discountInr
      : convertInrToCurrency(discountInr, targetRate, currencyCode);

    const finalAmount = Math.max(0, amountInCurrency - discount);

    return NextResponse.json({
      ok: true,
      discount,
      discount_inr: discountInr,
      finalAmount,
      code: code.toUpperCase(),
      type: 'flat',
      value: coupon.value,
    });
  } catch (error: any) {
    console.error('Verify coupon error:', error);
    return NextResponse.json({ error: 'Internal verification failure.' }, { status: 500 });
  }
}
