import 'dotenv/config';
import { adminDb } from '../lib/firebase-admin';

async function check() {
  const snap = await adminDb.collection('workshopRegistrations').limit(10).get();
  console.log("Total registrations:", snap.size);
  snap.forEach(doc => {
    console.log("Doc ID:", doc.id, "Data:", doc.data());
  });
}

check().catch(console.error);
