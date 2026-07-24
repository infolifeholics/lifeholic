import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const colRef = collection(db, 'newsletter');
    const q = query(colRef, where('email', '==', email));
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(colRef, { email, created_at: new Date().toISOString() });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
