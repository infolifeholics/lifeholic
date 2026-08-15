import { adminDb } from './firebase-admin';

export const DEFAULT_WEEKLY_SLOTS = [
  { start_time: '10:30', end_time: '11:00' },
  { start_time: '11:15', end_time: '11:45' },
  { start_time: '12:00', end_time: '12:30' },
  { start_time: '12:45', end_time: '13:15' },
  { start_time: '15:15', end_time: '15:45' },
  { start_time: '16:00', end_time: '16:30' },
  { start_time: '16:45', end_time: '17:15' }
];

export async function seedDefaultSlotsIfEmpty() {
  const slotsRef = adminDb.collection('session_slots');
  const snap = await slotsRef.limit(1).get();
  
  if (snap.empty) {
    console.log('Seeding default session slots via Admin SDK...');
    const batch = adminDb.batch();
    
    // Seed Monday (1) to Friday (5)
    for (let day = 1; day <= 5; day++) {
      for (const slot of DEFAULT_WEEKLY_SLOTS) {
        const newDocRef = slotsRef.doc();
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
