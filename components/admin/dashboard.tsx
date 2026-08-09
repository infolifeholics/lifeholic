'use client';

import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, DollarSign, Users, XCircle, Loader2, X, Plus, Edit, Download } from 'lucide-react';
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
  client_country?: string | null;
  healer_id?: string | null;
  healer_name?: string | null;
  user_id?: string | null;
  service_id?: string | null;
  session_number?: number | null;
};

export function AdminDashboard({ onNavigateSection }: { onNavigateSection?: (section: any) => void } = {}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    confirmed: 0,
    pending: 0,
    clients: 0,
    todaysBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    activeSlots: 0,
    registeredMembers: 0
  });
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'calendar'>('table');
  const [somaticFilter, setSomaticFilter] = useState<'all' | 'normal' | 'somatic'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [healers, setHealers] = useState<any[]>([]);
  const [healerFilter, setHealerFilter] = useState<string>('all');
  const [packages, setPackages] = useState<any[]>([]);

  // Revenue Modal & Date Filters State
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [revStartDate, setRevStartDate] = useState('');
  const [revEndDate, setRevEndDate] = useState('');

  const exportToCSV = () => {
    try {
      const filtered = bookings.filter((b) =>
        somaticFilter === 'all'
          ? true
          : somaticFilter === 'somatic'
          ? b.is_somatic_plan === true
          : b.is_somatic_plan !== true
      );

      const headers = ['Booking ID', 'Member Name', 'Email', 'Phone', 'Session Date', 'Session Time', 'Booking Status', 'Created At'];
      const rows = filtered.map((b) => {
        const dateObj = new Date(b.start_time);
        const dateStr = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        const timeStr = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
        return [
          b.id,
          `"${b.client_name.replace(/"/g, '""')}"`,
          b.client_email,
          b.client_phone || 'N/A',
          dateStr,
          timeStr,
          b.status,
          b.created_at || 'N/A'
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Bookings exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV');
    }
  };

  // Edit fields
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'healers')).then((snap) => {
      setHealers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let unsubscribeProfiles: (() => void) | null = null;
    let unsubscribeBookings: (() => void) | null = null;
    let unsubscribeSlots: (() => void) | null = null;
    let unsubscribePackages: (() => void) | null = null;
    const profilesMap: Record<string, any> = {};
    let membersCount = 0;
    let slotsCount = 0;

    const updateAllStats = (bookingRows: BookingRow[]) => {
      const revenue = bookingRows.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0);
      const todayIstStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const nowTime = Date.now();

      const todaysBookingsCount = bookingRows.filter((r) => {
        if (!r.start_time) return false;
        try {
          const dateObj = new Date(r.start_time);
          const rDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(dateObj);
          return rDateStr === todayIstStr;
        } catch {
          return false;
        }
      }).length;

      const upcomingBookingsCount = bookingRows.filter((r) => {
        return (r.status === 'confirmed' || r.status === 'pending') && new Date(r.start_time).getTime() > nowTime;
      }).length;

      const completedBookingsCount = bookingRows.filter((r) => r.status === 'completed').length;
      const cancelledBookingsCount = bookingRows.filter((r) => r.status === 'cancelled' || r.status === 'rejected').length;

      setStats({
        revenue,
        confirmed: bookingRows.filter((r) => r.status === 'confirmed').length,
        pending: bookingRows.filter((r) => r.status === 'pending').length,
        clients: new Set(bookingRows.map((r) => r.client_email)).size,
        todaysBookings: todaysBookingsCount,
        upcomingBookings: upcomingBookingsCount,
        completedBookings: completedBookingsCount,
        cancelledBookings: cancelledBookingsCount,
        activeSlots: slotsCount,
        registeredMembers: membersCount
      });
    };

    unsubscribeProfiles = onSnapshot(collection(db, 'profiles'), (snap) => {
      membersCount = snap.size;
      snap.docs.forEach((doc) => {
        const data = doc.data();
        profilesMap[doc.id] = data;
        if (data.email) {
          profilesMap[data.email.toLowerCase()] = data;
        }
      });
      setBookings((prev) => {
        updateAllStats(prev);
        return prev;
      });
    });

    unsubscribeSlots = onSnapshot(collection(db, 'session_slots'), (snap) => {
      slotsCount = snap.docs.filter(d => d.data().active === true).length;
      setBookings((prev) => {
        updateAllStats(prev);
        return prev;
      });
    });

    unsubscribePackages = onSnapshot(collection(db, 'somatic_packages'), (snap) => {
      setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const q = query(collection(db, 'bookings'), orderBy('start_time', 'desc'));
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
      updateAllStats(rows);
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error('Could not load bookings.');
      setLoading(false);
    });

    return () => {
      if (unsubscribeProfiles) unsubscribeProfiles();
      if (unsubscribeBookings) unsubscribeBookings();
      if (unsubscribeSlots) unsubscribeSlots();
      if (unsubscribePackages) unsubscribePackages();
    };
  }, []);

  const updateStatus = async (b: BookingRow, status: string) => {
    try {
      const { writeAuditLog } = await import('@/lib/booking-utils');
      await writeAuditLog(
        status === 'cancelled' || status === 'rejected' ? 'Booking Cancelled' : 'Booking Status Changed',
        'Admin',
        { bookingId: b.id, clientName: b.client_name, status }
      );

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

      // If booking belongs to a package, update package counters
      if (b.user_id) {
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
            if (status === 'cancelled' || status === 'rejected') {
              bookingIds = bookingIds.filter((id: string) => id !== b.id);
            }
            const totalBooked = bookingIds.length;
            
            let completedCount = pkgData.completed_sessions || 0;
            if (status === 'completed') {
              completedCount = Math.min(totalSess, completedCount + 1);
            } else if (b.status === 'completed' && status !== 'completed') {
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

      if (status === 'cancelled' || status === 'rejected') {
        const { deleteDoc } = await import('firebase/firestore');
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
        const bookingStartObj = new Date(b.start_time);
        const dateStr = formatterDate.format(bookingStartObj);
        const timeStr = formatterTime.format(bookingStartObj);
        const lockDocRef = doc(db, 'session_locks', `${dateStr}_${timeStr.replace(':', '-')}`);
        await deleteDoc(lockDocRef).catch(() => {});
      }

      // Trigger server-side notification
      fetch('/api/bookings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, eventType: status }),
      }).catch((err) => console.error('Failed to trigger notification:', err));

      if (status === 'confirmed') {
        toast.success('Session approved');
      } else if (status === 'cancelled') {
        toast.success('Session cancelled');
      } else if (status === 'rejected') {
        toast.success('Session rejected');
      } else {
        toast.success(`Booking status changed to ${status}.`);
      }
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
      toast.success('Payment status updated');
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

      // Trigger server-side notification for reschedule
      fetch('/api/bookings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id, eventType: 'meeting_updated' }),
      }).catch((err) => console.error('Failed to trigger reschedule notification:', err));

      toast.success('Session rescheduled');
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

      toast.success('Session rescheduled');
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
          { label: 'Revenue (paid)', value: stats.revenue, prefix: '₹', icon: DollarSign, clickable: true },
          { label: "Today's Bookings", value: stats.todaysBookings, icon: Calendar, clickable: true, onClickSection: 'todays_bookings' },
          { label: 'Upcoming Bookings', value: stats.upcomingBookings, icon: Clock, clickable: true, onClickStatus: 'upcoming' },
          { label: 'Completed Sessions', value: stats.completedBookings, icon: CheckCircle2, clickable: true, onClickStatus: 'completed' },
          { label: 'Cancelled Sessions', value: stats.cancelledBookings, icon: XCircle, clickable: true, onClickStatus: 'cancelled' },
          { label: 'Active Slots', value: stats.activeSlots, icon: Clock, clickable: true, onClickSection: 'slots_management' },
          { label: 'Registered Members', value: stats.registeredMembers, icon: Users, clickable: true, onClickSection: 'members' },
          { label: 'Total Clients', value: stats.clients, icon: Users, clickable: true, onClickSection: 'members' },
        ].map((s) => (
          <div
            key={s.label}
            onClick={() => {
              if (s.label === 'Revenue (paid)') {
                setIsRevenueModalOpen(true);
              } else if (s.onClickSection) {
                onNavigateSection?.(s.onClickSection);
              } else if (s.onClickStatus) {
                setStatusFilter(s.onClickStatus as any);
                setActiveTab('table');
                const target = document.getElementById('bookings-list-section');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
            className={cn(
              "rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft",
              s.clickable && "cursor-pointer hover:bg-card/80 transition-all border-gold/30 hover:border-gold/60"
            )}
          >
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

      <div id="bookings-list-section" className="mt-10 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-border/40 mb-6">
          <h2 className="font-display text-xl font-medium text-foreground flex items-center gap-2">
            Recent Bookings
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase bg-gold/15 text-gold border border-gold/30 px-2.5 py-0.5 rounded-full">
                Filtered: {statusFilter}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 rounded-full hover:bg-gold/20 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </h2>
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

          {/* Export Bookings Button */}
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 h-8 text-xs border-gold text-gold hover:bg-gold/10 ml-auto mr-2"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

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

          {/* Healer Filter */}
          <div className="flex bg-muted/60 p-1 rounded-full border border-border/40 inline-flex items-center gap-1.5 px-3 h-8">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Healer:</span>
            <select
              value={healerFilter}
              onChange={(e) => setHealerFilter(e.target.value)}
              className="bg-transparent text-xs text-foreground font-semibold outline-none cursor-pointer border-none pr-1 focus:ring-0"
            >
              <option value="all" className="bg-card text-foreground">All Healers</option>
              {healers.map((h) => (
                <option key={h.id} value={h.id} className="bg-card text-foreground">{h.name}</option>
              ))}
            </select>
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
                {(() => {
                  const filtered = bookings.filter((b) => {
                    const matchesSomatic = somaticFilter === 'all'
                      ? true
                      : somaticFilter === 'somatic'
                      ? b.is_somatic_plan === true
                      : b.is_somatic_plan !== true;

                    const matchesStatus = statusFilter === 'all'
                      ? true
                      : statusFilter === 'completed'
                      ? b.status === 'completed'
                      : statusFilter === 'cancelled'
                      ? b.status === 'cancelled' || b.status === 'rejected'
                      : b.status === 'confirmed' || b.status === 'pending';

                    const matchesHealer = healerFilter === 'all' || b.healer_id === healerFilter;

                    return matchesSomatic && matchesStatus && matchesHealer;
                  });

                  // Group by unique client_email
                  const groupedMap: Record<string, typeof filtered> = {};
                  filtered.forEach(b => {
                    const email = b.client_email?.toLowerCase() || 'no-email';
                    if (!groupedMap[email]) {
                      groupedMap[email] = [];
                    }
                    groupedMap[email].push(b);
                  });

                  return Object.entries(groupedMap).map(([email, memberBookings]) => {
                    const b = memberBookings[0]; // Primary representative row
                    const totalSessions = memberBookings.length;

                    return (
                      <tr key={email} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{b.client_name}</p>
                            {totalSessions > 1 && (
                              <span className="inline-flex bg-primary/20 text-gold border border-gold/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {totalSessions} Bookings
                              </span>
                            )}
                          </div>
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
                                <div className="mt-2 text-[10px] text-muted-foreground bg-gold/5 border border-gold/10 rounded-xl p-2 space-y-0.5">
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
                        <td className="py-4 pr-4 text-muted-foreground">
                          <p className="text-foreground text-xs">{formatInTz(b.start_time, 'Asia/Kolkata', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Mode: {b.mode === 'offline' ? 'online' : b.mode}</p>
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
                    );
                  });
                })()}
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

                {/* Group Member Bookings switcher inside details modal */}
                {(() => {
                  const clientB = bookings.filter(item => item.client_email?.toLowerCase() === selectedBooking.client_email?.toLowerCase());
                  if (clientB.length <= 1) return null;
                  return (
                    <div className="pt-3 border-t border-border/20 space-y-2">
                      <h4 className="text-xs font-semibold text-gold uppercase tracking-wider">Other Sessions from Client ({clientB.length})</h4>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {clientB.map((item, index) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedBooking(item);
                              setInternalNotes(item.internal_notes || '');
                              if (item.start_time) {
                                const dt = new Date(item.start_time);
                                setEditDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
                                setEditTime(dt.toTimeString().slice(0, 5));
                              }
                            }}
                            className={cn(
                              "text-[10px] font-semibold px-2 py-1 rounded-full border transition-all",
                              item.id === selectedBooking.id
                                ? "bg-gold text-gold-foreground border-gold"
                                : "bg-secondary text-muted-foreground border-border/40 hover:text-foreground"
                            )}
                          >
                            #{index + 1} · {new Date(item.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} ({item.status})
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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
                  
                  <div className="flex flex-wrap gap-2 pt-1">
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
                          <Button onClick={() => updateStatus(selectedBooking, 'confirmed')} size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                            Approve (Confirm)
                          </Button>
                        )}
                        {selectedBooking.status === 'confirmed' && (
                          <Button onClick={() => updateStatus(selectedBooking, 'completed')} size="sm" className="rounded-full bg-primary hover:bg-primary/95 text-white">
                            Complete Session
                          </Button>
                        )}
                        {selectedBooking.status === 'pending' && (
                          <Button onClick={() => updateStatus(selectedBooking, 'rejected')} size="sm" variant="destructive" className="rounded-full">
                            Reject
                          </Button>
                        )}
                        <Button onClick={() => updateStatus(selectedBooking, 'cancelled')} size="sm" variant="outline" className="rounded-full border-destructive/50 text-destructive hover:bg-destructive/10">
                          Cancel Booking
                        </Button>
                      </>
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

      {/* REVENUE DETAILED ANALYTICS MODAL */}
      {isRevenueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-card p-6 sm:p-8 shadow-glow flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsRevenueModalOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-border/40 pb-4">
              <h3 className="font-display text-xl font-medium text-foreground">Income Analytics &amp; Revenue Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-1">Track international currency payments, client geocoding country, and calculate earnings over selected dates.</p>
            </div>

            {/* Date Filters & Currency Totals */}
            <div className="grid gap-4 md:grid-cols-2 mt-4 pb-4 border-b border-border/40">
              <div className="flex gap-2 items-center">
                <div>
                  <Label htmlFor="rev-start" className="text-[10px] uppercase tracking-wider text-muted-foreground">Start Date</Label>
                  <Input
                    id="rev-start"
                    type="date"
                    value={revStartDate}
                    onChange={(e) => setRevStartDate(e.target.value)}
                    className="h-8 rounded-lg text-xs mt-1 bg-secondary/30"
                  />
                </div>
                <div className="text-muted-foreground pt-5 px-1">to</div>
                <div>
                  <Label htmlFor="rev-end" className="text-[10px] uppercase tracking-wider text-muted-foreground">End Date</Label>
                  <Input
                    id="rev-end"
                    type="date"
                    value={revEndDate}
                    onChange={(e) => setRevEndDate(e.target.value)}
                    className="h-8 rounded-lg text-xs mt-1 bg-secondary/30"
                  />
                </div>
                <div className="pt-5">
                  <Button
                    onClick={() => {
                      setRevStartDate('');
                      setRevEndDate('');
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-lg hover:bg-white/5"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Aggregated Totals */}
              <div className="flex flex-wrap gap-3 items-center justify-end">
                <div className="bg-secondary/40 border border-border/40 rounded-xl px-4 py-2 text-right">
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Filtered Revenue</span>
                  <div className="flex gap-2 items-center flex-wrap justify-end mt-0.5">
                    {Object.keys(
                      bookings
                        .filter((b) => {
                          if (b.payment_status !== 'paid') return false;
                          const bDate = b.start_time.split('T')[0];
                          if (revStartDate && bDate < revStartDate) return false;
                          if (revEndDate && bDate > revEndDate) return false;
                          return true;
                        })
                        .reduce((acc: Record<string, number>, b) => {
                          const cur = b.currency || 'INR';
                          acc[cur] = (acc[cur] || 0) + Number(b.amount || 0);
                          return acc;
                        }, {})
                    ).length === 0 ? (
                      <span className="text-sm font-bold text-foreground">₹0</span>
                    ) : (
                      Object.entries(
                        bookings
                          .filter((b) => {
                            if (b.payment_status !== 'paid') return false;
                            const bDate = b.start_time.split('T')[0];
                            if (revStartDate && bDate < revStartDate) return false;
                            if (revEndDate && bDate > revEndDate) return false;
                            return true;
                          })
                          .reduce((acc: Record<string, number>, b) => {
                            const cur = b.currency || 'INR';
                            acc[cur] = (acc[cur] || 0) + Number(b.amount || 0);
                            return acc;
                          }, {})
                      ).map(([cur, total]) => (
                        <span key={cur} className="text-sm font-bold text-gold">
                          {cur === 'INR' ? '₹' : cur + ' '}{total}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar pr-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-2">Member</th>
                    <th className="pb-2 pr-2">Email</th>
                    <th className="pb-2 pr-2">Country</th>
                    <th className="pb-2 pr-2">Session Date</th>
                    <th className="pb-2 pr-2">Paid Amount</th>
                    <th className="pb-2 text-right">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter((b) => {
                      if (b.payment_status !== 'paid') return false;
                      const bDate = b.start_time.split('T')[0];
                      if (revStartDate && bDate < revStartDate) return false;
                      if (revEndDate && bDate > revEndDate) return false;
                      return true;
                    })
                    .map((b) => {
                      const dateObj = new Date(b.start_time);
                      const formattedDate = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
                      return (
                        <tr key={b.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                          <td className="py-2.5 pr-2 font-medium text-foreground">{b.client_name}</td>
                          <td className="py-2.5 pr-2 text-muted-foreground">{b.client_email}</td>
                          <td className="py-2.5 pr-2">
                            <span className="px-1.5 py-0.5 rounded bg-secondary text-[9px] font-bold tracking-wide uppercase border border-border/40">
                              {b.client_country || 'IN'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2 text-muted-foreground">{formattedDate}</td>
                          <td className="py-2.5 pr-2 font-semibold text-foreground">{b.amount}</td>
                          <td className="py-2.5 text-right font-bold text-gold">{b.currency || 'INR'}</td>
                        </tr>
                      );
                    })}
                  {bookings.filter((b) => {
                    if (b.payment_status !== 'paid') return false;
                    const bDate = b.start_time.split('T')[0];
                    if (revStartDate && bDate < revStartDate) return false;
                    if (revEndDate && bDate > revEndDate) return false;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">No payments found in selected date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border/40 pt-4 mt-4 flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Date format: Asia/Kolkata timezone</span>
              <Button onClick={() => setIsRevenueModalOpen(false)} size="sm" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground h-8 px-6">
                Close
              </Button>
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
