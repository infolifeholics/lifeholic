import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code required.' }, { status: 400 });

    const colRef = collection(db, 'coupons');
    const q = query(colRef, where('code', '==', code.toUpperCase()), where('active', '==', true));
    const snap = await getDocs(q);

    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 404 });
    }

    const data = snap.docs[0].data();

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This code has expired.' }, { status: 400 });
    }
    if (data.max_uses !== null && data.uses >= data.max_uses) {
      return NextResponse.json({ error: 'This code has reached its limit.' }, { status: 400 });
    }
    if (Number(subtotal) < Number(data.min_subtotal)) {
      return NextResponse.json(
        { error: `Minimum subtotal is ₹${data.min_subtotal}.` },
        { status: 400 }
      );
    }

    const sub = Number(subtotal) || 0;
    const discount =
      data.kind === 'percent' ? Math.round((sub * Number(data.value)) / 100) : Math.min(Number(data.value), sub);

    return NextResponse.json({ ok: true, code: data.code, discount, kind: data.kind, value: Number(data.value) });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
