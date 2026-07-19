import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Create a booking. The partial unique index uniq_active_booking_slot is the
// final guarantee against double-booking — a second insert for the same
// (service_id, start_time, mode) with status pending/confirmed will fail.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      service_id,
      client_name,
      client_email,
      client_phone,
      client_timezone,
      start_time,
      end_time,
      mode,
      notes,
      amount,
      currency,
      user_id,
    } = body || {};

    if (!service_id || !client_name || !client_email || !start_time || !end_time || !mode) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!['online', 'offline'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 });
    }

    // Verify the service exists and get its duration to validate end_time
    const { data: service } = await supabase
      .from('services')
      .select('id, duration_minutes, mode, price_inr, price_usd')
      .eq('id', service_id)
      .maybeSingle();
    if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid times.' }, { status: 400 });
    }
    const expectedDuration = (end.getTime() - start.getTime()) / 60_000;
    if (Math.abs(expectedDuration - service.duration_minutes) > 1) {
      return NextResponse.json({ error: 'Session duration mismatch.' }, { status: 400 });
    }
    if ((service.mode === 'online' && mode === 'offline') || (service.mode === 'offline' && mode === 'online')) {
      return NextResponse.json({ error: 'Mode not available for this service.' }, { status: 400 });
    }

    // Final pre-flight: confirm the slot isn't already taken
    const { data: clash } = await supabase
      .from('bookings')
      .select('id')
      .eq('service_id', service_id)
      .eq('start_time', start.toISOString())
      .eq('mode', mode)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();
    if (clash) {
      return NextResponse.json(
        { error: 'This slot was just taken. Please choose another time.' },
        { status: 409 }
      );
    }

    const insert = {
      service_id,
      user_id: user_id || null,
      client_name,
      client_email,
      client_phone: client_phone || null,
      client_timezone: client_timezone || 'Asia/Kolkata',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      mode,
      status: 'confirmed',
      payment_status: 'unpaid',
      amount: amount ?? 0,
      currency: currency || 'INR',
      notes: notes || null,
    };

    const { data, error } = await supabase.from('bookings').insert(insert).select('id').single();

    if (error) {
      // 23505 = unique_violation — the double-booking guard fired
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This slot was just taken. Please choose another time.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Could not create booking.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
