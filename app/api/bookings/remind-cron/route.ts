import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { queueNotification } from '@/lib/notifications/notification-service';
import { triggerBookingNotification } from '@/lib/notifications';

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

    // 1. Fetch global settings
    let defaultMeetLink = '';
    let reminderHours = 24;
    const globalSettingsSnap = await adminDb.collection('settings').doc('global').get();
    if (globalSettingsSnap.exists) {
      const gData = globalSettingsSnap.data();
      if (gData) {
        defaultMeetLink = gData.google_meet_link || '';
        reminderHours = Number(gData.reminder_hours_before) || 24;
      }
    }

    const activeReminderWindows = [
      { key: `reminder_sent_dyn_${reminderHours}h`, minutes: reminderHours * 60, label: `${reminderHours}h` },
      { key: 'reminder_sent_30m',                   minutes: 30,                 label: '30m' }
    ];

    // 2. Fetch all confirmed/booked/rescheduled bookings
    const snap = await adminDb.collection('bookings')
      .where('status', 'in', ['confirmed', 'booked', 'rescheduled'])
      .get();

    const now = new Date();
    const sentCount: any[] = [];

    for (const bookingDoc of snap.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;

      const startTime = new Date(booking.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      const endTime = new Date(booking.end_time || (startTime.getTime() + 60 * 60_000));
      if (now > endTime) {
        // Session has ended. Auto-complete it.
        try {
          await adminDb.runTransaction(async (transaction) => {
            const bRef = adminDb.collection('bookings').doc(bookingId);
            const bSnap = await transaction.get(bRef);
            if (!bSnap.exists) return;
            const bData = bSnap.data();
            if (!bData) return;
            
            // Guard: if already completed, do not proceed
            if (bData.status === 'completed') return;

            let pkgRef = null;
            let pkgData = null;
            let completedCount = 0;
            let totalSess = 4;

            if (bData.package_id) {
              pkgRef = adminDb.collection('somatic_packages').doc(bData.package_id);
              const pkgSnap = await transaction.get(pkgRef);
              
              if (pkgSnap.exists) {
                pkgData = pkgSnap.data();
                if (pkgData) {
                  totalSess = pkgData.total_sessions || 4;
                  
                  // Fetch all bookings for this package
                  const allBQuery = adminDb.collection('bookings').where('package_id', '==', bData.package_id);
                  const allBSnap = await allBQuery.get();
                  
                  allBSnap.docs.forEach((doc) => {
                    const d = doc.data();
                    const bEndTime = new Date(d.end_time || (new Date(d.start_time).getTime() + 30 * 60_000)).getTime();
                    
                    if (doc.id === bookingId || d.status === 'completed' || (['confirmed', 'booked', 'rescheduled'].includes(d.status) && now.getTime() > bEndTime)) {
                      completedCount++;
                    }
                  });
                }
              }
            }

            // Perform writes at the end
            transaction.update(bRef, {
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            if (pkgRef && pkgData) {
              const updates: Record<string, any> = {
                completed_sessions: completedCount,
                remaining_sessions: Math.max(0, totalSess - completedCount),
                updated_at: new Date().toISOString()
              };
              if (completedCount >= totalSess) {
                updates.status = 'completed';
              }
              transaction.update(pkgRef, updates);
              console.log(`[Remind-Cron] Incremented completed sessions on package ${bData.package_id} to ${completedCount}`);
            }
          });
          console.log(`[Remind-Cron] Auto-completed past booking ${bookingId}`);
        } catch (err) {
          console.error(`[Remind-Cron] Failed auto-completion for ${bookingId}:`, err);
        }
        continue;
      }

      // Skip past sessions
      if (diffMinutes <= 0) continue;

      const { client_name, client_email, client_phone, user_id } = booking;
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

      for (const window of activeReminderWindows) {
        if (booking[window.key]) continue;

        const windowMin = window.minutes - WINDOW_TOLERANCE_MINUTES;
        const windowMax = window.minutes + WINDOW_TOLERANCE_MINUTES;
        if (diffMinutes < windowMin || diffMinutes > windowMax) continue;

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
              bookingStatus: booking.status || 'confirmed',
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

      if (Object.keys(updates).length > 0) {
        await adminDb.collection('bookings').doc(bookingId).update(updates).catch((err) =>
          console.error(`[Remind-Cron] Failed to update booking ${bookingId}:`, err)
        );
      }
    }

    // 2.5 Expiration Sweep for active packages
    const activePackagesSnap = await adminDb.collection('somatic_packages')
      .where('status', '==', 'active')
      .get();
    let expiredPackagesCount = 0;

    for (const pkgDoc of activePackagesSnap.docs) {
      const pkgData = pkgDoc.data();
      const expiryTime = new Date(pkgData.expiry_date).getTime();
      if (Date.now() > expiryTime) {
        await adminDb.collection('somatic_packages').doc(pkgDoc.id).update({
          status: 'expired',
          updated_at: new Date().toISOString()
        });

        if (pkgData.booking_ids) {
          for (const bId of pkgData.booking_ids) {
            const bRef = adminDb.collection('bookings').doc(bId);
            const bSnap = await bRef.get();
            if (bSnap.exists) {
              const bData = bSnap.data();
              if (bData && ['confirmed', 'booked', 'rescheduled'].includes(bData.status) && new Date(bData.start_time).getTime() > expiryTime) {
                await bRef.update({
                  status: 'expired',
                  expired_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                console.log(`[Remind-Cron] Marked booking ${bId} as EXPIRED due to package expiry.`);
              }
            }
          }
        }
        expiredPackagesCount++;
        console.log(`[Remind-Cron] Expired active package ${pkgDoc.id} due to expiry date.`);
      }
    }

    // 3. Expiration Cleanup for Pending Unpaid bookings older than 15 minutes
    const expirationLimit = new Date(now.getTime() - 15 * 60 * 1000);
    const pendingSnap = await adminDb.collection('bookings')
      .where('status', '==', 'pending')
      .where('payment_status', '==', 'unpaid')
      .get();
    let expiredCount = 0;

    for (const pendingDoc of pendingSnap.docs) {
      const pData = pendingDoc.data();
      const pId = pendingDoc.id;
      const createdAtTime = pData.created_at ? new Date(pData.created_at) : new Date(pData.start_time);
      
      if (createdAtTime < expirationLimit) {
        let expiredSuccessfully = false;
        const timeline = pData.status_timeline || [];
        const updatedTimeline = [
          ...timeline,
          {
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            updated_by: 'System',
            note: 'Booking expired because payment was not completed'
          }
        ];
        const updatedBooking = {
          status: 'cancelled',
          status_timeline: updatedTimeline,
          updated_at: new Date().toISOString()
        };

        try {
          await adminDb.runTransaction(async (transaction) => {
            const docRef = adminDb.collection('bookings').doc(pId);
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists) return;
            const currentData = docSnap.data();
            if (currentData && currentData.status === 'pending' && currentData.payment_status === 'unpaid') {
              transaction.update(docRef, updatedBooking);
              expiredSuccessfully = true;
            }
          });
        } catch (err) {
          console.error(`[Remind-Cron] Transaction failed for expiring booking ${pId}:`, err);
        }

        if (expiredSuccessfully) {
          try {
            await triggerBookingNotification(pId, { ...pData, ...updatedBooking }, 'cancelled');
          } catch (err) {
            console.error(`[Remind-Cron] Failed to trigger notification for expired booking ${pId}:`, err);
          }

          expiredCount++;
          console.log(`[Remind-Cron] Expired unpaid booking ${pId} (created at ${createdAtTime.toISOString()})`);
        }
      }
    }

    console.log(`[Remind-Cron] Done. ${sentCount.length} reminder(s) dispatched. ${expiredCount} booking(s) expired.`);
    return NextResponse.json({ ok: true, sentReminders: sentCount, expiredBookingsCount: expiredCount, expiredPackagesCount });
  } catch (err: any) {
    console.error('[Remind-Cron] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}