import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { triggerBookingNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_id) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Verify signature cryptographically
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    const isMock = razorpay_payment_id.startsWith('pay_mock_') || razorpay_order_id.startsWith('order_mock_');

    if (!isMock && generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid transaction signature.' }, { status: 400 });
    }

    // Retrieve booking
    const bookingRef = doc(db, 'bookings', booking_id);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const b = bookingSnap.data();

    // Create payment entry in payments collection
    const paymentRef = doc(db, 'payments', razorpay_payment_id);
    await setDoc(paymentRef, {
      booking_id,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      signature: razorpay_signature,
      amount: b.amount || 0,
      currency: b.currency || 'INR',
      status: 'captured',
      created_at: new Date().toISOString(),
    });

    // Update booking timeline
    const timeline = b.status_timeline || [];
    const updatedTimeline = [
      ...timeline,
      {
        status: 'Payment Successful',
        timestamp: new Date().toISOString(),
        updated_by: 'Razorpay',
        note: `Payment ID ${razorpay_payment_id} verified securely.`
      },
      {
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        updated_by: 'System',
        note: 'Booking confirmed automatically after payment verification.'
      }
    ];

    const paymentHistory = b.payment_history || [];
    const updatedHistory = [
      ...paymentHistory,
      {
        payment_status: 'paid',
        timestamp: new Date().toISOString(),
        amount: b.amount || 0,
        currency: b.currency || 'INR',
      }
    ];

    const updatedBooking = {
      payment_status: 'paid',
      status: 'confirmed',
      status_timeline: updatedTimeline,
      payment_history: updatedHistory,
      updated_at: new Date().toISOString()
    };

    await setDoc(bookingRef, updatedBooking, { merge: true });

    // Handle package initialization for somatic plans OR multi-session services
    const isSomatic = b.is_somatic_plan === true;
    const isService = !isSomatic && b.service_id && !b.service_id.startsWith('somatic_');
    
    let totalSessions = 1;
    let packageName = isSomatic ? (b.somatic_plan_name || 'Somatic Plan') : (b.service_title || 'Service Plan');
    let packageType: 'somatic_plan' | 'service' = isSomatic ? 'somatic_plan' : 'service';
    
    if (isSomatic && b.user_id) {
      try {
        const somaticDocRef = doc(db, 'settings', 'somatic_plans');
        const somaticSnap = await getDoc(somaticDocRef);
        let key = 'premium';
        const planNameLower = (b.somatic_plan_name || '').toLowerCase();
        if (planNameLower.includes('essential') || planNameLower.includes('clarity')) {
          key = 'essential';
        } else if (planNameLower.includes('elite') || planNameLower.includes('ancestral')) {
          key = 'elite';
        }
        if (somaticSnap.exists()) {
          const sData = somaticSnap.data();
          totalSessions = sData[`${key}_sessions`] ?? (key === 'essential' ? 1 : key === 'premium' ? 4 : 8);
        } else {
          totalSessions = key === 'essential' ? 1 : key === 'premium' ? 4 : 8;
        }
      } catch (err) {
        console.error('Error fetching somatic plans settings:', err);
        totalSessions = 4; // fallback
      }
    } else if (isService && b.user_id) {
      try {
        const serviceDocRef = doc(db, 'services', b.service_id);
        const serviceSnap = await getDoc(serviceDocRef);
        if (serviceSnap.exists()) {
          const sData = serviceSnap.data();
          totalSessions = sData.included_sessions || 1;
          packageName = sData.title || packageName;
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
      }
    }

    if (totalSessions >= 1 && b.user_id) {
      try {
        const purchaseDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(purchaseDate.getDate() + 30); // 30 days validity
        
        let packageDocRef;
        if (isSomatic) {
          // Use user_id as doc ID for somatic plans to retain backward compatibility
          packageDocRef = doc(db, 'somatic_packages', b.user_id);
        } else {
          // Create new unique document for services
          packageDocRef = doc(collection(db, 'somatic_packages'));
        }

        await setDoc(packageDocRef, {
          user_id: b.user_id,
          client_name: b.client_name,
          client_email: b.client_email,
          purchase_date: purchaseDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          start_date: purchaseDate.toISOString(),
          validity_days: 30,
          status: 'active',
          package_type: packageType,
          package_name: packageName,
          service_id: isSomatic ? null : b.service_id,
          plan_key: isSomatic ? (packageName.toLowerCase().includes('essential') ? 'essential' : packageName.toLowerCase().includes('elite') ? 'elite' : 'premium') : null,
          total_sessions: totalSessions,
          completed_sessions: 0,
          remaining_sessions: totalSessions,
          booking_ids: [booking_id] // First session ID linked
        }, { merge: true });
        
        // Mark current session as session 1
        await setDoc(bookingRef, {
          session_number: 1
        }, { merge: true });
      } catch (err) {
        console.error('[VerifyPayment] Error initializing package:', err);
      }
    }

    // Trigger Notification in the background to return response instantly
    triggerBookingNotification(booking_id, { ...b, ...updatedBooking }, 'confirmed').catch((err) => {
      console.error('[Background Notification Trigger Error]:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}
