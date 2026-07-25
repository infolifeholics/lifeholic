'use client';

import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, DollarSign, Users, XCircle, Loader2, X, Plus, Edit } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { formatInTz } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatCounter } from '@/components/site/stat-counter';
import { AdminCalendarView } from '@/components/admin/calendar-view';

type BookingRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  whatsapp?: string | null;
  start_time: string;
  end_time: string;
  mode: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  notes: string | null;
  service_title: string;
  category?: string | null;
  subcategory?: string | null;
  problems?: string[] | null;
  summary?: string | null;
  is_somatic_plan?: boolean | null;
  somatic_plan_name?: string | null;
  created_at?: string;
  internal_notes?: string | null;
  status_timeline?: Array<{ status: string; timestamp: string; note: string }>;
  admin_updates?: Array<{ field: string; old_value: string; new_value: string; timestamp: string }>;
  payment_history?: Array<{ payment_status: string; timestamp: string; amount: number; currency: string }>;
  reschedule_request?: { requested_by: string; proposed_start_time: string; proposed_end_time: string; status: string; timestamp: string } | null;
};

export function AdminDashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, confirmed: 0, pending: 0, clients: 0 });
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'calendar'>('table');
  const [somaticFilter, setSomaticFilter] = useState<'all' | 'normal' | 'somatic'>('all');

  // Edit fields
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    let unsubscribeProfiles: (() => void) | null = null;
    let unsubscribeBookings: (() => void) | null = null;
    const profilesMap: Record<string, any> = {};

    unsubscribeProfiles = onSnapshot(collection(db, 'profiles'), (snap) => {
      snap.docs.forEach((doc) => {
        const data = doc.data();
        profilesMap[doc.id] = data;
        if (data.email) {
          profilesMap[data.email.toLowerCase()] = data;
        }
      });
    });

    const q = query(collection(db, 'bookings'), orderBy('start_time', 'desc'), limit(50));
    unsubscribeBookings = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data();
        const p = profilesMap[data.user_id] || profilesMap[data.client_email?.toLowerCase()] || {};
        return {
          id: d.id,
          ...data,
          whatsapp: p.whatsapp || data.client_phone || null,
        } as unknown as BookingRow;
      });
      setBookings(rows);

      const revenue = rows.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0);
      setStats({
        revenue,
        confirmed: rows.filter((r) => r.status === 'confirmed').length,
        pending: rows.filter((r) => r.status === 'pending').length,
        clients: new Set(rows.map((r) => r.client_email)).size,
      });
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error('Could not load bookings.');
      setLoading(false);
    });

    return () => {
      if (unsubscribeProfiles) unsubscribeProfiles();
      if (unsubscribeBookings) unsubscribeBookings();
    };
  }, []);

  const updateStatus = async (b: BookingRow, status: string) => {
    try {
      const timeline = b.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status,
          timestamp: new Date().toISOString(),
          note: `Status updated to ${status} by admin`
        }
      ];
      await setDoc(doc(db, 'bookings', b.id), { 
        status, 
        status_timeline: updatedTimeline,
        updated_at: new Date().toISOString() 
      }, { merge: true });
      toast.success(`Booking status changed to ${status}.`);
      if (selectedBooking?.id === b.id) {
        setSelectedBooking({ ...selectedBooking, status, status_timeline: updatedTimeline });
      }
    } catch (error) {
      toast.error('Could not update status.');
    }
  };

  const updatePaymentStatus = async (b: BookingRow, payment_status: string) => {
    try {
      const history = b.payment_history || [];
      const updatedHistory = [
        ...history,
        {
          payment_status,
          timestamp: new Date().toISOString(),
          amount: b.amount,
          currency: b.currency,
        }
      ];
      await setDoc(doc(db, 'bookings', b.id), { 
        payment_status, 
        payment_history: updatedHistory,
        updated_at: new Date().toISOString() 
      }, { merge: true });
      toast.success(`Payment status changed to ${payment_status}.`);
      if (selectedBooking?.id === b.id) {
        setSelectedBooking({ ...selectedBooking, payment_status, payment_history: updatedHistory });
      }
    } catch (error) {
      toast.error('Could not update payment status.');
    }
  };

  const handleOpenDetails = (b: BookingRow) => {
    setSelectedBooking(b);
    setInternalNotes(b.internal_notes || '');
    if (b.start_time) {
      const dt = new Date(b.start_time);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      setEditDate(`${yyyy}-${mm}-${dd}`);
      setEditTime(dt.toTimeString().slice(0, 5));
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!selectedBooking) return;
    try {
      await setDoc(doc(db, 'bookings', selectedBooking.id), {
        internal_notes: internalNotes,
        updated_at: new Date().toISOString()
      }, { merge: true });
      toast.success('Internal notes saved successfully!');
    } catch (e) {
      toast.error('Failed to save notes.');
    }
  };

  const handleUpdateDateTime = async () => {
    if (!selectedBooking || !editDate || !editTime) return;
    try {
      const newStart = new Date(`${editDate}T${editTime}`);
      if (isNaN(newStart.getTime())) {
        toast.error('Invalid date or time.');
        return;
      }
      
      const duration = (new Date(selectedBooking.end_time).getTime() - new Date(selectedBooking.start_time).getTime());
      const newEnd = new Date(newStart.getTime() + duration);

      const timeline = selectedBooking.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status: selectedBooking.status,
          timestamp: new Date().toISOString(),
          note: `Session rescheduled to ${newStart.toLocaleString()} by admin`
        }
      ];

      const updates = selectedBooking.admin_updates || [];
      const newUpdates = [
        ...updates,
        {
          field: 'session_time',
          old_value: selectedBooking.start_time,
          new_value: newStart.toISOString(),
          timestamp: new Date().toISOString()
        }
      ];

      await setDoc(doc(db, 'bookings', selectedBooking.id), {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        status_timeline: updatedTimeline,
        admin_updates: newUpdates,
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast.success('Session time updated successfully!');
      setSelectedBooking(null);
    } catch (e) {
      toast.error('Failed to update session time.');
    }
  };

  const handleAcceptReschedule = async () => {
    if (!selectedBooking || !selectedBooking.reschedule_request) return;
    try {
      const req = selectedBooking.reschedule_request;
      const timeline = selectedBooking.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status: selectedBooking.status,
          timestamp: new Date().toISOString(),
          note: `Reschedule request accepted. Session rescheduled to ${new Date(req.proposed_start_time).toLocaleString()}`
        }
      ];

      await setDoc(doc(db, 'bookings', selectedBooking.id), {
        start_time: req.proposed_start_time,
        end_time: req.proposed_end_time,
        reschedule_request: {
          ...req,
          status: 'approved'
        },
        status_timeline: updatedTimeline,
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast.success('Reschedule request accepted!');
      setSelectedBooking(null);
    } catch (e) {
      toast.error('Failed to accept reschedule.');
    }
  };

  const handleRejectReschedule = async () => {
    if (!selectedBooking || !selectedBooking.reschedule_request) return;
    try {
      const req = selectedBooking.reschedule_request;
      const timeline = selectedBooking.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status: selectedBooking.status,
          timestamp: new Date().toISOString(),
          note: `Reschedule request rejected by admin.`
        }
      ];

      await setDoc(doc(db, 'bookings', selectedBooking.id), {
        reschedule_request: {
          ...req,
          status: 'rejected'
        },
        status_timeline: updatedTimeline,
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast.success('Reschedule request rejected.');
      setSelectedBooking(null);
    } catch (e) {
      toast.error('Failed to reject reschedule.');
    }
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-border/40 mb-6">
          <h2 className="font-display text-xl font-medium text-foreground">Recent Bookings</h2>
          <div className="flex rounded-full bg-secondary/80 p-1">
            <button
              onClick={() => setActiveTab('table')}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                activeTab === 'table' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              List View
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                activeTab === 'calendar' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Calendar View
            </button>
          </div>

          {/* Somatic / General Filter */}
          <div className="flex bg-muted/60 p-1 rounded-full border border-border/40 inline-flex items-center gap-1">
            <button
              onClick={() => setSomaticFilter('all')}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                somaticFilter === 'all' ? "bg-gold text-gold-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSomaticFilter('normal')}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                somaticFilter === 'normal' ? "bg-gold text-gold-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              General
            </button>
            <button
              onClick={() => setSomaticFilter('somatic')}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                somaticFilter === 'somatic' ? "bg-gold text-gold-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Somatic Special
            </button>
          </div>
        </div>

        {activeTab === 'calendar' ? (
          <AdminCalendarView onSelectBooking={handleOpenDetails} />
        ) : loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Client Details</th>
                  <th className="pb-3 pr-4">Session Info</th>
                  <th className="pb-3 pr-4">Time Slot</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings
                  .filter((b) =>
                    somaticFilter === 'all'
                      ? true
                      : somaticFilter === 'somatic'
                      ? b.is_somatic_plan === true
                      : b.is_somatic_plan !== true
                  )
                  .map((b) => (
                  <tr key={b.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-foreground">{b.client_name}</p>
                      <p className="text-xs text-muted-foreground">{b.client_email}</p>
                      {b.whatsapp && <p className="text-[10px] text-emerald-400 mt-0.5 font-mono">WhatsApp: {b.whatsapp}</p>}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-foreground font-medium">{b.service_title || 'Therapy Session'}</p>
                        {b.is_somatic_plan && (
                          <span className="inline-flex bg-gold/10 text-gold border border-gold/20 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                            Somatic Plan
                          </span>
                        )}
                      </div>
                      {b.subcategory && <p className="text-xs text-muted-foreground">{b.category} &gt; {b.subcategory}</p>}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      <p className="text-foreground text-xs">{formatInTz(b.start_time, 'Asia/Kolkata', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Mode: {b.mode}</p>
                    </td>
                    <td className="py-4 pr-4 font-semibold text-foreground">
                      {b.amount ? `₹${b.amount}` : '—'}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border', 
                        b.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-warning/10 text-warning border-warning/20'
                      )}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border', 
                        statusColor(b.status)
                      )}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(b)}
                          className="rounded-full bg-secondary hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Management Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl overflow-y-auto max-h-[90vh] rounded-3xl border border-white/10 bg-card p-6 sm:p-8 shadow-glow text-left">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-border/40 pb-4 mb-6">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">Booking Management</span>
              <h3 className="font-display text-2xl text-foreground font-medium mt-1">{selectedBooking.service_title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Booking ID: {selectedBooking.id}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Client Info</h4>
                  <p className="font-medium text-foreground mt-1">{selectedBooking.client_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedBooking.client_email}</p>
                  <p className="text-xs text-muted-foreground">Phone: {selectedBooking.client_phone || '—'}</p>
                  <p className="text-xs text-emerald-400">WhatsApp: {selectedBooking.whatsapp || '—'}</p>
                </div>

                {selectedBooking.category && (
                  <div>
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Questionnaire Area</h4>
                    <p className="text-xs text-foreground mt-1 capitalize"><span className="font-semibold text-muted-foreground">Category:</span> {selectedBooking.category}</p>
                    <p className="text-xs text-foreground mt-0.5"><span className="font-semibold text-muted-foreground">Subcategory:</span> {selectedBooking.subcategory}</p>
                    {selectedBooking.problems && selectedBooking.problems.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs font-semibold text-muted-foreground">Problems:</span>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5 mt-0.5">
                          {selectedBooking.problems.map((p) => <li key={p}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {selectedBooking.summary && (
                  <div>
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">AI Somatic Summary</h4>
                    <p className="text-xs text-muted-foreground italic leading-relaxed mt-1">&ldquo;{selectedBooking.summary}&rdquo;</p>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Client Notes</h4>
                    <p className="text-xs text-muted-foreground mt-1">{selectedBooking.notes}</p>
                  </div>
                )}
                <BookingTimelineVisualizer timeline={selectedBooking.status_timeline} />
              </div>

              {/* Right Column: Actions & Reschedule */}
              <div className="space-y-6">
                {/* Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Booking Action Controls</h4>

                  {selectedBooking.reschedule_request?.status === 'pending' && (
                    <div className="p-3.5 rounded-2xl bg-warning/10 border border-warning/20 space-y-2 text-left mb-4">
                      <p className="text-xs font-semibold text-warning">Client Reschedule Request:</p>
                      <p className="text-xs text-foreground">
                        Proposed Slot: {new Date(selectedBooking.reschedule_request.proposed_start_time).toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={handleAcceptReschedule} size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-[10px]">
                          Accept
                        </Button>
                        <Button onClick={handleRejectReschedule} size="sm" variant="destructive" className="rounded-full h-7 px-3 text-[10px]">
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedBooking.status !== 'confirmed' && (
                      <Button onClick={() => updateStatus(selectedBooking, 'confirmed')} size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        Approve (Confirm)
                      </Button>
                    )}
                    {selectedBooking.status !== 'completed' && selectedBooking.status === 'confirmed' && (
                      <Button onClick={() => updateStatus(selectedBooking, 'completed')} size="sm" className="rounded-full bg-primary hover:bg-primary/95 text-white">
                        Complete Session
                      </Button>
                    )}
                    {selectedBooking.status !== 'rejected' && selectedBooking.status === 'pending' && (
                      <Button onClick={() => updateStatus(selectedBooking, 'rejected')} size="sm" variant="destructive" className="rounded-full">
                        Reject
                      </Button>
                    )}
                    {selectedBooking.status !== 'cancelled' && (
                      <Button onClick={() => updateStatus(selectedBooking, 'cancelled')} size="sm" variant="outline" className="rounded-full border-destructive/50 text-destructive hover:bg-destructive/10">
                        Cancel Booking
                      </Button>
                    )}
                  </div>

                  {/* Payment Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedBooking.payment_status !== 'paid' ? (
                      <Button onClick={() => updatePaymentStatus(selectedBooking, 'paid')} size="sm" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground">
                        Mark as Paid
                      </Button>
                    ) : (
                      <>
                        <Button onClick={() => updatePaymentStatus(selectedBooking, 'unpaid')} size="sm" variant="outline" className="rounded-full">
                          Mark as Unpaid (Pending)
                        </Button>
                        <Button
                          onClick={async () => {
                            const amt = prompt('Enter refund amount (number only):', String(selectedBooking.amount));
                            if (!amt) return;
                            const note = prompt('Enter refund note/reason:');
                            const confirmOk = confirm(`Confirm refund of ${amt}?`);
                            if (!confirmOk) return;

                            try {
                              const res = await fetch('/api/bookings/refund', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  booking_id: selectedBooking.id,
                                  refund_type: parseFloat(amt) === selectedBooking.amount ? 'full' : 'partial',
                                  amount: parseFloat(amt),
                                  note,
                                }),
                              });
                              const result = await res.json();
                              if (res.ok) {
                                toast.success('Refund completed successfully!');
                                setSelectedBooking(null);
                              } else {
                                toast.error(result.error || 'Refund failed.');
                              }
                            } catch {
                              toast.error('Failed to contact refund API.');
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="rounded-full border-amber-600/50 text-amber-500 hover:bg-amber-600/10"
                        >
                          Issue Refund
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reschedule */}
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1">
                    <Edit className="h-3.5 w-3.5" />
                    <span>Reschedule Session</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="resched-date" className="text-[10px]">Date</Label>
                      <Input
                        id="resched-date"
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="rounded-xl mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resched-time" className="text-[10px]">Time</Label>
                      <Input
                        id="resched-time"
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="rounded-xl mt-1 text-xs"
                      />
                    </div>
                  </div>
                  <Button onClick={handleUpdateDateTime} size="sm" className="w-full rounded-full mt-1">
                    Save New Date &amp; Time
                  </Button>
                </div>

                {/* Internal Notes */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label htmlFor="internal-notes" className="text-xs font-semibold text-gold uppercase tracking-wider">Internal Admin Notes</Label>
                  <Textarea
                    id="internal-notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add private internal notes here..."
                    className="rounded-xl text-xs mt-1"
                    rows={3}
                  />
                  <Button onClick={handleSaveInternalNotes} size="sm" variant="outline" className="w-full rounded-full">
                    Save Internal Notes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusColor(s: string): string {
  return ({
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    completed: 'bg-primary/10 text-primary border-primary/20',
  } as Record<string, string>)[s] || 'bg-secondary text-muted-foreground border-border/30';
}

function BookingTimelineVisualizer({ timeline }: { timeline?: Array<{ status: string; timestamp: string; updated_by?: string; note?: string }> }) {
  if (!timeline || timeline.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
      <p className="text-[10px] text-gold uppercase tracking-wider font-semibold">Booking Progress History</p>
      <div className="relative border-l border-gold/30 pl-4 ml-2 space-y-3">
        {timeline.map((step, idx) => {
          const dt = new Date(step.timestamp);
          return (
            <div key={idx} className="relative text-left">
              <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gold border border-card shadow-soft" />
              <div>
                <p className="text-xs font-semibold text-foreground capitalize">{step.status}</p>
                <p className="text-[10px] text-muted-foreground">
                  {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                  {step.updated_by ? `· Updated by ${step.updated_by}` : ''}
                </p>
                {step.note && <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">&ldquo;{step.note}&rdquo;</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
