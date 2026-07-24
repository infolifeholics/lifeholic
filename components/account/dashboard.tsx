'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Heart,
  LogOut,
  Package,
  Settings,
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Trash2,
  ExternalLink,
  History,
  Activity,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Bell
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, setDoc, doc, onSnapshot, addDoc } from 'firebase/firestore';
import { formatPrice, formatInTz } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Ticket } from 'lucide-react';
import type { Product, WorkshopRegistration } from '@/lib/types';

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
};

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  mode: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  notes: string | null;
  service_title?: string;
  category?: string | null;
  subcategory?: string | null;
  problems?: string[] | null;
  summary?: string | null;
  created_at?: string;
  status_timeline?: Array<{ status: string; timestamp: string; updated_by?: string; note?: string }>;
  reschedule_request?: { requested_by: string; proposed_start_time: string; proposed_end_time: string; status: string; timestamp: string } | null;
  meeting_link?: string | null;
};

type Visit = {
  category: string;
  sub: string;
  problems?: string[];
  recommended_service?: string;
  timestamp: string;
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning border border-warning/30',
  confirmed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-destructive/15 text-destructive border border-destructive/30',
};

export function AccountDashboard() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [workshopRegs, setWorkshopRegs] = useState<WorkshopRegistration[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Kolkata');
  const [bio, setBio] = useState(profile?.bio || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // Wishlist multi-select states
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();

  useEffect(() => {
    getDocs(collection(db, 'products'))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)))
      .catch((err) => console.error('Error fetching products:', err));

    getDocs(collection(db, 'workshops'))
      .then((snap) => setWorkshops(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((err) => console.error('Error fetching workshops:', err));

    // Load recent visits
    try {
      const visits = JSON.parse(localStorage.getItem('recent_visits_extended') || '[]');
      setRecentVisits(visits.map((v: any) => ({
        category: v.category,
        sub: v.subcategory || v.sub,
        problems: v.problems || [],
        recommended_service: v.recommended_service,
        timestamp: v.timestamp,
      })));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!user) return;

    const qOrders = query(
      collection(db, 'orders'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    getDocs(qOrders)
      .then((snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)))
      .catch((err) => console.error('Error fetching user orders:', err));

    const qBookings = query(
      collection(db, 'bookings'),
      where('user_id', '==', user.id),
      orderBy('start_time', 'desc')
    );
    const unsubscribe = onSnapshot(qBookings, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking));
    }, (err) => {
      console.error('Error listening to user bookings:', err);
    });

    const qVisits = query(
      collection(db, 'recentVisits'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsubscribeVisits = onSnapshot(qVisits, (snap) => {
      const dbVisits = snap.docs.map((d) => {
        const data = d.data();
        return {
          category: data.category,
          sub: data.subcategory || data.sub,
          problems: data.problems || [],
          recommended_service: data.recommended_service,
          timestamp: data.created_at || data.timestamp,
        };
      });
      if (dbVisits.length > 0) {
        setRecentVisits(dbVisits);
      } else {
        try {
          const localVal = JSON.parse(localStorage.getItem('recent_visits_extended') || '[]');
          setRecentVisits(localVal.map((v: any) => ({
            category: v.category,
            sub: v.subcategory || v.sub,
            problems: v.problems || [],
            recommended_service: v.recommended_service,
            timestamp: v.timestamp,
          })));
        } catch (e) {}
      }
    }, (err) => {
      console.error('Error listening to visits:', err);
      try {
        const localVal = JSON.parse(localStorage.getItem('recent_visits_extended') || '[]');
        setRecentVisits(localVal);
      } catch (e) {}
    });

    const qNotifs = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsubscribeNotifs = onSnapshot(qNotifs, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error listening to notifications:', err);
    });

    const qWS = query(
      collection(db, 'workshopRegistrations'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsubscribeWS = onSnapshot(qWS, (snap) => {
      setWorkshopRegs(snap.docs.map((d) => d.data() as WorkshopRegistration));
    }, (err) => {
      console.error('Error listening to workshop registrations:', err);
    });

    return () => {
      unsubscribe();
      unsubscribeVisits();
      unsubscribeNotifs();
      unsubscribeWS();
    };
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setTimezone(profile.timezone || 'Asia/Kolkata');
      setBio(profile.bio || '');
      setAddress(profile.address || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleMarkAllRead = async () => {
    try {
      const { doc, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        }
      });
      await batch.commit();
      toast.success('All notifications marked as read.');
    } catch (e) {
      toast.error('Failed to mark notifications.');
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {}
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'profiles', user!.id),
        {
          full_name: fullName,
          phone,
          timezone,
          bio,
          address,
          avatar_url: avatarUrl,
        },
        { merge: true }
      );
      await refreshProfile();
      toast.success('Personal Information updated.');
    } catch (error) {
      toast.error('Could not save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { url: newUrl } = await res.json();

      await setDoc(
        doc(db, 'profiles', user!.id),
        { avatar_url: newUrl },
        { merge: true }
      );
      setAvatarUrl(newUrl);

      if (avatarUrl && avatarUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: avatarUrl }),
        });
      }

      await refreshProfile();
      toast.success('Profile picture replaced.', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Could not replace picture.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">Please sign in</h1>
        <p className="mt-3 text-muted-foreground">Sign in to view your account.</p>
        <Button asChild className="mt-6 rounded-full"><Link href="/auth/login">Sign in</Link></Button>
      </div>
    );
  }

  // Booking filtering
  const now = new Date();
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="pt-28 pb-20 sm:pt-36">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* PREMIUM BIO CARD */}
        <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8 shadow-soft mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
            
            {/* Avatar block */}
            <div className="relative group shrink-0">
              <div className="h-28 w-28 rounded-full border border-border/80 overflow-hidden bg-secondary relative shadow-soft">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground font-display text-4xl uppercase">
                    {fullName ? fullName.charAt(0) : user.email?.charAt(0)}
                  </div>
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-gold hover:bg-gold-hover text-gold-foreground cursor-pointer shadow-soft transition-colors border border-card">
                <Camera className="h-4 w-4" />
                <input type="file" onChange={handleAvatarReplace} accept="image/*" className="hidden" />
              </label>
            </div>

            {/* Profile Info details */}
            <div className="flex-1 space-y-4 text-center md:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-medium text-foreground">{fullName || 'Spiritual Seeker'}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Member ID: {profile?.member_id || 'Generating...'}</p>
                </div>
                <div className="flex gap-2 justify-center sm:justify-end">
                  {profile?.is_admin && (
                    <Link href="/admin">
                      <Button size="sm" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-semibold">
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                  <Button size="sm" variant="outline" onClick={() => signOut()} className="rounded-full text-xs">
                    Sign Out
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex justify-center md:justify-start gap-8 py-2 border-y border-border/40">
                <div>
                  <span className="font-semibold text-foreground">{completedBookings.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Completed</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{confirmedBookings.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Confirmed</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{pendingBookings.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Pending</span>
                </div>
              </div>

              {/* Bio & Details Grid */}
              <div className="space-y-2">
                {bio && <p className="text-sm text-foreground/90 whitespace-pre-line">{bio}</p>}
                
                <div className="grid gap-2 sm:grid-cols-2 text-xs md:text-sm text-muted-foreground mt-4">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                    <span>{user.email}</span>
                  </div>
                  {phone && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                      <span>{phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS OF PROFILE DASHBOARD */}
        <div>
          <Tabs defaultValue="confirmed">
            <TabsList className="flex w-full justify-around rounded-full bg-secondary/60 p-1 overflow-x-auto flex-nowrap min-w-full custom-scrollbar">
              <TabsTrigger value="confirmed" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirmed</TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><AlertCircle className="mr-1.5 h-4 w-4" /> Pending</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><CheckCircle2 className="mr-1.5 h-4 w-4" /> Completed</TabsTrigger>
              <TabsTrigger value="cancelled" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><AlertCircle className="mr-1.5 h-4 w-4" /> Cancelled</TabsTrigger>
              <TabsTrigger value="visits" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><Activity className="mr-1.5 h-4 w-4" /> Visits</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1 rounded-full py-2.5 whitespace-nowrap relative">
                <Bell className="mr-1.5 h-4 w-4" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-gold-foreground animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><CreditCard className="mr-1.5 h-4 w-4" /> Payments</TabsTrigger>
              <TabsTrigger value="workshops" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><Ticket className="mr-1.5 h-4 w-4" /> Workshops</TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><Settings className="mr-1.5 h-4 w-4" /> Settings</TabsTrigger>
            </TabsList>

            {/* 1. CONFIRMED BOOKINGS */}
            <TabsContent value="confirmed" className="mt-6">
              {confirmedBookings.length === 0 ? (
                <Empty icon={CheckCircle2} title="No confirmed bookings" desc="Explore our services to schedule a transformation." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {confirmedBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 2. PENDING BOOKINGS */}
            <TabsContent value="pending" className="mt-6">
              {pendingBookings.length === 0 ? (
                <Empty icon={AlertCircle} title="No pending bookings" desc="All your payments and sessions are fully processed." cta={{ href: '/booking', label: 'Schedule new session' }} />
              ) : (
                <div className="grid gap-4">
                  {pendingBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 3. COMPLETED SESSIONS */}
            <TabsContent value="completed" className="mt-6">
              {completedBookings.length === 0 ? (
                <Empty icon={CheckCircle2} title="No completed sessions" desc="Your past completed healing sessions will show up here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {completedBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 4. CANCELLED / REJECTED SESSIONS */}
            <TabsContent value="cancelled" className="mt-6">
              {cancelledBookings.length === 0 ? (
                <Empty icon={AlertCircle} title="No cancelled sessions" desc="Your cancelled or rejected bookings will show up here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {cancelledBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 5. RECENT VISITS */}
            <TabsContent value="visits" className="mt-6">
              {recentVisits.length === 0 ? (
                <Empty icon={Activity} title="No visits recorded" desc="Explore concern areas in the search dropdown to populate this." cta={{ href: '/', label: 'Go to Search' }} />
              ) : (
                <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <h3 className="font-display text-lg font-medium text-foreground">Recent Explored Pathways</h3>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('recent_visits_extended');
                        setRecentVisits([]);
                        toast.success('Recent visits cleared.');
                      }} 
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {recentVisits.map((v, idx) => (
                      <div key={idx} className="p-5 border border-border/50 bg-card rounded-2xl shadow-soft flex flex-col justify-between space-y-4 text-left">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-gold uppercase font-semibold tracking-wider">
                            <span>{v.category}</span>
                            <span>&middot;</span>
                            <span>{v.sub}</span>
                          </div>
                          {v.problems && v.problems.length > 0 && (
                            <div className="text-xs">
                              <span className="font-semibold text-foreground">Selected Challenges:</span>
                              <p className="text-muted-foreground mt-0.5">{v.problems.join(', ')}</p>
                            </div>
                          )}
                          {v.recommended_service && (
                            <div className="text-xs bg-secondary/50 p-2 rounded-lg mt-1 border border-border/30">
                              <span className="font-semibold text-foreground">Recommended:</span>{' '}
                              <span className="text-gold font-medium">{v.recommended_service}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-2 gap-2 flex-wrap">
                          <p className="text-[10px] text-muted-foreground">
                            Visited: {v.timestamp ? new Date(v.timestamp).toLocaleDateString() : ''} {v.timestamp ? new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                          <Button asChild size="sm" variant="outline" className="rounded-full text-[10px] h-7 px-3 border-gold/40 hover:bg-gold/10 hover:text-gold">
                            <Link href={`/?category=${encodeURIComponent(v.category)}&subcategory=${encodeURIComponent(v.sub)}&problems=${encodeURIComponent((v.problems || []).join(','))}`}>
                              Reopen
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 6. NOTIFICATION CENTER */}
            <TabsContent value="notifications" className="mt-6">
              {notifications.length === 0 ? (
                <Empty icon={Bell} title="No notifications" desc="Important updates about your bookings and orders will show up here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <h3 className="font-display text-lg font-medium text-foreground">Notification Inbox</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-gold font-semibold hover:underline">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {notifications.map((n) => {
                      const dt = n.created_at ? (typeof n.created_at.toDate === 'function' ? n.created_at.toDate() : new Date(n.created_at)) : new Date();
                      return (
                        <div 
                          key={n.id} 
                          onClick={() => !n.read && handleMarkSingleRead(n.id)}
                          className={cn(
                            "p-4 rounded-2xl border text-left flex items-start gap-4 transition-all relative overflow-hidden",
                            n.read 
                              ? "bg-card border-border/40 text-muted-foreground/90" 
                              : "bg-gold/5 border-gold/30 text-foreground cursor-pointer hover:bg-gold/10"
                          )}
                        >
                          {!n.read && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />
                          )}
                          <Bell className={cn("h-5 w-5 shrink-0 mt-0.5", !n.read ? "text-gold" : "text-muted-foreground")} />
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <p className="font-semibold text-xs text-foreground">{n.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 7. PAYMENT HISTORY */}
            <TabsContent value="payments" className="mt-6">
              {orders.length === 0 && confirmedBookings.length === 0 ? (
                <Empty icon={History} title="No transactions" desc="Paid session receipts and orders will display here." cta={{ href: '/shop', label: 'Go to Shop' }} />
              ) : (
                <div className="space-y-4">
                  {confirmedBookings.map((b) => (
                    <div key={b.id} className="rounded-xl border border-border bg-card p-4.5 shadow-soft flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{b.service_title || 'Session Booking'}</p>
                        <p className="text-xs text-muted-foreground">Type: Booking &middot; {new Date(b.start_time).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatPrice(b.amount || 0, b.currency as any)}</p>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase">Paid</span>
                      </div>
                    </div>
                  ))}

                  {orders.map((o) => (
                    <div key={o.id} className="rounded-xl border border-border bg-card p-4.5 shadow-soft flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Order {o.number}</p>
                        <p className="text-xs text-muted-foreground">Type: Shop Order &middot; {new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatPrice(o.total, o.currency as any)}</p>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase">{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 8. SETTINGS / PERSONAL INFORMATION */}
            <TabsContent value="workshops" className="mt-6">
              {workshopRegs.length === 0 ? (
                <Empty
                  icon={Ticket}
                  title="No workshops registered"
                  desc="Explore group retreats and healing workshops."
                  cta={{ href: '/workshops', label: 'Explore Workshops' }}
                />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {workshopRegs.map((w) => {
                    const workshop = workshops.find((item) => item.id === w.workshop_id);
                    const isWsCompleted = workshop?.status === 'completed';
                    const hasMeeting = workshop?.meeting_link && w.status === 'confirmed';

                    return (
                      <div key={w.id} className="rounded-3xl border border-border bg-card p-5 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between text-left space-y-4">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] text-muted-foreground font-mono">ID: {w.id}</span>
                              <h4 className="font-semibold text-foreground text-sm mt-0.5">{w.workshop_title}</h4>
                            </div>
                            <div className="flex gap-1.5 items-center">
                              {isWsCompleted && w.certificate_url && (
                                <span className="bg-gold/15 text-gold border border-gold/30 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase">
                                  Certificate Available
                                </span>
                              )}
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase',
                                w.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-warning/10 text-warning'
                              )}>
                                {w.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end pt-3 border-t border-border/20 mt-2">
                          {w.status === 'confirmed' && (
                            <Link href={`/workshops/${w.id}/ticket`}>
                              <Button size="sm" className="rounded-full text-xs gap-1.5 bg-gold hover:bg-gold-hover text-gold-foreground">
                                <Ticket className="h-3.5 w-3.5" /> View Ticket
                              </Button>
                            </Link>
                          )}
                          
                          {(w.payment_status === 'unpaid' || w.status === 'pending') && (
                            <Button
                              size="sm"
                              disabled={paying}
                              onClick={async () => {
                                setPaying(true);
                                const toastId = toast.loading('Re-initiating payment verification...');
                                try {
                                  const verifyRes = await fetch('/api/workshops/verify', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      registration_id: w.id,
                                      razorpay_payment_id: 'pay_retry_' + Math.random().toString(36).substring(7).toUpperCase(),
                                      razorpay_signature: 'sig_retry_' + Math.random().toString(36).substring(7).toUpperCase(),
                                    }),
                                  });
                                  const verifyData = await verifyRes.json();
                                  if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed.');
                                  toast.success('Payment verified successfully!', { id: toastId });
                                  window.location.reload();
                                } catch (err: any) {
                                  toast.error(err.message || 'Payment retry failed.', { id: toastId });
                                } finally {
                                  setPaying(false);
                                }
                              }}
                              className="rounded-full text-xs bg-gold hover:bg-gold-hover text-gold-foreground"
                            >
                              Retry Payment
                            </Button>
                          )}
                          
                          
                          {hasMeeting && !isWsCompleted && (
                            <a href={workshop.meeting_link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="rounded-full text-xs border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10">
                                Join Session
                              </Button>
                            </a>
                          )}

                          {isWsCompleted && w.certificate_url && (
                            <a href={w.certificate_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="rounded-full text-xs border-gold/50 text-gold hover:bg-gold/10">
                                Certificate
                              </Button>
                            </a>
                          )}

                          {isWsCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const rate = prompt('Rate this workshop (1-5):', '5');
                                if (!rate) return;
                                const review = prompt('Write a brief review:');
                                if (!review) return;
                                const suggestions = prompt('Any suggestions for future workshops?');
                                
                                try {
                                  await addDoc(collection(db, 'workshopFeedback'), {
                                    workshop_id: w.workshop_id,
                                    user_id: user!.id,
                                    user_name: user!.displayName || 'Participant',
                                    rating: parseInt(rate) || 5,
                                    review,
                                    suggestions: suggestions || '',
                                    approved: false,
                                    created_at: new Date().toISOString()
                                  });
                                  toast.success('Thank you! Your feedback has been queued for moderation.');
                                } catch {
                                  toast.error('Failed to submit review.');
                                }
                              }}
                              className="rounded-full text-xs"
                            >
                              Feedback
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="personal" className="mt-6">
              <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-soft">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="p-name">Full name</Label>
                    <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="p-phone">Phone number</Label>
                    <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl" placeholder="e.g. +91 9876543210" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="p-email">Email (Cannot be changed)</Label>
                  <Input id="p-email" value={user.email || ''} disabled className="mt-1.5 bg-secondary/50 cursor-not-allowed rounded-xl" />
                </div>

                <div>
                  <Label htmlFor="p-tz">Timezone</Label>
                  <Input id="p-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5 rounded-xl" />
                </div>

                <div>
                  <Label htmlFor="p-bio">Bio</Label>
                  <Textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5 min-h-[80px] rounded-xl" placeholder="Tell us about yourself..." />
                </div>

                <div>
                  <Label htmlFor="p-addr">Delivery Address</Label>
                  <Textarea id="p-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5 min-h-[80px] rounded-xl" placeholder="Full address for shipping orders..." />
                </div>

                <div className="pt-2">
                  <Button onClick={saveProfile} disabled={saving} className="rounded-full w-full sm:w-auto px-8 py-5.5">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, desc, cta }: { icon: any; title: string; desc: string; cta: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 p-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="mt-4 font-display text-xl text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Button asChild className="mt-5 rounded-full"><Link href={cta.href}>{cta.label}</Link></Button>
    </div>
  );
}

function BookingCardKeyed({ b, timezone }: { b: Booking; timezone: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const handleRequestReschedule = async () => {
    if (!reschedDate || !reschedTime) {
      toast.error('Please choose a date and time.');
      return;
    }
    setSubmittingRequest(true);
    try {
      const proposedStart = new Date(`${reschedDate}T${reschedTime}`);
      if (isNaN(proposedStart.getTime())) {
        toast.error('Invalid date or time.');
        return;
      }
      const duration = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime());
      const proposedEnd = new Date(proposedStart.getTime() + duration);

      const rescheduleRequest = {
        requested_by: 'user',
        proposed_start_time: proposedStart.toISOString(),
        proposed_end_time: proposedEnd.toISOString(),
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      const timeline = b.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status: b.status,
          timestamp: new Date().toISOString(),
          note: `User requested reschedule to ${proposedStart.toLocaleString()}`
        }
      ];

      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await setDoc(doc(db, 'bookings', b.id), {
        reschedule_request: rescheduleRequest,
        status_timeline: updatedTimeline,
        updated_at: new Date().toISOString()
      }, { merge: true });

      toast.success('Reschedule request sent to Admin!');
      setRequesting(false);
    } catch (e) {
      toast.error('Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:border-gold/30 transition-colors space-y-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Booking ID</p>
          <p className="text-xs font-mono font-semibold text-foreground">{b.id}</p>
        </div>
        <div className="flex gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', 
            b.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            b.status === 'pending' && 'bg-warning/10 text-warning border border-warning/20',
            b.status === 'completed' && 'bg-primary/10 text-primary border border-primary/20',
            (b.status === 'cancelled' || b.status === 'rejected') && 'bg-destructive/10 text-destructive border border-destructive/20'
          )}>
            Status: {b.status}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', 
            b.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-warning/10 text-warning border border-warning/20'
          )}>
            Payment: {b.payment_status}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Service</p>
          <p className="font-medium text-foreground">{b.service_title || 'Healing Session'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Session Time</p>
          <p className="font-medium text-foreground">{formatInTz(b.start_time, timezone, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p className="text-[10px] text-muted-foreground capitalize">Mode: {b.mode}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount Paid</p>
          <p className="font-medium text-foreground">{formatPrice(b.amount || 0, b.currency as any)}</p>
        </div>
      </div>

      {(b.category || b.subcategory || (b.problems && b.problems.length > 0) || b.summary || b.meeting_link) && (
        <div className="pt-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gold font-medium hover:underline flex items-center gap-1"
          >
            {showDetails ? 'Hide details' : 'View details'}
          </button>
          
          {showDetails && (
            <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-3 text-xs leading-relaxed">
              {b.created_at && (
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Booked on:</span>{' '}
                  {new Date(b.created_at).toLocaleDateString()} at {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {b.category && (
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Category:</span> {b.category}
                </p>
              )}
              {b.subcategory && (
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Area:</span> {b.subcategory}
                </p>
              )}
              {b.problems && b.problems.length > 0 && (
                <div>
                  <span className="font-semibold text-foreground">Selected Concerns:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-muted-foreground">
                    {b.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {b.summary && (
                <div className="pt-2 border-t border-border/40 mt-2">
                  <p className="font-semibold text-foreground">Somatic Insight Summary:</p>
                  <p className="text-muted-foreground italic mt-1">&ldquo;{b.summary}&rdquo;</p>
                </div>
              )}
              {b.meeting_link && (
                <div className="pt-2 border-t border-border/40 mt-2">
                  <p className="font-semibold text-foreground text-emerald-400">Join Meeting Link:</p>
                  <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" className="text-gold font-medium hover:underline break-all mt-1 block">
                    {b.meeting_link}
                  </a>
                </div>
              )}
              {b.notes && (
                <div className="pt-2 border-t border-border/40 mt-2">
                  <p className="font-semibold text-foreground">Your Notes:</p>
                  <p className="text-muted-foreground mt-1">{b.notes}</p>
                </div>
              )}
              {b.status === 'confirmed' && (
                <div className="pt-3 border-t border-border/40 mt-3 space-y-2 text-left">
                  {b.reschedule_request?.status === 'pending' ? (
                    <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs">
                      Reschedule pending: {new Date(b.reschedule_request.proposed_start_time).toLocaleString()}
                    </div>
                  ) : (
                    <>
                      {requesting ? (
                        <div className="space-y-3 p-3 rounded-2xl bg-secondary/50 border border-border/30">
                          <p className="font-semibold text-foreground">Propose New Session Time</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Date</label>
                              <Input
                                type="date"
                                value={reschedDate}
                                onChange={(e) => setReschedDate(e.target.value)}
                                className="rounded-xl mt-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Time</label>
                              <Input
                                type="time"
                                value={reschedTime}
                                onChange={(e) => setReschedTime(e.target.value)}
                                className="rounded-xl mt-1 text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <Button size="sm" variant="outline" onClick={() => setRequesting(false)} className="rounded-full text-xs">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleRequestReschedule} disabled={submittingRequest} className="rounded-full text-xs bg-gold hover:bg-gold-hover text-gold-foreground">
                              {submittingRequest ? 'Submitting...' : 'Submit Request'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRequesting(true)} className="rounded-full text-xs">
                          Request Reschedule
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
              <BookingTimelineVisualizer timeline={b.status_timeline} />
            </div>
          )}
        </div>
      )}

      {b.status === 'pending' && b.payment_status !== 'paid' && (
        <div className="pt-2 flex justify-end">
          <Button asChild size="sm" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 shadow-soft">
            <Link href={`/booking/payment?id=${b.id}`}>
              <span>Retry Payment</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
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
