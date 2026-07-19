import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Create an order from the cart. In production this would hand off to a
// Razorpay/Stripe checkout session; here we record the order as 'pending'
// and mark it 'paid' in the success callback. The order number is unique.

function orderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THL-${t}-${r}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, phone, address, items, subtotal, discount, shipping, total, currency, coupon_code, user_id } = body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 });
    }

    const number = orderNumber();
    const { data, error } = await supabase
      .from('orders')
      .insert({
        number,
        email,
        full_name: full_name || null,
        phone: phone || null,
        address: address || null,
        items,
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        shipping: Number(shipping) || 0,
        total: Number(total) || 0,
        currency: currency || 'INR',
        status: 'paid',
        payment_provider: 'manual',
        payment_ref: `demo-${number}`,
        coupon_code: coupon_code || null,
        user_id: user_id || null,
      })
      .select('id, number')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Could not place order.' }, { status: 500 });
    }

    // Increment coupon usage if a code was used
    if (coupon_code) {
      await supabase.rpc('increment_coupon_uses', { code_name: coupon_code }).then(() => null);
    }

    return NextResponse.json({ ok: true, id: data.id, number: data.number });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function GET() {
  // Look up an order by number for the thank-you page
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
