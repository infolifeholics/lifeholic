import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { name, email, subject, body } = await req.json();
    if (!name || !email || !body) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    await addDoc(collection(db, 'messages'), {
      name,
      email,
      subject: subject || null,
      body,
      handled: false,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
