'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Bell,
  CalendarDays,
  Ticket,
  ShoppingBag,
  Lock,
  Shield,
  FileText,
  Download,
  X,
  Search
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { CartView } from '@/components/shop/cart-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { useCart } from '@/components/providers/cart-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, setDoc, doc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { formatPrice, formatInTz } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Product, WorkshopRegistration } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  payment_provider?: string;
  items?: Array<{
    id: string;
    slug?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    type?: string;
  }>;
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
  client_name?: string;
  client_email?: string;
  client_phone?: string | null;
  certificate_url?: string | null;
  recommendation_letter_url?: string | null;
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
  const { user, profile, loading, signOut, refreshProfile, sendVerification, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { count: cartCount } = useCart();

  // Route/Tab control sync
  const activeTab = searchParams.get('tab') || 'upcoming';

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
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState(profile?.country || '');

  // Notifications filtering
  const [notifCategory, setNotifCategory] = useState('all');

  // Modal / Dropdown states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Password reset/update state
  const [sendingPassReset, setSendingPassReset] = useState(false);

  // Wishlist multi-select states
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();

  useEffect(() => {
    getDocs(query(collection(db, 'products'), where('is_active', '==', true)))
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
    } catch (e) { }
  }, []);

  const [userPackages, setUserPackages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch user somatic packages
    const qPackages = query(
      collection(db, 'somatic_packages'),
      where('user_id', '==', user.id)
    );
    const unsubPackage = onSnapshot(qPackages, (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        const nowTime = Date.now();
        const expiryTime = new Date(data.expiry_date).getTime();
        if (nowTime > expiryTime && data.status === 'active') {
          setDoc(doc.ref, { status: 'expired' }, { merge: true }).catch(console.error);
          data.status = 'expired';
        }
        return { id: doc.id, ...data };
      });
      setUserPackages(list);
    }, (err) => {
      console.error('Error fetching user packages:', err);
    });

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
        } catch (e) { }
      }
    }, (err) => {
      console.error('Error listening to visits:', err);
      try {
        const localVal = JSON.parse(localStorage.getItem('recent_visits_extended') || '[]');
        setRecentVisits(localVal);
      } catch (e) { }
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
      unsubPackage();
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
      setCity(profile?.city || '');
      setCountry(profile?.country || '');
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
    } catch (e) { }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification deleted.');
    } catch (e) {
      toast.error('Failed to delete notification.');
    }
  };

  const handlePassResetEmail = async () => {
    if (!user?.email) return;
    setSendingPassReset(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link.');
    } finally {
      setSendingPassReset(false);
    }
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
          city,
          country,
        },
        { merge: true }
      );
      await refreshProfile();
      toast.success('Personal Information updated.');
      setShowSettingsModal(false);
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
        <div
          className="flex flex-col items-center rounded-3xl border border-white/10 p-10 sm:p-14 backdrop-blur-md shadow-2xl"
          style={{ backgroundColor: 'rgba(10, 8, 6, 0.85)' }}
        >
          <h1 className="font-display text-3xl font-medium" style={{ color: '#D4AF37' }}>Please sign in</h1>
          <p className="mt-3 text-white/75">Sign in to view your account.</p>
          <Button asChild className="mt-6 rounded-full"><Link href="/auth/login">Sign in</Link></Button>
        </div>
      </div>
    );
  }

  // Booking filtering
  const now = new Date();
  const upcomingBookings = bookings.filter(b =>
    (b.status === 'confirmed' || b.status === 'pending') && new Date(b.start_time).getTime() > now.getTime()
  );
  const completedBookings = bookings.filter(b =>
    b.status === 'completed' ||
    ((b.status === 'confirmed' || b.status === 'pending') && new Date(b.start_time).getTime() <= now.getTime())
  );
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');
  const paidBookings = bookings.filter(b => b.payment_status === 'paid');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleTabChange = (val: string) => {
    router.push(`/account?tab=${val}`);
  };

  // Notification categories filter function
  const filteredNotifications = notifications.filter((n) => {
    if (notifCategory === 'all') return true;
    if (notifCategory === 'bookings') return n.category?.toLowerCase().includes('booking') || n.category?.toLowerCase().includes('session') || n.title?.toLowerCase().includes('booking') || n.title?.toLowerCase().includes('session');
    if (notifCategory === 'orders') return n.category?.toLowerCase().includes('order') || n.title?.toLowerCase().includes('order');
    if (notifCategory === 'workshops') return n.category?.toLowerCase().includes('workshop') || n.title?.toLowerCase().includes('workshop');
    if (notifCategory === 'payments') return n.category?.toLowerCase().includes('payment') || n.title?.toLowerCase().includes('payment');
    if (notifCategory === 'cart') return n.category?.toLowerCase().includes('cart') || n.title?.toLowerCase().includes('cart');
    if (notifCategory === 'certificates') return n.category?.toLowerCase().includes('certificate') || n.title?.toLowerCase().includes('certificate');
    if (notifCategory === 'recommendations') return n.category?.toLowerCase().includes('recommendation') || n.title?.toLowerCase().includes('recommendation');
    if (notifCategory === 'admin') return n.category?.toLowerCase().includes('admin') || n.category?.toLowerCase().includes('general') || n.title?.toLowerCase().includes('admin') || n.title?.toLowerCase().includes('general');
    return true;
  });

  return (
    <div className="pt-28 pb-24 sm:pt-36">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* EMAIL VERIFICATION WARNING BANNER */}
        {user && !user.emailVerified && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your Email Address is Unverified</p>
                <p className="text-xs text-muted-foreground mt-0.5">Please check your inbox for the verification link to secure your account.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={async () => {
                  const toastId = toast.loading('Sending verification email...');
                  const { error } = await sendVerification();
                  if (error) {
                    toast.error(error, { id: toastId });
                  } else {
                    toast.success('Verification link sent! Check your inbox.', { id: toastId });
                  }
                }}
              >
                Resend Link
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs rounded-full bg-gold hover:bg-gold-hover text-gold-foreground"
                onClick={async () => {
                  const toastId = toast.loading('Refreshing state...');
                  await refreshUser();
                  toast.success('Status updated.', { id: toastId });
                }}
              >
                Refresh Status
              </Button>
            </div>
          </div>
        )}

        {/* 1. INSTAGRAM INSPIRED PROFILE HEADER */}
        <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8 shadow-soft mb-8">
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Left Side: Profile Picture */}
            <div className="relative group shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-gold overflow-hidden bg-secondary relative shadow-soft p-1">
                <div className="h-full w-full rounded-full overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary font-display text-2xl uppercase">
                      {fullName ? fullName.charAt(0) : user.email?.charAt(0)}
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-gold hover:bg-gold-hover text-gold-foreground cursor-pointer shadow-soft transition-colors border border-card">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" onChange={handleAvatarReplace} accept="image/*" className="hidden" />
              </label>
            </div>

            {/* Right Side: Name, ID, and Stats underneath */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl font-medium text-foreground truncate">{fullName || 'Spiritual Seeker'}</h2>
                  {profile?.is_admin && (
                    <Link href="/admin" className="shrink-0">
                      <Button size="sm" className="h-6 rounded-full bg-gold hover:bg-gold-hover text-gold-foreground text-[10px] font-semibold px-2.5 py-0 flex items-center justify-center">
                        Admin
                      </Button>
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 ml-auto"
                >
                  <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-0.5">Member ID: {profile?.member_id || 'Generating...'}</p>

              {/* Clickable Statistics Panel */}
              <div className="flex items-center gap-6 sm:gap-8 mt-3 pt-2 border-t border-border/20">
                <button
                  onClick={() => handleTabChange('upcoming')}
                  className="flex flex-col items-start hover:text-gold transition-colors text-left"
                >
                  <span className="font-display text-lg font-bold text-foreground leading-none">{bookings.length}</span>
                  <span className="text-muted-foreground text-[10px] sm:text-xs font-medium tracking-wide mt-1">Sessions</span>
                </button>
                <button
                  onClick={() => handleTabChange('orders')}
                  className="flex flex-col items-start hover:text-gold transition-colors text-left"
                >
                  <span className="font-display text-lg font-bold text-foreground leading-none">{orders.length}</span>
                  <span className="text-muted-foreground text-[10px] sm:text-xs font-medium tracking-wide mt-1">Orders</span>
                </button>
                <button
                  onClick={() => handleTabChange('cart')}
                  className="flex flex-col items-start hover:text-gold transition-colors text-left"
                >
                  <span className="font-display text-lg font-bold text-foreground leading-none">{cartCount}</span>
                  <span className="text-muted-foreground text-[10px] sm:text-xs font-medium tracking-wide mt-1">Cart</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. USER BIO & INFO SECTION BELOW THE MAIN FLEX HEADER */}
          <div className="space-y-3 pt-4 text-sm text-left border-t border-border/40 mt-5">
            {bio ? (
              <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed italic bg-secondary/20 p-3 rounded-xl border border-border/30">
                &ldquo;{bio}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No bio added yet.</p>
            )}

            <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <span>{user.email}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <span>{phone}</span>
                </div>
              )}
              {(city || country) && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{[city, country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>Joined:</span>
                <span>
                  {user.metadata.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                    : 'July 2026'
                  }
                </span>
              </div>
            </div>

            {/* Quick Actions (Sign Out) */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <Button size="sm" variant="outline" onClick={() => signOut()} className="rounded-full text-xs">
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* 4. PROGRAM & SERVICE TRACKER CARDS */}
        {userPackages.map((pkg) => {
          const isSomaticPkg = pkg.package_type === 'somatic_plan' || !pkg.package_type;
          const totalSessions = pkg.total_sessions || 4;
          const completedSessions = pkg.completed_sessions || 0;
          const remainingSessions = pkg.remaining_sessions || 0;
          const stepArray = Array.from({ length: totalSessions }, (_, i) => i + 1);

          return (
            <div key={pkg.id} className="rounded-3xl border border-gold/30 bg-gradient-to-r from-card to-secondary/30 p-6 shadow-glow mb-8 text-left animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b border-border/20 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-display font-medium text-lg text-gold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-gold" /> {pkg.package_name || (isSomaticPkg ? 'Somatic Transformation Program' : 'Healing Service Package')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Validity: {new Date(pkg.purchase_date).toLocaleDateString()} – {new Date(pkg.expiry_date).toLocaleDateString()}{' '}
                    ({(pkg.status === 'expired' || new Date().getTime() > new Date(pkg.expiry_date).getTime()) ? <span className="text-destructive font-bold">Expired</span> : (pkg.status === 'completed' || completedSessions >= totalSessions) ? <span className="text-emerald-400 font-bold">Completed</span> : <span className="text-gold font-bold">Active</span>})
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-semibold text-gold" style={{ backgroundColor: '#121212', padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    30 Mins × {totalSessions} {totalSessions === 1 ? 'Session' : 'Sessions'}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1.5">{completedSessions} / {totalSessions} Completed</span>
                  {(pkg.status === 'expired' || new Date().getTime() > new Date(pkg.expiry_date).getTime()) ? (
                    <span className="text-[10px] font-bold text-destructive mt-0.5">
                      {isSomaticPkg ? 'Plan has expired' : 'Package has expired'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground mt-0.5">{remainingSessions} {remainingSessions === 1 ? 'Session' : 'Sessions'} Remaining</span>
                  )}
                </div>
              </div>

              {/* Stages Step Tracker */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 mt-6">
                {stepArray.map((stepNum) => {
                  const linkedBookingId = pkg.booking_ids?.[stepNum - 1];
                  let stepStatus: 'completed' | 'booked' | 'available' | 'locked' = 'locked';
                  let bookingDateStr = '';

                  if (linkedBookingId) {
                    const bDetails = bookings.find(b => b.id === linkedBookingId);
                    if (bDetails) {
                      if (bDetails.status === 'completed') {
                        stepStatus = 'completed';
                      } else if (bDetails.status === 'cancelled' || bDetails.status === 'rejected') {
                        stepStatus = 'available';
                      } else {
                        stepStatus = 'booked';
                        bookingDateStr = new Date(bDetails.start_time).toLocaleDateString();
                      }
                    } else {
                      stepStatus = 'booked';
                    }
                  } else {
                    if (stepNum === 1) {
                      stepStatus = 'available';
                    } else {
                      const prevBookingId = pkg.booking_ids?.[stepNum - 2];
                      if (prevBookingId) {
                        const prevB = bookings.find(b => b.id === prevBookingId);
                        if (prevB && prevB.status === 'completed') {
                          stepStatus = 'available';
                        } else {
                          stepStatus = 'locked';
                        }
                      } else {
                        stepStatus = 'locked';
                      }
                    }
                  }

                  const isExpired = pkg.status === 'expired' || new Date().getTime() > new Date(pkg.expiry_date).getTime();
                  if (isExpired && stepStatus !== 'completed') {
                    stepStatus = 'locked';
                  }

                  // Determine booking URL
                  let bookingUrl = `/booking/somatic?plan=${pkg.plan_key || 'premium'}`;
                  if (!isSomaticPkg) {
                    bookingUrl = `/booking?service=${pkg.service_id}`;
                  }

                  return (
                    <div key={stepNum} className={cn(
                      "p-4 rounded-2xl border text-center transition-all",
                      stepStatus === 'completed' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
                      stepStatus === 'booked' && "bg-amber-500/5 border-gold/30 text-gold",
                      stepStatus === 'available' && "bg-card border-border/60 text-foreground hover:border-gold/30 cursor-pointer",
                      stepStatus === 'locked' && "bg-secondary/40 border-border/20 text-muted-foreground opacity-60"
                    )}>
                      <div className="flex justify-center mb-2">
                        {stepStatus === 'completed' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                        {stepStatus === 'booked' && <CalendarDays className="h-5 w-5 text-gold" />}
                        {stepStatus === 'available' && <Clock className="h-5 w-5 text-foreground" />}
                        {stepStatus === 'locked' && <Lock className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <span className="block text-xs font-bold uppercase tracking-wider">Session {stepNum}</span>
                      <span className="block text-[10px] mt-1 capitalize">
                        {stepStatus === 'completed' && '✅ Completed'}
                        {stepStatus === 'booked' && `📅 Booked (${bookingDateStr})`}
                        {stepStatus === 'available' && (
                          <Link href={bookingUrl} className="hover:underline text-gold font-semibold">
                            ⏳ Book Now
                          </Link>
                        )}
                        {stepStatus === 'locked' && (
                          isExpired ? (isSomaticPkg ? '🔒 Plan Expired' : '🔒 Package Expired') : '🔒 Locked'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 5. NAVIGATION TABS (INSTAGRAM INSPIRED) */}
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex w-full justify-around rounded-full bg-secondary/60 p-1 overflow-x-auto flex-nowrap min-w-full custom-scrollbar mb-6 border border-border/40">
              <TabsTrigger value="upcoming" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><CalendarDays className="mr-1 h-3.5 w-3.5" /> Upcoming</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed</TabsTrigger>
              <TabsTrigger value="cancelled" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><AlertCircle className="mr-1 h-3.5 w-3.5" /> Cancelled</TabsTrigger>
              <TabsTrigger value="visits" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><Activity className="mr-1 h-3.5 w-3.5" /> Visits</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm relative">
                <Bell className="mr-1 h-3.5 w-3.5" />
                <span>Inbox</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-gold-foreground animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><CreditCard className="mr-1 h-3.5 w-3.5" /> Payments</TabsTrigger>
              <TabsTrigger value="workshops" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><Ticket className="mr-1 h-3.5 w-3.5" /> Workshops</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><Package className="mr-1 h-3.5 w-3.5" /> Orders</TabsTrigger>
              <TabsTrigger value="cart" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm relative">
                <ShoppingBag className="mr-1 h-3.5 w-3.5" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-gold-foreground">
                    {cartCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 rounded-full py-2.5 whitespace-nowrap text-xs sm:text-sm"><Settings className="mr-1 h-3.5 w-3.5" /> Settings</TabsTrigger>
            </TabsList>

            {/* UPCOMING BOOKINGS */}
            <TabsContent value="upcoming">
              {upcomingBookings.length === 0 ? (
                <Empty icon={CalendarDays} title="No upcoming sessions" desc="Explore our services to schedule a transformation." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {upcomingBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} onSelect={() => setSelectedBooking(b)} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* COMPLETED SESSIONS */}
            <TabsContent value="completed">
              {completedBookings.length === 0 ? (
                <Empty icon={CheckCircle2} title="No completed sessions" desc="Your past completed healing sessions will show up here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {completedBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} onSelect={() => setSelectedBooking(b)} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* CANCELLED BOOKINGS */}
            <TabsContent value="cancelled">
              {cancelledBookings.length === 0 ? (
                <Empty icon={AlertCircle} title="No cancelled sessions" desc="Your cancelled or rejected bookings will show up here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {cancelledBookings.map((b) => (
                    <BookingCardKeyed key={b.id} b={b} timezone={timezone} onSelect={() => setSelectedBooking(b)} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* RECENT VISITS */}
            <TabsContent value="visits">
              {recentVisits.length === 0 ? (
                <Empty icon={Activity} title="No visits recorded" desc="Explore concern areas in the search dropdown to populate this." cta={{ href: '/', label: 'Go to Search' }} />
              ) : (
                <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <div>
                      <h3 className="font-display text-lg font-medium text-foreground">Recent Explored Pathways</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Last login details and recently explored sections.</p>
                    </div>
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
                        <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-2 gap-2 flex-wrap text-[10px] text-muted-foreground">
                          <span>
                            Visited: {v.timestamp ? new Date(v.timestamp).toLocaleDateString() : ''}
                          </span>
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
            <TabsContent value="notifications">
              <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/40 gap-3">
                  <div>
                    <h3 className="font-display text-lg font-medium text-foreground">Notification Center</h3>
                    <p className="text-xs text-muted-foreground">Real-time updates regarding your account activities.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-gold font-semibold hover:underline">
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filtering Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 flex-nowrap custom-scrollbar">
                  {[
                    { id: 'all', label: 'All Notifications' },
                    { id: 'bookings', label: 'Sessions' },
                    { id: 'orders', label: 'Orders' },
                    { id: 'workshops', label: 'Workshops' },
                    { id: 'payments', label: 'Payments' },
                    { id: 'cart', label: 'Cart' },
                    { id: 'certificates', label: 'Certificates' },
                    { id: 'recommendations', label: 'Recommendations' },
                    { id: 'admin', label: 'Admin Messages' }
                  ].map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setNotifCategory(category.id)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                        notifCategory === category.id
                          ? "bg-gold border-gold text-gold-foreground"
                          : "bg-secondary/40 border-border/60 text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                {filteredNotifications.length === 0 ? (
                  <Empty icon={Bell} title="No notifications found" desc="There are no notifications matching this category." cta={{ href: '/booking', label: 'Book a session' }} />
                ) : (
                  <div className="space-y-3 pt-2">
                    {filteredNotifications.map((n) => {
                      const dt = n.created_at ? (typeof n.created_at.toDate === 'function' ? n.created_at.toDate() : new Date(n.created_at)) : new Date();
                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.read && handleMarkSingleRead(n.id)}
                          className={cn(
                            "p-4 rounded-2xl border text-left flex items-start gap-4 transition-all relative overflow-hidden",
                            n.read
                              ? "bg-card border-border/40 text-muted-foreground/80"
                              : "bg-gold/5 border-gold/30 text-foreground cursor-pointer hover:bg-gold/10 shadow-sm"
                          )}
                        >
                          {!n.read && (
                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gold animate-pulse" />
                          )}
                          <Bell className={cn("h-5 w-5 shrink-0 mt-0.5", !n.read ? "text-gold" : "text-muted-foreground")} />
                          <div className="flex-1 space-y-1 pr-6">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <p className="font-semibold text-xs text-foreground uppercase tracking-wider">{n.category || 'General'}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                            <p className="font-medium text-xs text-foreground mt-0.5">{n.title}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground mt-1">{n.message}</p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteNotification(n.id, e)}
                            className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                            aria-label="Delete Notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PAYMENTS HISTORY */}
            <TabsContent value="payments">
              {orders.length === 0 && paidBookings.length === 0 ? (
                <Empty icon={History} title="No transactions" desc="Paid session receipts and orders will display here." cta={{ href: '/shop', label: 'Go to Shop' }} />
              ) : (
                <div className="space-y-4">
                  {paidBookings.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center justify-between text-sm hover:border-gold/35 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{b.service_title || 'Session Booking'}</p>
                        <p className="text-xs text-muted-foreground">Type: Booking &middot; {new Date(b.start_time).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatPrice(b.amount || 0, b.currency as any)}</p>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Paid</span>
                      </div>
                    </div>
                  ))}

                  {orders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center justify-between text-sm hover:border-gold/35 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Order #{o.number}</p>
                        <p className="text-xs text-muted-foreground">Type: Shop Order &middot; {new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatPrice(o.total, o.currency as any)}</p>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* WORKSHOPS */}
            <TabsContent value="workshops">
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

            {/* 10. ORDERS TAB */}
            <TabsContent value="orders">
              {orders.length === 0 ? (
                <Empty icon={Package} title="No orders placed yet" desc="Visit our shop to explore items and place your first order." cta={{ href: '/shop', label: 'Go to Shop' }} />
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4 hover:border-gold/30 transition-colors">
                      <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-4 gap-2">
                        <div>
                          <p className="font-display font-medium text-foreground text-lg">Order ID: {order.number}</p>
                          <p className="text-xs text-muted-foreground">Order Date: {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize tracking-wider border',
                            order.status === 'paid' || order.status === 'fulfilled' ? 'bg-success/15 border-success/30 text-success' :
                              order.status === 'pending' ? 'bg-warning/15 border-warning/30 text-warning' : 'bg-secondary border-border/60 text-muted-foreground'
                          )}>
                            Status: {order.status}
                          </span>
                          <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5 h-8 border-gold/40 text-gold hover:bg-gold/10" onClick={() => window.print()}>
                            <FileText className="h-3.5 w-3.5" /> Invoice
                          </Button>
                        </div>
                      </div>
                      <ul className="divide-y divide-border/20">
                        {order.items?.map((item: any, idx: number) => {
                          const itemSlug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                          return (
                            <li key={idx} className="flex py-3.5 gap-4 items-center justify-between">
                              <div className="flex items-center gap-4">
                                {item.image ? (
                                  <img src={item.image} alt="" className="h-14 w-14 rounded-2xl object-cover border border-border/50 shadow-sm" />
                                ) : (
                                  <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center border border-border/50">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{item.type || 'Physical'} · Qty {item.quantity}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-sm text-foreground">{formatPrice(item.price * item.quantity, order.currency as 'INR' | 'USD')}</span>
                                <Button asChild size="sm" variant="ghost" className="h-8 rounded-full hover:bg-secondary text-xs gap-1">
                                  <Link href={`/shop/${itemSlug}`} target="_blank">
                                    View <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex justify-between items-center border-t border-border/40 pt-4 text-xs text-muted-foreground">
                        <span>Paid via: {order.payment_provider || 'Manual Payment Gateway'}</span>
                        <div className="text-right">
                          <span className="text-xs">Amount Paid: </span>
                          <span className="font-bold text-sm text-foreground">{formatPrice(order.total, order.currency as 'INR' | 'USD')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 11. CART TAB */}
            <TabsContent value="cart">
              <div className="rounded-3xl border border-border/60 bg-card/40 p-6 shadow-soft">
                <CartView />
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="personal">
              <div className="space-y-4 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft text-left">
                <div>
                  <h3 className="font-display font-medium text-lg text-foreground">Account Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage your personal profiles details here.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div>
                    <Label htmlFor="p-name" className="text-xs font-semibold text-muted-foreground">Full name</Label>
                    <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 rounded-xl text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="p-phone" className="text-xs font-semibold text-muted-foreground">Phone number</Label>
                    <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl text-sm" placeholder="e.g. +91 9876543210" />
                  </div>
                  <div>
                    <Label htmlFor="p-city" className="text-xs font-semibold text-muted-foreground">City</Label>
                    <Input id="p-city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5 rounded-xl text-sm" placeholder="City" />
                  </div>
                  <div>
                    <Label htmlFor="p-country" className="text-xs font-semibold text-muted-foreground">Country</Label>
                    <Input id="p-country" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5 rounded-xl text-sm" placeholder="Country" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="p-email" className="text-xs font-semibold text-muted-foreground">Email (Cannot be changed)</Label>
                  <Input id="p-email" value={user.email || ''} disabled className="mt-1.5 bg-secondary/50 cursor-not-allowed rounded-xl text-sm" />
                </div>

                <div>
                  <Label htmlFor="p-tz" className="text-xs font-semibold text-muted-foreground">Timezone</Label>
                  <Input id="p-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5 rounded-xl text-sm" />
                </div>

                <div>
                  <Label htmlFor="p-bio" className="text-xs font-semibold text-muted-foreground">Bio</Label>
                  <Textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5 min-h-[80px] rounded-xl text-sm" placeholder="Tell us about yourself..." />
                </div>

                <div>
                  <Label htmlFor="p-addr" className="text-xs font-semibold text-muted-foreground">Delivery Address</Label>
                  <Textarea id="p-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5 min-h-[80px] rounded-xl text-sm" placeholder="Full address for shipping orders..." />
                </div>

                <div className="flex gap-3 pt-3 border-t border-border/20">
                  <Button onClick={saveProfile} disabled={saving} className="rounded-full px-8">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handlePassResetEmail} disabled={sendingPassReset} className="rounded-full px-6 border-gold/45 hover:bg-gold/10">
                    {sendingPassReset ? 'Sending link...' : 'Reset Password'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 3. SETTINGS OVERLAY / DIALOG MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-3xl border border-border/80 bg-popover text-popover-foreground shadow-glow p-6 text-left overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-border/40">
                <span className="font-display font-medium text-lg text-foreground">Profile Settings</span>
                <button onClick={() => setShowSettingsModal(false)} className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-2">
                {/* Options List */}
                <button
                  onClick={() => {
                    handleTabChange('personal');
                    setShowSettingsModal(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors text-sm font-semibold flex items-center gap-3 text-foreground"
                >
                  <User className="h-4.5 w-4.5 text-gold" />
                  Edit Profile Details
                </button>

                {/* <button
                  onClick={() => {
                    handlePassResetEmail();
                    setShowSettingsModal(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors text-sm font-semibold flex items-center gap-3 text-foreground"
                >
                  <Lock className="h-4.5 w-4.5 text-gold" />
                  Change Password
                </button>

                <button
                  onClick={() => {
                    handleTabChange('notifications');
                    setShowSettingsModal(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors text-sm font-semibold flex items-center gap-3 text-foreground"
                >
                  <Bell className="h-4.5 w-4.5 text-gold" />
                  Notification Settings
                </button>

                <button
                  onClick={() => {
                    toast.success('Your privacy settings are managed securely. Tracking has been limited to authenticated interactions only.');
                    setShowSettingsModal(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors text-sm font-semibold flex items-center gap-3 text-foreground"
                >
                  <Shield className="h-4.5 w-4.5 text-gold" />
                  Privacy Settings
                </button> */}

                <div className="pt-2 border-t border-border/40 mt-4">
                  <button
                    onClick={() => {
                      signOut();
                      setShowSettingsModal(false);
                    }}
                    className="w-full text-left p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-semibold flex items-center gap-3"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Logout Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. SESSION DETAILS DETAIL OVERLAY */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-popover text-popover-foreground shadow-glow p-6 text-left overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-border/40">
                <div>
                  <span className="font-display font-medium text-lg text-foreground">Session Details</span>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Booking ID: {selectedBooking.id}</p>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="grid grid-cols-2 gap-4 text-sm text-foreground">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Session Name</p>
                    <p className="font-bold text-foreground mt-0.5">{selectedBooking.service_title || 'Healing Session'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Session Mode</p>
                    <p className="font-medium text-foreground capitalize mt-0.5">{selectedBooking.mode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Date &amp; Time</p>
                    <p className="font-medium text-foreground mt-0.5">
                      {formatInTz(selectedBooking.start_time, timezone, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Paid Amount</p>
                    <p className="font-bold text-foreground mt-0.5">{formatPrice(selectedBooking.amount || 0, selectedBooking.currency as any)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                  <div>
                    <span className="font-semibold text-foreground">Status: </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      selectedBooking.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-400',
                      selectedBooking.status === 'pending' && 'bg-warning/10 text-warning',
                      selectedBooking.status === 'completed' && 'bg-primary/10 text-primary',
                      (selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected') && 'bg-destructive/10 text-destructive'
                    )}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Payment Status: </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      selectedBooking.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-warning/10 text-warning'
                    )}>
                      {selectedBooking.payment_status}
                    </span>
                  </div>
                </div>

                {selectedBooking.category && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Category:</span> {selectedBooking.category}
                  </p>
                )}
                {selectedBooking.subcategory && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Area:</span> {selectedBooking.subcategory}
                  </p>
                )}
                {selectedBooking.problems && selectedBooking.problems.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground">Selected Concerns:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {selectedBooking.problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedBooking.summary && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="font-semibold text-foreground">Somatic Insight Summary:</p>
                    <p className="italic mt-1 text-foreground/80 bg-secondary/30 p-2.5 rounded-xl border border-border/40">&ldquo;{selectedBooking.summary}&rdquo;</p>
                  </div>
                )}
                {selectedBooking.meeting_link && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="font-semibold text-foreground text-emerald-400">Join Meeting Link:</p>
                    <a href={selectedBooking.meeting_link} target="_blank" rel="noopener noreferrer" className="text-gold font-medium hover:underline break-all mt-1 block">
                      {selectedBooking.meeting_link}
                    </a>
                  </div>
                )}
                {selectedBooking.notes && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="font-semibold text-foreground">Your Notes:</p>
                    <p className="mt-1">{selectedBooking.notes}</p>
                  </div>
                )}

                {/* Certificates / Recommendations downloads */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border/20">
                  {selectedBooking.certificate_url ? (
                    <a href={selectedBooking.certificate_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" className="w-full rounded-full text-xs gap-1.5 bg-gold text-gold-foreground hover:bg-gold-hover">
                        <Download className="h-3.5 w-3.5" /> Download Certificate
                      </Button>
                    </a>
                  ) : (
                    selectedBooking.status === 'completed' && (
                      <Button size="sm" disabled className="flex-1 rounded-full text-xs gap-1.5 cursor-not-allowed">
                        <Download className="h-3.5 w-3.5" /> Certificate Processing
                      </Button>
                    )
                  )}

                  {selectedBooking.recommendation_letter_url && (
                    <a href={selectedBooking.recommendation_letter_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full rounded-full text-xs gap-1.5 border-gold/50 text-gold hover:bg-gold/10">
                        <Download className="h-3.5 w-3.5" /> Recommendation Letter
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedBooking(null)} className="rounded-full text-xs">
                  Close Details
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Empty({ icon: Icon, title, desc, cta }: { icon: any; title: string; desc: string; cta: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/40 p-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="mt-4 font-display text-xl text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Button asChild className="mt-5 rounded-full"><Link href={cta.href}>{cta.label}</Link></Button>
    </div>
  );
}

function BookingCardKeyed({ b, timezone, onSelect }: { b: Booking; timezone: string; onSelect: () => void }) {
  const [requesting, setRequesting] = useState(false);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelBooking = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel this healing session? This will immediately free up the slot.')) return;
    setCancelling(true);
    try {
      const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { writeAuditLog } = await import('@/lib/booking-utils');

      await writeAuditLog('Booking Cancelled', 'User', { bookingId: b.id, clientName: b.client_name, start_time: b.start_time });

      const timeline = b.status_timeline || [];
      const updatedTimeline = [
        ...timeline,
        {
          status: 'cancelled',
          timestamp: new Date().toISOString(),
          note: 'Cancelled by user'
        }
      ];

      await setDoc(doc(db, 'bookings', b.id), {
        status: 'cancelled',
        status_timeline: updatedTimeline,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Free the slot lock
      const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
      const bookingStartObj = new Date(b.start_time);
      const dateStr = formatterDate.format(bookingStartObj);
      const timeStr = formatterTime.format(bookingStartObj);
      const lockDocRef = doc(db, 'session_locks', `${dateStr}_${timeStr.replace(':', '-')}`);
      await deleteDoc(lockDocRef).catch(() => { });

      toast.success('Session cancelled successfully.');
    } catch (e) {
      toast.error('Failed to cancel session.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestReschedule = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div
      onClick={onSelect}
      className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:border-gold/30 hover:shadow-glow transition-all space-y-4 text-left cursor-pointer"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Booking ID</p>
          <p className="text-xs font-mono font-semibold text-foreground">{b.id}</p>
        </div>
        <div className="flex gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border',
            b.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            b.status === 'pending' && 'bg-warning/10 text-warning border-warning/20',
            b.status === 'completed' && 'bg-primary/10 text-primary border-primary/20',
            (b.status === 'cancelled' || b.status === 'rejected') && 'bg-destructive/10 text-destructive border-destructive/20'
          )}>
            Status: {b.status}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border',
            b.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-warning/10 text-warning border-warning/20'
          )}>
            Payment: {b.payment_status}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Service</p>
          <p className="font-semibold text-foreground">{b.service_title || 'Healing Session'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Session Time</p>
          <p className="font-medium text-foreground">{formatInTz(b.start_time, timezone, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p className="text-[10px] text-muted-foreground capitalize">Mode: {b.mode}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount Paid</p>
          <p className="font-semibold text-foreground">{formatPrice(b.amount || 0, b.currency as any)}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-border/20 flex flex-wrap justify-between items-center gap-2">
        <span className="text-xs text-gold font-medium hover:underline flex items-center gap-1">
          View full details &rarr;
        </span>

        {((b.status === 'confirmed' || b.status === 'pending') && new Date(b.start_time).getTime() > Date.now()) && (
          <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {b.status === 'confirmed' && b.reschedule_request?.status === 'pending' && (
              <span className="text-[10px] bg-warning/10 text-warning px-2.5 py-1 rounded-full border border-warning/20">
                Reschedule Requested
              </span>
            )}

            {requesting ? (
              <div className="space-y-3 p-3 rounded-2xl bg-secondary/50 border border-border/30 w-full mt-2">
                <p className="font-semibold text-foreground text-xs">Propose New Session Time</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-semibold">Date</label>
                    <Input
                      type="date"
                      value={reschedDate}
                      onChange={(e) => setReschedDate(e.target.value)}
                      className="rounded-xl mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-semibold">Time</label>
                    <Input
                      type="time"
                      value={reschedTime}
                      onChange={(e) => setReschedTime(e.target.value)}
                      className="rounded-xl mt-1 text-xs h-8"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" variant="outline" onClick={() => setRequesting(false)} className="rounded-full text-xs h-7 px-3">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleRequestReschedule} disabled={submittingRequest} className="rounded-full text-xs h-7 px-3 bg-gold hover:bg-gold-hover text-gold-foreground">
                    {submittingRequest ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {b.status === 'confirmed' && (
                  <Button size="sm" variant="outline" onClick={() => setRequesting(true)} className="rounded-full text-xs h-8">
                    Request Reschedule
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancelling}
                  onClick={handleCancelBooking}
                  className="rounded-full text-xs h-8 border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Session'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
