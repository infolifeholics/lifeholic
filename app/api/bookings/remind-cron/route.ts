import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { queueNotification } from '@/lib/notifications/notification-service';

// Reminder windows in minutes (before session start)
const REMINDER_WINDOWS = [
  { key: 'reminder_sent_24h', minutes: 24 * 60, label: '24h' },
  { key: 'reminder_sent_2h',  minutes: 2 * 60,  label: '2h'  },
  { key: 'reminder_sent_30m', minutes: 30,       label: '30m' },
];

const WINDOW_TOLERANCE_MINUTES = 15; // ± minutes tolerance

export async function GET(req: Request) {
  try {
    // Secure the cron endpoint in production
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // 1. Fetch global settings (meeting link fallback)
    let defaultMeetLink = '';
    const globalSettingsSnap = await getDoc(doc(db, 'settings', 'global'));
    if (globalSettingsSnap.exists()) {
      defaultMeetLink = globalSettingsSnap.data().google_meet_link || '';
    }

    // 2. Fetch all confirmed bookings
    const q = query(collection(db, 'bookings'), where('status', '==', 'confirmed'));
    const snap = await getDocs(q);

    const now = new Date();
    const sentCount: any[] = [];

    for (const bookingDoc of snap.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;

      const startTime = new Date(booking.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Skip past sessions
      if (diffMinutes <= 0) continue;

      const { client_name, client_email, client_phone, service_title, user_id } = booking;
      const meetLink = booking.meeting_link || defaultMeetLink;

      const formatterDate = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', dateStyle: 'medium',
      });
      const formatterTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', timeStyle: 'short',
      });
      const dateStr = formatterDate.format(startTime);
      const timeStr = formatterTime.format(startTime);

      const updates: Record<string, any> = {};

      for (const window of REMINDER_WINDOWS) {
        // Already sent for this window?
        if (booking[window.key]) continue;

        // Is the session within this window (±tolerance)?
        const windowMin = window.minutes - WINDOW_TOLERANCE_MINUTES;
        const windowMax = window.minutes + WINDOW_TOLERANCE_MINUTES;
        if (diffMinutes < windowMin || diffMinutes > windowMax) continue;

        // Fire reminder notification
        try {
          await queueNotification(
            'booking_reminder',
            client_email,
            client_phone || null,
            {
              memberName: client_name,
              sessionDate: dateStr,
              sessionTime: timeStr,
              bookingId,
              bookingStatus: 'confirmed',
              meetLink,
              window: window.label,
            },
            bookingId,
            user_id || undefined
          );

          updates[window.key] = true;
          updates[`${window.key}_at`] = new Date().toISOString();

          sentCount.push({
            bookingId,
            window: window.label,
            client: client_name,
            email: client_email,
            phone: client_phone,
          });

          console.log(`[Remind-Cron] Fired ${window.label} reminder for booking ${bookingId} (${client_name})`);
        } catch (err) {
          console.error(`[Remind-Cron] Failed ${window.label} reminder for ${bookingId}:`, err);
        }
      }

      // Batch update booking document with reminder flags
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'bookings', bookingId), updates).catch((err) =>
          console.error(`[Remind-Cron] Failed to update booking ${bookingId}:`, err)
        );
      }
    }

    console.log(`[Remind-Cron] Done. ${sentCount.length} reminder(s) dispatched.`);
    return NextResponse.json({ ok: true, sentReminders: sentCount });
  } catch (err: any) {
    console.error('[Remind-Cron] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
