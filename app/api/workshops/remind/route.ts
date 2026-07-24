import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { registration_id } = await req.json();
    if (!registration_id) {
      return NextResponse.json({ error: 'Registration reference is required.' }, { status: 400 });
    }

    const regQuery = query(collection(db, 'workshopRegistrations'), where('id', '==', registration_id));
    const snap = await getDocs(regQuery);
    if (snap.empty) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }
    const reg = snap.docs[0].data();

    // Trigger mock or real WhatsApp/email notifications
    console.log(`Sending automated reminder email and WhatsApp notification to ${reg.client_name} (${reg.client_email}) for workshop ${reg.workshop_title}`);

    // Log the notification in Firestore
    await addDoc(collection(db, 'notifications'), {
      user_id: reg.user_id,
      type: 'workshop_reminder',
      title: 'Workshop Reminder',
      message: `Friendly reminder: Your session "${reg.workshop_title}" is coming up soon!`,
      read: false,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Reminder dispatch error:', error);
    return NextResponse.json({ error: 'Failed to dispatch reminder.' }, { status: 500 });
  }
}

// Helper to support collection import
import { addDoc } from 'firebase/firestore';
