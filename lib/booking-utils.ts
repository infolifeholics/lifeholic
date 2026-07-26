import { db } from './firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export const DEFAULT_WEEKLY_SLOTS = [
  { start_time: '10:30', end_time: '11:00' },
  { start_time: '11:15', end_time: '11:45' },
  { start_time: '12:00', end_time: '12:30' },
  { start_time: '12:45', end_time: '13:15' },
  { start_time: '15:15', end_time: '15:45' },
  { start_time: '16:00', end_time: '16:30' },
  { start_time: '16:45', end_time: '17:15' }
];

export const DAYS_OF_WEEK = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 }
];

export async function seedDefaultSlotsIfEmpty() {
  const slotsRef = collection(db, 'session_slots');
  const snap = await getDocs(slotsRef);
  
  if (snap.empty) {
    console.log('Seeding default session slots...');
    const batch = writeBatch(db);
    
    // Seed Monday (1) to Friday (5)
    for (let day = 1; day <= 5; day++) {
      for (const slot of DEFAULT_WEEKLY_SLOTS) {
        const newDocRef = doc(slotsRef);
        batch.set(newDocRef, {
          day_of_week: day, // 0-6
          start_time: slot.start_time, // e.g. "10:30"
          end_time: slot.end_time, // e.g. "11:00"
          active: true,
          created_at: new Date().toISOString()
        });
      }
    }
    await batch.commit();
    console.log('Default session slots seeded successfully.');
  }
}

// Convert IST date and time string to a UTC Date object
export function istDateTimeToUtc(dateStr: string, timeStr: string): Date {
  // dateStr is YYYY-MM-DD, timeStr is HH:MM (24h)
  // Asia/Kolkata is UTC+5:30
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Construct Date directly by building the ISO 8601 string for IST
  const isoStr = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`;
  return new Date(isoStr);
}

// Determine IST weekday from a Date object or YYYY-MM-DD date string
export function getIstWeekday(dateStr: string): number {
  // To avoid local timezone shifts, construct in IST timezone explicitly
  const dateObj = new Date(`${dateStr}T12:00:00+05:30`);
  return dateObj.getDay(); // 0 is Sunday, 1 is Monday, etc.
}

export async function writeAuditLog(action: string, actorType: 'Admin' | 'User', details: Record<string, any>) {
  try {
    const { addDoc, collection } = await import('firebase/firestore');
    await addDoc(collection(db, 'audit_logs'), {
      action,
      actor: actorType,
      timestamp: new Date().toISOString(),
      details
    });
    console.log(`[AuditLog] logged "${action}" by ${actorType}`);
  } catch (e) {
    console.error('[AuditLog] Failed to write audit log:', e);
  }
}

export async function verifyAdminRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) return false;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    const uid = data.users?.[0]?.localId;
    if (!uid) return false;

    const { doc, getDoc } = await import('firebase/firestore');
    const profileSnap = await getDoc(doc(db, 'profiles', uid));
    if (!profileSnap.exists()) return false;
    return profileSnap.data().is_admin === true;
  } catch (e) {
    console.error('Error verifying admin token:', e);
    return false;
  }
}
