import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { seedDefaultSlotsIfEmpty } from '@/lib/booking-utils-server';
import { getIstWeekday, istDateTimeToUtc } from '@/lib/booking-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('service_id');
    const dateStr = searchParams.get('date'); // yyyy-mm-dd
    const tz = searchParams.get('tz') || 'Asia/Kolkata';

    if (!dateStr) {
      return NextResponse.json({ error: 'date is required.' }, { status: 400 });
    }

    // Ensure session slots are seeded
    await seedDefaultSlotsIfEmpty();

    // 1. Fetch holidays and filter in memory by range (inclusive)
    const holidaysSnap = await adminDb.collection('holidays').get();
    const allHolidays = holidaysSnap.docs.map(d => d.data());
    const holidays = allHolidays.filter((h: any) => {
      const from = h.from_date || h.date;
      const to = h.to_date || h.date;
      return dateStr >= from && dateStr <= to;
    });

    // Check if entire day is marked as a holiday
    const allDayHoliday = holidays.find(h => !h.start_time);
    if (allDayHoliday) {
      return NextResponse.json({ slots: [], holiday: allDayHoliday.note || 'Holiday' });
    }

    // 2. Fetch session slots configured for the weekday of this date
    const weekday = getIstWeekday(dateStr);
    const slotsSnap = await adminDb.collection('session_slots')
      .where('day_of_week', '==', weekday)
      .where('active', '==', true)
      .get();
    const configuredSlots = slotsSnap.docs.map(d => d.data());

    if (configuredSlots.length === 0) {
      return NextResponse.json({ slots: [], holiday: null });
    }

    // 3. Fetch existing bookings for that date in UTC
    const dayStartUTC = istDateTimeToUtc(dateStr, '00:00');
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60_000);

    const bookingsSnap = await adminDb.collection('bookings')
      .where('start_time', '>=', dayStartUTC.toISOString())
      .where('start_time', '<', dayEndUTC.toISOString())
      .where('status', 'in', ['pending', 'confirmed'])
      .get();
    const existingBookings = bookingsSnap.docs.map(d => d.data());

    // Fetch existing free call bookings for the day (non-cancelled)
    const freeCallsSnap = await adminDb.collection('free_call_bookings')
      .where('start_time', '>=', dayStartUTC.toISOString())
      .where('start_time', '<', dayEndUTC.toISOString())
      .get();
    const existingFreeCalls = freeCallsSnap.docs.map(d => d.data()).filter((f: any) => f.status !== 'cancelled');

    const bookedRanges = [
      ...existingBookings.map(b => ({
        start: new Date(b.start_time).getTime(),
        end: new Date(b.end_time).getTime()
      })),
      ...existingFreeCalls.map(f => ({
        start: new Date(f.start_time).getTime(),
        end: new Date(f.end_time).getTime()
      }))
    ];

    // 4. Map and filter slots
    const now = Date.now();
    const resultSlots = configuredSlots
      .map(slot => {
        const startUTC = istDateTimeToUtc(dateStr, slot.start_time);
        const endUTC = istDateTimeToUtc(dateStr, slot.end_time);
        return {
          start: startUTC.toISOString(),
          end: endUTC.toISOString(),
          start_time: slot.start_time,
          end_time: slot.end_time,
          modes: ['online'] as ('online' | 'offline')[]
        };
      })
      .filter(slot => {
        const sTime = new Date(slot.start).getTime();
        const eTime = new Date(slot.end).getTime();

        // 1. Prevent past bookings (1 hour buffer)
        if (sTime < now + 60 * 60_000) return false;

        // 2. Prevent overlapping with existing bookings
        if (bookedRanges.some(r => sTime < r.end && eTime > r.start)) return false;

        // 3. Prevent booking during a holiday slot
        const isHolidaySlot = holidays.some(h => {
          if (h.start_time && h.end_time) {
            const hStart = istDateTimeToUtc(dateStr, h.start_time).getTime();
            const hEnd = istDateTimeToUtc(dateStr, h.end_time).getTime();
            return sTime < hEnd && eTime > hStart;
          }
          return false;
        });
        if (isHolidaySlot) return false;

        return true;
      });

    // Sort slots chronologically
    resultSlots.sort((a, b) => a.start.localeCompare(b.start));

    return NextResponse.json({ slots: resultSlots, holiday: null });
  } catch (error: any) {
    console.error('Slots fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
