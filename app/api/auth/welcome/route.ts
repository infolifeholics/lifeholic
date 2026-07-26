import { NextResponse } from 'next/server';
import { queueNotification } from '@/lib/notifications/notification-service';

export async function POST(req: Request) {
  try {
    const { email, phone, fullName, userId } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await queueNotification(
      'welcome',
      email,
      phone || null,
      {
        memberName: fullName || 'Member',
      },
      undefined,
      userId || undefined
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API Auth Welcome] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
