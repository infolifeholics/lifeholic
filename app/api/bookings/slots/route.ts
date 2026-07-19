import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// IST is UTC+5:30 (330 minutes ahead of UTC)
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Convert an IST "HH:MM" time on a given YYYY-MM-DD date string to a UTC Date */
function istToUtc(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  // Midnight IST of that date in UTC
  const midnightIstInUtc = new Date(`${dateStr}T00:00:00Z`).getTime() - IST_OFFSET_MS;
  return new Date(midnightIstInUtc + (h * 60 + m) * 60 * 1000);
}

/** Get the day-of-week in IST (0=Sun … 6=Sat) for a YYYY-MM-DD string */
function weekdayInIST(dateStr: string): number {
  // Noon IST is well within the IST calendar day
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

    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes, mode')
      .eq('id', serviceId)
      .maybeSingle();
    if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });

    const duration = service.duration_minutes || 60;

    const { data: availability } = await supabase.from('availability').select('*');

    // Weekday in IST (therapist's local time)
    const weekdayIST = weekdayInIST(dateStr);
    const weekly = (availability || []).filter((a) => a.kind === 'weekly' && a.weekday === weekdayIST);

    if (!weekly.length) return NextResponse.json({ slots: [] });

    // Check holidays
    const holidays = (availability || []).filter(
      (a) => a.kind === 'holiday' && a.specific_date && a.specific_date.slice(0, 10) === dateStr
    );
    if (holidays.length) return NextResponse.json({ slots: [] });

    // Generate candidate slot starts in UTC from IST windows
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

    // Load existing bookings for this day (we query a generous UTC window)
    const dayStartUTC = istToUtc(dateStr, '00:00');
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60_000);

    const { data: existing } = await supabase
      .from('bookings')
      .select('start_time, end_time, mode, status')
      .eq('service_id', serviceId)
      .gte('start_time', dayStartUTC.toISOString())
      .lt('start_time', dayEndUTC.toISOString())
      .in('status', ['pending', 'confirmed']);

    const bookedRanges = (existing || []).map((b) => ({
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
    }));

    // Load blocked slots for this specific date
    const blocked = (availability || []).filter(
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
        // Require at least 1h lead time
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
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
