import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const colRef = adminDb.collection('newsletter');
    const snap = await colRef.where('email', '==', email.trim().toLowerCase()).get();

    if (snap.empty) {
      await colRef.add({
        email: email.trim().toLowerCase(),
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
