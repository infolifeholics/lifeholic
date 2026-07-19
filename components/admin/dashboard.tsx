'use client';

import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, DollarSign, Users, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatInTz, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatCounter } from '@/components/site/stat-counter';

type BookingRow = {
  id: string;
  client_name: string;
  client_email: string;
  start_time: string;
  end_time: string;
  mode: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  notes: string | null;
  services: { title: string } | { title: string }[] | null;
};

export function AdminDashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, confirmed: 0, pending: 0, clients: 0 });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, client_name, client_email, start_time, end_time, mode, status, payment_status, amount, currency, notes, services(title)')
      .order('start_time', { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) {
      toast.error('Could not load bookings.');
      return;
    }
    setBookings((data as unknown as BookingRow[]) || []);
    const rows = (data as unknown as BookingRow[]) || [];
    const revenue = rows.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0);
    setStats({
      revenue,
      confirmed: rows.filter((r) => r.status === 'confirmed').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      clients: new Set(rows.map((r) => r.client_email)).size,
    });
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast.error('Could not update.');
    toast.success(`Booking ${status}.`);
    load();
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Revenue (paid)', value: stats.revenue, prefix: '₹', icon: DollarSign, fmt: (v: number) => v.toLocaleString('en-IN') },
          { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, fmt: (v: number) => String(v) },
          { label: 'Pending', value: stats.pending, icon: Clock, fmt: (v: number) => String(v) },
          { label: 'Clients', value: stats.clients, icon: Users, fmt: (v: number) => String(v) },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <s.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 font-display text-3xl font-medium text-foreground">
              {s.prefix}<StatCounter value={s.value} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-foreground">Recent bookings</h2>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Client</th>
                  <th className="pb-3 pr-4">Session</th>
                  <th className="pb-3 pr-4">When</th>
                  <th className="pb-3 pr-4">Mode</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Paid</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/40">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-foreground">{b.client_name}</p>
                      <p className="text-xs text-muted-foreground">{b.client_email}</p>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{serviceTitle(b.services)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {formatInTz(b.start_time, 'Asia/Kolkata', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 pr-4 capitalize text-muted-foreground">{b.mode}</td>
                    <td className="py-4 pr-4">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusColor(b.status))}>{b.status}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', b.payment_status === 'paid' ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground')}>{b.payment_status}</span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-1">
                        {b.status !== 'confirmed' && (
                          <button onClick={() => updateStatus(b.id, 'confirmed')} className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/25">Confirm</button>
                        )}
                        {b.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(b.id, 'cancelled')} className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/25">Cancel</button>
                        )}
                        {b.status === 'confirmed' && (
                          <button onClick={() => updateStatus(b.id, 'completed')} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted">Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function statusColor(s: string): string {
  return ({
    confirmed: 'bg-success/15 text-success',
    pending: 'bg-warning/15 text-warning',
    cancelled: 'bg-destructive/15 text-destructive',
    completed: 'bg-secondary text-muted-foreground',
    rescheduled: 'bg-warning/15 text-warning',
  } as Record<string, string>)[s] || 'bg-secondary text-muted-foreground';
}

function serviceTitle(s: BookingRow['services']): string {
  if (!s) return '—';
  if (Array.isArray(s)) return s[0]?.title || '—';
  return s.title || '—';
}
