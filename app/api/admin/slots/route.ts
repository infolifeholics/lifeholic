import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, where } from 'firebase/firestore';
import { seedDefaultSlotsIfEmpty, writeAuditLog, verifyAdminRequest } from '@/lib/booking-utils';
import { notifyAdmins } from '@/lib/notifications/notification-service';
export async function GET() {
  try {
    await seedDefaultSlotsIfEmpty();
    
    const slotsRef = collection(db, 'session_slots');
    const q = query(slotsRef);
    const snap = await getDocs(q);
    
    const slots = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    
    // Sort by day_of_week, then start_time
    slots.sort((a: any, b: any) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.start_time.localeCompare(b.start_time);
    });

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error('Error fetching admin slots:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, slot, id, from_day, to_day, to_days, days, slots: bulkSlots } = body || {};
    const slotsRef = collection(db, 'session_slots');
    
    if (action === 'add') {
      const { day_of_week, start_time, end_time, active } = slot || {};
      if (day_of_week === undefined || !start_time || !end_time) {
        return NextResponse.json({ error: 'Missing required slot fields.' }, { status: 400 });
      }
      const docRef = await addDoc(slotsRef, {
        day_of_week: Number(day_of_week),
        start_time,
        end_time,
        active: active !== false,
        locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      await writeAuditLog('Slot Added', 'Admin', { id: docRef.id, day_of_week, start_time, end_time });
      await notifyAdmins('Slot Added', 'Admin', `Added session slot: ${start_time} - ${end_time} on day ${day_of_week}`);
      return NextResponse.json({ ok: true, id: docRef.id });
    }
    
    if (action === 'edit') {
      if (!id || !slot) {
        return NextResponse.json({ error: 'Missing ID or slot data.' }, { status: 400 });
      }
      const docRef = doc(db, 'session_slots', id);
      const updates: any = {
        updated_at: new Date().toISOString()
      };
      if (slot.day_of_week !== undefined) updates.day_of_week = Number(slot.day_of_week);
      if (slot.start_time) updates.start_time = slot.start_time;
      if (slot.end_time) updates.end_time = slot.end_time;
      if (slot.active !== undefined) updates.active = slot.active;
      if (slot.locked !== undefined) updates.locked = slot.locked;
      
      await updateDoc(docRef, updates);
      await writeAuditLog('Slot Edited', 'Admin', { id, updates: slot });
      await notifyAdmins('Slot Edited', 'Admin', `Edited session slot ID: ${id}`);
      return NextResponse.json({ ok: true });
    }
    
    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: 'Missing ID.' }, { status: 400 });
      }
      await deleteDoc(doc(db, 'session_slots', id));
      await writeAuditLog('Slot Deleted', 'Admin', { id });
      await notifyAdmins('Slot Deleted', 'Admin', `Deleted session slot ID: ${id}`);
      return NextResponse.json({ ok: true });
    }

    if (action === 'copy_day') {
      if (from_day === undefined || to_day === undefined) {
        return NextResponse.json({ error: 'Missing from_day or to_day.' }, { status: 400 });
      }
      
      const qFrom = query(slotsRef, where('day_of_week', '==', Number(from_day)));
      const snapFrom = await getDocs(qFrom);
      
      const qTo = query(slotsRef, where('day_of_week', '==', Number(to_day)));
      const snapTo = await getDocs(qTo);
      
      const batch = writeBatch(db);
      
      // Delete existing
      snapTo.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Copy new
      snapFrom.docs.forEach((d) => {
        const data = d.data();
        const newRef = doc(slotsRef);
        batch.set(newRef, {
          day_of_week: Number(to_day),
          start_time: data.start_time,
          end_time: data.end_time,
          active: data.active !== false,
          locked: data.locked || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
      
      await batch.commit();
      return NextResponse.json({ ok: true });
    }

    if (action === 'duplicate') {
      if (from_day === undefined || !to_days || !Array.isArray(to_days)) {
        return NextResponse.json({ error: 'Missing from_day or to_days array.' }, { status: 400 });
      }
      
      const qFrom = query(slotsRef, where('day_of_week', '==', Number(from_day)));
      const snapFrom = await getDocs(qFrom);
      
      const batch = writeBatch(db);
      
      for (const targetDay of to_days) {
        const qTo = query(slotsRef, where('day_of_week', '==', Number(targetDay)));
        const snapTo = await getDocs(qTo);
        
        // Delete existing
        snapTo.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // Copy new
        snapFrom.docs.forEach((d) => {
          const data = d.data();
          const newRef = doc(slotsRef);
          batch.set(newRef, {
            day_of_week: Number(targetDay),
            start_time: data.start_time,
            end_time: data.end_time,
            active: data.active !== false,
            locked: data.locked || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      }
      
      await batch.commit();
      return NextResponse.json({ ok: true });
    }

    if (action === 'bulk_create') {
      if (!days || !Array.isArray(days) || !bulkSlots || !Array.isArray(bulkSlots)) {
        return NextResponse.json({ error: 'Missing days or slots array.' }, { status: 400 });
      }
      
      const batch = writeBatch(db);
      
      for (const targetDay of days) {
        const qTo = query(slotsRef, where('day_of_week', '==', Number(targetDay)));
        const snapTo = await getDocs(qTo);
        
        // Delete existing
        snapTo.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // Create new
        bulkSlots.forEach((s: any) => {
          const newRef = doc(slotsRef);
          batch.set(newRef, {
            day_of_week: Number(targetDay),
            start_time: s.start_time,
            end_time: s.end_time,
            active: true,
            locked: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      }
      
      await batch.commit();
      return NextResponse.json({ ok: true });
    }
    
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying admin slots:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
