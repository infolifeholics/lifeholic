import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { verifyAdminRequest } from '@/lib/booking-utils';
import { queueNotification } from '@/lib/notifications/notification-service';

/**
 * POST /api/admin/promo/broadcast
 * Body: { code: string, discount: string }
 *
 * Sends a promotional email broadcast to all members and newsletter subscribers.
 */
export async function POST(req: Request) {
  const isAdmin = await verifyAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code, discount } = await req.json();
    if (!code || !discount) {
      return NextResponse.json({ error: 'Missing code or discount parameter.' }, { status: 400 });
    }

    const emails = new Set<string>();

    // Fetch registered members
    const profilesSnap = await getDocs(collection(db, 'profiles'));
    profilesSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.email) {
        emails.add(data.email.trim().toLowerCase());
      }
    });

    // Fetch newsletter subscribers
    const newsletterSnap = await getDocs(collection(db, 'newsletter'));
    newsletterSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.email) {
        emails.add(data.email.trim().toLowerCase());
      }
    });

    const emailList = Array.from(emails);
    console.log(`[Promo Broadcast] Dispatching promo code ${code} to ${emailList.length} unique addresses.`);

    // Queue notification for each unique email address
    const promises = emailList.map((email) => {
      const vars = {
        memberName: 'Valued Client',
        bookingId: code,
        bookingStatus: discount,
        actionDetails: 'Exclusive Special Offer',
      };
      return queueNotification(
        'promo_offer',
        email,
        null,
        vars,
        code,
        undefined
      ).catch((err) => {
        console.error(`[Promo Broadcast] Failed to queue promo email to ${email}:`, err);
      });
    });

    await Promise.all(promises);

    return NextResponse.json({ ok: true, message: `Promo broadcast queued to ${emailList.length} subscribers.` });
  } catch (err: any) {
    console.error('[Promo Broadcast API Route Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
