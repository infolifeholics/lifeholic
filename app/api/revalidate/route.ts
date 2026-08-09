import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    revalidateTag('firestore-collections', { expire: 0 });
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
