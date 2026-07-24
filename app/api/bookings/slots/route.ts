import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function istToUtc(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const midnightIstInUtc = new Date(`${dateStr}T00:00:00Z`).getTime() - IST_OFFSET_MS;
  return new Date(midnightIstInUtc + (h * 60 + m) * 60 * 1000);
}

function weekdayInIST(dateStr: string): number {
  const noonIst = new Date(`${dateStr}T12:00:00+05:30`);
  return noonIst.getDay();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('service_id');
    const dateStr = searchParams.get('date'); // yyyy-mm-dd
    const tz = searchParams.get('tz') || 'Asia/Kolkata';

    if (!serviceId || !dateStr) {
      return NextResponse.json({ error: 'service_id and date are required.' }, { status: 400 });
    }

    const serviceDoc = await getDoc(doc(db, 'services', serviceId));
    if (!serviceDoc.exists()) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    const service = serviceDoc.data();

    const duration = service.duration_minutes || 60;

    const availSnap = await getDocs(collection(db, 'availability'));
    const availability = availSnap.docs.map((d) => d.data());

    const weekdayIST = weekdayInIST(dateStr);
    const weekly = availability.filter((a) => a.kind === 'weekly' && a.weekday === weekdayIST);

    if (!weekly.length) return NextResponse.json({ slots: [] });

    const holidays = availability.filter(
      (a) => a.kind === 'holiday' && a.specific_date && a.specific_date.slice(0, 10) === dateStr
    );
    if (holidays.length) return NextResponse.json({ slots: [] });

    const candidateStartsUTC: Date[] = [];
    for (const w of weekly) {
      if (!w.start_time || !w.end_time) continue;
      const windowStart = istToUtc(dateStr, String(w.start_time).slice(0, 5));
      const windowEnd = istToUtc(dateStr, String(w.end_time).slice(0, 5));

      let cursor = windowStart.getTime();
      const end = windowEnd.getTime();
      while (cursor + duration * 60_000 <= end) {
        candidateStartsUTC.push(new Date(cursor));
        cursor += duration * 60_000;
      }
    }

    if (!candidateStartsUTC.length) return NextResponse.json({ slots: [] });

    const dayStartUTC = istToUtc(dateStr, '00:00');
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60_000);

    const bookingsRef = collection(db, 'bookings');
    const qBookings = query(
      bookingsRef,
      where('service_id', '==', serviceId),
      where('start_time', '>=', dayStartUTC.toISOString()),
      where('start_time', '<', dayEndUTC.toISOString()),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const bookingsSnap = await getDocs(qBookings);
    const existing = bookingsSnap.docs.map((d) => d.data());

    const bookedRanges = existing.map((b) => ({
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
    }));

    const blocked = availability.filter(
      (a) => a.kind === 'blocked' && a.specific_date && a.specific_date.slice(0, 10) === dateStr
    );
    const blockedRanges = blocked.map((b) => ({
      start: istToUtc(dateStr, String(b.start_time || '00:00').slice(0, 5)).getTime(),
      end: istToUtc(dateStr, String(b.end_time || '23:59').slice(0, 5)).getTime(),
    }));

    const now = Date.now();
    const allowOffline = service.mode === 'offline' || service.mode === 'both';
    const allowOnline = service.mode === 'online' || service.mode === 'both';

    const slots = candidateStartsUTC
      .filter((start) => {
        const s = start.getTime();
        const e = s + duration * 60_000;
        if (s < now + 60 * 60_000) return false;
        if (bookedRanges.some((r) => s < r.end && e > r.start)) return false;
        if (blockedRanges.some((r) => s < r.end && e > r.start)) return false;
        return true;
      })
      .map((start) => {
        const end = new Date(start.getTime() + duration * 60_000);
        const modes: ('online' | 'offline')[] = [];
        if (allowOnline) modes.push('online');
        if (allowOffline) modes.push('offline');
        return { start: start.toISOString(), end: end.toISOString(), modes, tz };
      });

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error('Slots error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
