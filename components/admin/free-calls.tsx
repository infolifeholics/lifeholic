'use client';

import { useEffect, useState } from 'react';
import { Phone, Mail, Clock, Loader2, Trash2, CheckCircle2, RefreshCw, MessageSquare, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FreeCallBooking = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferred_time?: string;
  note?: string;
  date?: string;
  start_time?: string;
  duration?: number;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  serviceId?: string;
  serviceName?: string;
  createdAt: string;
};

export function AdminFreeCalls() {
  const [bookings, setBookings] = useState<FreeCallBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = query(
      collection(db, 'free_call_bookings'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    getDocs(q)
      .then((snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FreeCallBooking);
        setBookings(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching free call bookings:', err);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const updateStatus = async (id: string, newStatus: FreeCallBooking['status']) => {
    try {
      await setDoc(doc(db, 'free_call_bookings', id), { status: newStatus }, { merge: true });
      toast.success(`Status updated to ${newStatus}`);
      load();
    } catch (error) {
      toast.error('Could not update status.');
    }
  };

  const deleteBooking = async (id: string) => {
    if (!await (window as any).customConfirm('Are you sure you want to permanently delete this free call request?')) return;
    try {
      await deleteDoc(doc(db, 'free_call_bookings', id));
      toast.success('Booking deleted.');
      load();
    } catch (error) {
      toast.error('Could not delete booking.');
    }
  };

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        <Loader2 className="mr-1 inline h-4 w-4 animate-spin text-gold" /> Loading discovery calls…
      </p>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
        <Phone className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-display text-xl text-foreground">No Discovery Calls requested yet</p>
      </div>
    );
  }

  const getStatusBadgeClass = (status: FreeCallBooking['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'contacted':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center bg-card/60 p-4 border border-border/60 rounded-2xl">
        <span className="text-xs font-semibold text-muted-foreground">
          Showing latest {bookings.length} Discovery Call requests
        </span>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.map((b) => {
          const timingDisplay = b.preferred_time || (b.start_time ? new Date(b.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Anytime');
          const cleanPhone = (b.phone || '').replace(/[^0-9+]/g, '');

          return (
            <div
              key={b.id}
              className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:border-primary/20 hover:shadow-soft transition-all duration-300"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-base">{b.name}</p>
                    <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', getStatusBadgeClass(b.status))}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Lead ID: {b.id}</p>
                  <p className="text-xs text-gold font-semibold mt-1">
                    Service: {b.serviceName || 'General Discovery Call'}
                  </p>
                  {b.note && (
                    <p className="text-xs text-muted-foreground/90 mt-1 italic bg-secondary/30 p-2 rounded-lg border border-border/40">
                      &quot;{b.note}&quot;
                    </p>
                  )}
                </div>

                {/* Status Update Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={b.status}
                    onChange={(e) => updateStatus(b.id, e.target.value as FreeCallBooking['status'])}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <button
                    onClick={() => deleteBooking(b.id)}
                    className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Booking Details Footer Row */}
              <div className="grid grid-cols-1 gap-3 border-t border-border/40 mt-4 pt-3 text-xs text-muted-foreground sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground/60">Phone Number</span>
                  <a
                    href={`tel:${cleanPhone}`}
                    className="font-semibold text-foreground hover:text-gold transition-colors mt-0.5 flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3 text-gold" /> {b.phone}
                  </a>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground/60">Email</span>
                  {b.email ? (
                    <a
                      href={`mailto:${b.email}`}
                      className="font-semibold text-foreground hover:text-gold transition-colors mt-0.5 flex items-center gap-1 truncate"
                    >
                      <Mail className="h-3 w-3 text-gold" /> {b.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground/60">Preferred Time</span>
                  <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gold" /> {timingDisplay}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground/60">Submitted At</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminFreeCalls;
