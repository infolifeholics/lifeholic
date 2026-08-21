import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { queueNotification } from '@/lib/notifications/notification-service';
import { logSystemError } from '@/lib/error-tracker';

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    // Simple phone formatting check (digits, plus, dashes, spaces) - at least 8 chars
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Valid phone number is required.' }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Please enter a message explaining why you would like to join.' }, { status: 400 });
    }

    // 2. Prevent duplicate pending applications
    const normalizedEmail = email.trim().toLowerCase();
    const existingSnap = await adminDb
      .collection('community_applications')
      .where('email', '==', normalizedEmail)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'You already have a pending Community application. Our team will get back to you after reviewing it.' },
        { status: 400 }
      );
    }

    // 3. Create document in firestore
    const nowStr = new Date().toISOString();
    const newDoc = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      message: message.trim(),
      status: 'pending',
      created_at: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    const docRef = await adminDb.collection('community_applications').add(newDoc);

    // 4. Send Notifications
    try {
      // 4a. Admin alert (Email + WhatsApp)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@thelifeholics.com';
      const adminPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';
      const formattedDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) + ' IST';

      await queueNotification(
        'community_admin_alert',
        adminEmail,
        adminPhone,
        {
          memberName: name.trim(),
          clientEmail: email.trim().toLowerCase(),
          clientPhone: phone.trim(),
          actionDetails: message.trim(), // reason/message
          sessionDate: formattedDate,
        }
      );

      // 4b. User confirmation (Email + WhatsApp)
      await queueNotification(
        'community_user_confirmation',
        email.trim().toLowerCase(),
        phone.trim(),
        {
          memberName: name.trim(),
        }
      );
    } catch (notifErr: any) {
      // Notification failure should NOT fail the application itself
      console.error('[API Community] Notification dispatch failed:', notifErr);
      await logSystemError(
        `Failed to queue notifications for community application of ${email}: ${notifErr.message || notifErr}`,
        'Email',
        { error: notifErr }
      );
    }

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error('[API Community] Server error:', error);
    await logSystemError(
      `API community endpoint failed: ${error.message || error}`,
      'API',
      { error }
    );
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
