import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';

async function dispatchEmailWithRetry(reg: any, certNo: string, certUrl: string, attempt = 1): Promise<boolean> {
  try {
    console.log(`[Email Attempt ${attempt}] Sending Certificate Ready email to ${reg.client_name} (${reg.client_email}) for ${reg.workshop_title}. Cert #: ${certNo}`);
    // Simulate potential failure
    if (Math.random() < 0.1) throw new Error('SMTP Timeout');
    return true;
  } catch (err: any) {
    console.error(`[Email Failed] Attempt ${attempt} failed: ${err.message}`);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return dispatchEmailWithRetry(reg, certNo, certUrl, attempt + 1);
    }
    return false;
  }
}

async function dispatchWhatsAppWithRetry(reg: any, certUrl: string, attempt = 1): Promise<boolean> {
  try {
    console.log(`[WhatsApp Attempt ${attempt}] Sending Certificate Link to ${reg.client_phone}. Url: ${certUrl}`);
    if (Math.random() < 0.1) throw new Error('WhatsApp Gateway Error');
    return true;
  } catch (err: any) {
    console.error(`[WhatsApp Failed] Attempt ${attempt} failed: ${err.message}`);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return dispatchWhatsAppWithRetry(reg, certUrl, attempt + 1);
    }
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { registration_id, certificate_url, certificate_number } = await req.json();
    if (!registration_id || !certificate_url) {
      return NextResponse.json({ error: 'Missing registration reference or URL.' }, { status: 400 });
    }

    const regQuery = query(collection(db, 'workshopRegistrations'), where('id', '==', registration_id));
    const snap = await getDocs(regQuery);
    if (snap.empty) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    const regDoc = snap.docs[0];
    const regData = regDoc.data();
    const certNo = certificate_number || `CERT-${regData.workshop_id.substring(3)}-${Math.random().toString(36).substring(4).toUpperCase()}`;

    // Update Firestore Document status to available
    await setDoc(regDoc.ref, {
      certificate_url,
      certificate_number: certNo,
      certificate_status: 'available'
    }, { merge: true });

    // Store in-app notification
    await addDoc(collection(db, 'notifications'), {
      user_id: regData.user_id,
      type: 'certificate_ready',
      title: 'Certificate Available',
      message: `Your certificate for '${regData.workshop_title}' is ready to download.`,
      read: false,
      created_at: new Date().toISOString()
    });

    // Run notifications asynchronously with automatic retries
    dispatchEmailWithRetry(regData, certNo, certificate_url).then((success) => {
      if (!success) console.error(`Failed to send certificate email to ${regData.client_email} after 3 attempts.`);
    });

    dispatchWhatsAppWithRetry(regData, certificate_url).then((success) => {
      if (!success) console.error(`Failed to send certificate WhatsApp to ${regData.client_phone} after 3 attempts.`);
    });

    return NextResponse.json({ ok: true, certificate_number: certNo });
  } catch (error: any) {
    console.error('Certificate distribution error:', error);
    return NextResponse.json({ error: 'Failed to process certificate distribution.' }, { status: 500 });
  }
}
