import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { writeAuditLog, verifyAdminRequest } from '@/lib/booking-utils';
import { notifyAdmins } from '@/lib/notifications/notification-service';

export async function GET() {
  try {
    const holidaysRef = collection(db, 'holidays');
    const snap = await getDocs(holidaysRef);
    
    const holidays = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    
    // Sort by date, then start_time
    holidays.sort((a: any, b: any) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    return NextResponse.json({ holidays });
  } catch (error: any) {
    console.error('Error fetching admin holidays:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, holiday, id } = await req.json();
    const holidaysRef = collection(db, 'holidays');
    
    if (action === 'add') {
      const { date, start_time, end_time, note } = holiday;
      if (!date) {
        return NextResponse.json({ error: 'Missing date field.' }, { status: 400 });
      }
      const docRef = await addDoc(holidaysRef, {
        date, // YYYY-MM-DD
        start_time: start_time || null,
        end_time: end_time || null,
        note: note || 'Holiday',
        created_at: new Date().toISOString()
      });
      await writeAuditLog('Holiday Added', 'Admin', { id: docRef.id, date, note });
      await notifyAdmins('Holiday Added', 'Admin', `Declared holiday on ${date}: ${note}`);
      return NextResponse.json({ ok: true, id: docRef.id });
    }
    
    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: 'Missing ID.' }, { status: 400 });
      }
      await deleteDoc(doc(db, 'holidays', id));
      await writeAuditLog('Holiday Removed', 'Admin', { id });
      await notifyAdmins('Holiday Removed', 'Admin', `Removed holiday ID: ${id}`);
      return NextResponse.json({ ok: true });
    }
    
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying admin holidays:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
