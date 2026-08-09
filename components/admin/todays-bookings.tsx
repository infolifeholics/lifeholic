'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { formatInTz } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, X, Eye, Phone, Mail, Clock, Calendar, Search, Filter } from 'lucide-react';

type BookingRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  start_time: string;
  end_time: string;
  mode: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  notes: string | null;
  service_title: string;
  created_at?: string;
  internal_notes?: string | null;
  status_timeline?: Array<{ status: string; timestamp: string; note: string }>;
  reschedule_request?: { requested_by: string; proposed_start_time: string; proposed_end_time: string; status: string; timestamp: string } | null;
  healer_id?: string | null;
  healer_name?: string | null;
  is_somatic_plan?: boolean | null;
  somatic_plan_name?: string | null;
  service_id?: string | null;
  user_id?: string | null;
  session_number?: number | null;
};

export function AdminTodaysBookings() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [internalNotes, setInternalNotes] = useState('');

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healers, setHealers] = useState<any[]>([]);
  const [healerFilter, setHealerFilter] = useState('all');
  const [packages, setPackages] = useState<any[]>([]);
  
  // Default target date is today's date in IST (YYYY-MM-DD)
  const todayIstStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  
  const [startDate, setStartDate] = useState(todayIstStr);
  const [endDate, setEndDate] = useState(todayIstStr);

  useEffect(() => {
    getDocs(collection(db, 'healers')).then((snap: any) => {
      setHealers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('start_time', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as BookingRow[];
      setBookings(rows);
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error('Could not load bookings.');
      setLoading(false);
    });

    const unsubscribePackages = onSnapshot(collection(db, 'somatic_packages'), (snap) => {
      setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribePackages();
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const b = bookings.find(item => item.id === id);
      const { writeAuditLog } = await import('@/lib/booking-utils');
      await writeAuditLog(
        newStatus === 'cancelled' || newStatus === 'rejected' ? 'Booking Cancelled' : 'Booking Status Changed',
        'Admin',
        { bookingId: id, clientName: b?.client_name, status: newStatus }
      );

      const timeline = b?.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: `Status updated to ${newStatus} by admin`
        }
      ];

      await setDoc(doc(db, 'bookings', id), {
        status: newStatus,
        status_timeline: updatedTimeline,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // If booking belongs to a package, update package counters
      if (b && b.user_id) {
        try {
          const { getDocs, query, collection, where, getDoc } = await import('firebase/firestore');
          let packageRef = null;
          let pkgSnap = null;
          
          if (b.is_somatic_plan) {
            const docRef = doc(db, 'somatic_packages', b.user_id);
            const snap = await getDoc(docRef);
            if (snap.exists() && (snap.data().is_somatic_plan || snap.data().package_type === 'somatic_plan' || !snap.data().package_type)) {
              packageRef = docRef;
              pkgSnap = snap;
            }
          }
          
          if (!packageRef) {
            const q = query(
              collection(db, 'somatic_packages'),
              where('user_id', '==', b.user_id)
            );
            const snaps = await getDocs(q);
            for (const d of snaps.docs) {
              const data = d.data();
              if (b.is_somatic_plan && (data.package_type === 'somatic_plan' || data.is_somatic_plan || !data.package_type)) {
                packageRef = d.ref;
                pkgSnap = d;
                break;
              } else if (!b.is_somatic_plan && data.service_id === b.service_id) {
                packageRef = d.ref;
                pkgSnap = d;
                break;
              }
            }
          }

          if (packageRef && pkgSnap && pkgSnap.exists()) {
            const pkgData = pkgSnap.data();
            const totalSess = pkgData.total_sessions || 4;
            
            let bookingIds = pkgData.booking_ids || [];
            if (newStatus === 'cancelled' || newStatus === 'rejected') {
              bookingIds = bookingIds.filter((bid: string) => bid !== b.id);
            }
            const totalBooked = bookingIds.length;
            
            let completedCount = pkgData.completed_sessions || 0;
            if (newStatus === 'completed') {
              completedCount = Math.min(totalSess, completedCount + 1);
            } else if (b.status === 'completed' && newStatus !== 'completed') {
              completedCount = Math.max(0, completedCount - 1);
            }
            
            const pkgStatus = completedCount >= totalSess ? 'completed' : pkgData.status;

            await setDoc(packageRef, {
              booking_ids: bookingIds,
              completed_sessions: completedCount,
              remaining_sessions: Math.max(0, totalSess - totalBooked),
              status: pkgStatus,
              updated_at: new Date().toISOString()
            }, { merge: true });
          }
        } catch (err) {
          console.error('[Dashboard] Failed to sync package state:', err);
        }
      }

      if (b && (newStatus === 'cancelled' || newStatus === 'rejected')) {
        const { deleteDoc } = await import('firebase/firestore');
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
        const bookingStartObj = new Date(b.start_time);
        const dateStr = formatterDate.format(bookingStartObj);
        const timeStr = formatterTime.format(bookingStartObj);
        const lockDocRef = doc(db, 'session_locks', `${dateStr}_${timeStr.replace(':', '-')}`);
        await deleteDoc(lockDocRef).catch(() => {});
      }

      // Trigger notification email
      fetch('/api/bookings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, eventType: newStatus }),
      }).catch((err) => console.error('Failed to trigger notification:', err));

      if (newStatus === 'confirmed') {
        toast.success('Session approved');
      } else if (newStatus === 'cancelled') {
        toast.success('Session cancelled');
      } else if (newStatus === 'rejected') {
        toast.success('Session rejected');
      } else {
        toast.success(`Booking status changed to ${newStatus}.`);
      }
      if (selectedBooking?.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!selectedBooking) return;
    try {
      await setDoc(doc(db, 'bookings', selectedBooking.id), {
        internal_notes: internalNotes,
        updated_at: new Date().toISOString()
      }, { merge: true });
      toast.success('Internal notes saved.');
    } catch {
      toast.error('Failed to save notes.');
    }
  };

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      toast.error('No bookings to export.');
      return;
    }
    
    const headers = [
      'Booking ID',
      'Client Name',
      'Client Email',
      'Client Phone',
      'Service Title',
      'Start Time',
      'End Time',
      'Mode',
      'Status',
      'Payment Status',
      'Amount',
      'Currency',
      'Notes',
      'Created At'
    ];

    const rows = filteredBookings.map(b => [
      b.id,
      b.client_name,
      b.client_email,
      b.client_phone || '',
      b.service_title,
      b.start_time,
      b.end_time,
      b.mode,
      b.status,
      b.payment_status,
      b.amount,
      b.currency,
      (b.notes || '').replace(/"/g, '""'),
      b.created_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Bookings exported to CSV successfully.');
  };

  const statusColors: Record<string, string> = {
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  // Perform local filtering
  const filteredBookings = bookings.filter((b) => {
    if (!b.start_time) return false;
    
    // 1. Date check against range
    try {
      const dateObj = new Date(b.start_time);
      const rDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj);
      if (rDateStr < startDate || rDateStr > endDate) return false;
    } catch {
      return false;
    }

    // 2. Status check
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;

    // 3. Search check
    if (search.trim()) {
      const queryText = search.toLowerCase();
      const name = (b.client_name || '').toLowerCase();
      const email = (b.client_email || '').toLowerCase();
      const phone = (b.client_phone || '').toLowerCase();
      if (!name.includes(queryText) && !email.includes(queryText) && !phone.includes(queryText)) {
        return false;
      }
    }

    // 4. Healer check
    if (healerFilter !== 'all' && b.healer_id !== healerFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/40 mb-6">
          <div>
            <h2 className="font-display text-xl font-medium text-foreground">Today&apos;s Bookings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Sessions scheduled from {startDate} to {endDate} in IST</p>
          </div>
          <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-foreground">
            {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
          </span>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
          {/* Start Date */}
          <div>
            <Label htmlFor="bookings-start-date" className="text-xs">Start Date</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="bookings-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <Label htmlFor="bookings-end-date" className="text-xs">End Date</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="bookings-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label htmlFor="bookings-status-filter" className="text-xs">Status Filter</Label>
            <div className="relative mt-1">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select
                id="bookings-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:ring-1 focus:ring-gold"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Healer Filter */}
          <div>
            <Label htmlFor="bookings-healer-filter" className="text-xs">Healer Filter</Label>
            <div className="relative mt-1">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select
                id="bookings-healer-filter"
                value={healerFilter}
                onChange={(e) => setHealerFilter(e.target.value)}
                className="w-full pl-9 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:ring-1 focus:ring-gold"
              >
                <option value="all">All Healers</option>
                {healers.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <Label htmlFor="bookings-search-input" className="text-xs">Search Member</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="bookings-search-input"
                placeholder="Name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-end">
            <Button
              onClick={handleExportCSV}
              className="w-full rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground font-semibold flex items-center gap-1.5 h-[38px] text-sm"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No bookings match the filters for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Member Info</th>
                  <th className="pb-3 pr-4">Contact Details</th>
                  <th className="pb-3 pr-4">Session & Time</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <td className="py-4 pr-4 font-medium text-foreground">
                      {b.client_name}
                    </td>
                    <td className="py-4 pr-4 text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {b.client_email}</div>
                      {b.client_phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.client_phone}</div>}
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-foreground">{b.service_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatInTz(b.start_time, 'Asia/Kolkata', { timeStyle: 'short' })} – {formatInTz(b.end_time, 'Asia/Kolkata', { timeStyle: 'short' })} (IST)
                      </p>
                      {(() => {
                        const pkg = packages.find(p => {
                          if (b.is_somatic_plan) {
                            return p.user_id === b.user_id && (p.package_type === 'somatic_plan' || p.is_somatic_plan || !p.package_type);
                          } else {
                            return p.user_id === b.user_id && p.service_id === b.service_id;
                          }
                        });
                        if (pkg) {
                          return (
                            <div className="mt-2 text-[10px] text-muted-foreground bg-gold/5 border border-gold/10 rounded-xl p-2 space-y-0.5 max-w-[220px]">
                              <p className="font-semibold text-gold">{pkg.package_name || (b.is_somatic_plan ? 'Somatic Program' : 'Service Package')}</p>
                              <p className="font-semibold text-foreground">30 Mins × {pkg.total_sessions} {pkg.total_sessions === 1 ? 'Session' : 'Sessions'}</p>
                              {b.session_number && <p className="font-bold text-foreground">Session {b.session_number} of {pkg.total_sessions}</p>}
                              <p>Completed: {pkg.completed_sessions || 0}</p>
                              <p>Remaining: {pkg.remaining_sessions || 0}</p>
                              <p>Valid Until: {new Date(pkg.expiry_date).toLocaleDateString()}</p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {b.healer_name && (
                        <p className="text-[10px] text-gold mt-1 font-semibold uppercase tracking-wider">
                          Healer: {b.healer_name}
                        </p>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border', statusColors[b.status] || 'bg-secondary text-muted-foreground border-border/30')}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        onClick={() => {
                          setSelectedBooking(b);
                          setInternalNotes(b.internal_notes || '');
                        }}
                        size="sm"
                        variant="secondary"
                        className="rounded-full gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg overflow-y-auto max-h-[90vh] rounded-3xl border border-white/10 bg-card p-6 shadow-glow text-left">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-border/40 pb-4 mb-6">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">Booking Detail View</span>
              <h3 className="font-display text-2xl text-foreground font-medium mt-1">{selectedBooking.service_title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Booking ID: {selectedBooking.id}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Member Name</h4>
                  <p className="font-medium text-foreground mt-1">{selectedBooking.client_name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Contact Details</h4>
                  <p className="text-xs text-foreground mt-1 flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /> {selectedBooking.client_email}</p>
                  {selectedBooking.client_phone && (
                    <p className="text-xs text-foreground mt-0.5 flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {selectedBooking.client_phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/20">
                <div>
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Session Date</h4>
                  <p className="text-xs text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatInTz(selectedBooking.start_time, 'Asia/Kolkata', { dateStyle: 'medium' })}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Session Time</h4>
                  <p className="text-xs text-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatInTz(selectedBooking.start_time, 'Asia/Kolkata', { timeStyle: 'short' })} – {formatInTz(selectedBooking.end_time, 'Asia/Kolkata', { timeStyle: 'short' })} (IST)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/20">
                <div>
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Booking Status</h4>
                  <div className="mt-1.5">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border', statusColors[selectedBooking.status] || 'bg-secondary text-muted-foreground border-border/30')}>
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
                {selectedBooking.created_at && (
                  <div>
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Booking Created Time</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedBooking.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border/20">
                <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Payment Details</h4>
                <p className="text-xs text-foreground mt-1">
                  Price: <span className="font-semibold text-foreground">{selectedBooking.currency} {selectedBooking.amount}</span> &middot; Payment Status: <span className="capitalize font-semibold text-foreground">{selectedBooking.payment_status}</span>
                </p>
              </div>

              {selectedBooking.notes && (
                <div className="pt-2 border-t border-border/20">
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider font-medium">User Notes</h4>
                  <p className="text-xs text-muted-foreground mt-1 p-2 rounded bg-secondary/30 border border-border/30">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Status Timeline */}
              {selectedBooking.status_timeline && selectedBooking.status_timeline.length > 0 && (
                <div className="pt-2 border-t border-border/20 space-y-2">
                  <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Status History</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {selectedBooking.status_timeline.map((entry, index) => (
                      <div key={index} className="flex gap-2 text-xs border-l-2 border-border/40 pl-2 ml-1">
                        <div className="flex-1">
                          <p className="font-semibold capitalize text-foreground">{entry.status} &bull; <span className="text-[10px] text-muted-foreground font-normal">{new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}</span></p>
                          {entry.note && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="pt-4 border-t border-border/20 space-y-2">
                <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Change Status</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBooking.status === 'completed' ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Session Completed
                    </span>
                  ) : selectedBooking.status === 'cancelled' ? (
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Session Cancelled
                    </span>
                  ) : selectedBooking.status === 'rejected' ? (
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Session Rejected
                    </span>
                  ) : (
                    <>
                      {selectedBooking.status !== 'confirmed' && (
                        <Button onClick={() => updateStatus(selectedBooking.id, 'confirmed')} size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                          Approve
                        </Button>
                      )}
                      {selectedBooking.status === 'confirmed' && (
                        <Button onClick={() => updateStatus(selectedBooking.id, 'completed')} size="sm" className="rounded-full bg-primary hover:bg-primary/95 text-white">
                          Complete
                        </Button>
                      )}
                      {selectedBooking.status === 'pending' && (
                        <Button onClick={() => updateStatus(selectedBooking.id, 'rejected')} size="sm" variant="destructive" className="rounded-full">
                          Reject
                        </Button>
                      )}
                      <Button onClick={() => updateStatus(selectedBooking.id, 'cancelled')} size="sm" variant="outline" className="rounded-full border-destructive/50 text-destructive hover:bg-destructive/10">
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="pt-4 border-t border-border/20 space-y-2">
                <Label htmlFor="todays-internal-notes" className="text-xs font-semibold text-gold uppercase tracking-wider">Internal Admin Notes</Label>
                <Textarea
                  id="todays-internal-notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private notes..."
                  className="rounded-xl text-xs mt-1"
                  rows={2}
                />
                <Button onClick={handleSaveInternalNotes} size="sm" variant="outline" className="w-full rounded-full">
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
