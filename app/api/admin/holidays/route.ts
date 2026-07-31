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
    
    // Sort by from_date, then start_time
    holidays.sort((a: any, b: any) => {
      const aDate = a.from_date || a.date || '';
      const bDate = b.from_date || b.date || '';
      if (aDate !== bDate) {
        return aDate.localeCompare(bDate);
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
      const { from_date, to_date, start_time, end_time, note } = holiday;
      if (!from_date || !to_date) {
        return NextResponse.json({ error: 'Missing start or end date.' }, { status: 400 });
      }
      if (!note || !note.trim()) {
        return NextResponse.json({ error: 'Holiday message is required.' }, { status: 400 });
      }
      if (to_date < from_date) {
        return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 400 });
      }
      const docRef = await addDoc(holidaysRef, {
        date: from_date, // YYYY-MM-DD (backward compatibility)
        from_date,
        to_date,
        start_time: start_time || null,
        end_time: end_time || null,
        note,
        created_at: new Date().toISOString()
      });
      await writeAuditLog('Holiday Added', 'Admin', { id: docRef.id, from_date, to_date, note });
      await notifyAdmins('Holiday Added', 'Admin', `Declared holiday from ${from_date} to ${to_date}: ${note}`);
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
