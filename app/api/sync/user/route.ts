import { NextResponse } from 'next/server';
import { syncUserToGoogleSheet } from '@/lib/google-sheets';

export async function POST(req: Request) {
  try {
    const userData = await req.json();
    if (!userData || !userData.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Perform Google Sheets sync safely
    await syncUserToGoogleSheet(userData);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API Sync User] Error:', err);
    return NextResponse.json({ error: err.message || 'Sync error' }, { status: 500 });
  }
}
