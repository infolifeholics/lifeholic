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
  Loader2
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, setDoc, doc } from 'firebase/firestore';
import { formatPrice, formatInTz } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items: Array<{ id?: string; name: string; quantity: number; price: number; type?: string; image?: string }>;
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
};

type Visit = {
  category: string;
  sub: string;
  item: string;
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

    // Load recent visits
    try {
      const visits = JSON.parse(localStorage.getItem('recent_visits') || '[]');
      setRecentVisits(visits);
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
    getDocs(qBookings)
      .then((snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)))
      .catch((err) => console.error('Error fetching user bookings:', err));
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
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

  const saveProfile = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'profiles', user.id),
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
      if (!res.ok) throw new Error('Failed to upload image.');
      const data = await res.json();
      const newUrl = data.url;

      await setDoc(
        doc(db, 'profiles', user.id),
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

  // Booking filtering
  const now = new Date();
  const upcomingSessions = bookings.filter(b => b.status === 'confirmed' && new Date(b.start_time) > now);
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <div className="pt-28 pb-20 sm:pt-36">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* PREMIUM BIO CARD */}
        <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8 shadow-soft mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
            
            {/* Avatar Column */}
            <div className="relative group shrink-0">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={fullName || 'Avatar'} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer shadow-md hover:bg-primary/95 transition-all">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" disabled={uploading} onChange={handleAvatarReplace} className="hidden" />
              </label>
            </div>

            {/* Profile info Column */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
                      {profile?.full_name || 'Your Name'}
                    </h1>
                    {profile?.member_id && (
                      <span className="rounded-full bg-gold/10 text-gold border border-gold/20 px-2.5 py-0.5 text-xs font-semibold">
                        {profile.member_id}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">@{user.email?.split('@')[0]}</p>
                </div>
                <div className="flex justify-center md:justify-end gap-2">
                  {profile?.is_admin && (
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link href="/admin">Admin Panel</Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => signOut()} className="rounded-full">
                    <LogOut className="mr-1 h-3.5 w-3.5" /> Sign out
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex justify-center md:justify-start gap-8 py-2 border-y border-border/40">
                <div>
                  <span className="font-semibold text-foreground">{upcomingSessions.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Upcoming</span>
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
          <Tabs defaultValue="upcoming">
            <TabsList className="flex w-full justify-around rounded-full bg-secondary/60 p-1 overflow-x-auto flex-nowrap min-w-full custom-scrollbar">
              <TabsTrigger value="upcoming" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><Clock className="mr-1.5 h-4 w-4" /> Upcoming</TabsTrigger>
              <TabsTrigger value="confirmed" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirmed</TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><AlertCircle className="mr-1.5 h-4 w-4" /> Pending</TabsTrigger>
              <TabsTrigger value="visits" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><Activity className="mr-1.5 h-4 w-4" /> Visits</TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><CreditCard className="mr-1.5 h-4 w-4" /> Payments</TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 rounded-full py-2.5 whitespace-nowrap"><Settings className="mr-1.5 h-4 w-4" /> Settings</TabsTrigger>
            </TabsList>

            {/* 1. UPCOMING SESSIONS */}
            <TabsContent value="upcoming" className="mt-6">
              {upcomingSessions.length === 0 ? (
                <Empty icon={Calendar} title="No upcoming sessions" desc="Your upcoming confirmed healing sessions will show up here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {upcomingSessions.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:border-gold/30 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Confirmed</span>
                        <h4 className="font-display text-lg font-medium text-foreground mt-2">{b.service_title || 'Healing Session'}</h4>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">Mode: {b.mode}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Date: {formatInTz(b.start_time, timezone, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                        {b.notes && <p className="mt-2 text-xs bg-muted/50 p-2 rounded-lg text-muted-foreground">Notes: {b.notes}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <a href={`/booking/success?service=clarity&date=${encodeURIComponent(b.start_time)}&tz=${encodeURIComponent(timezone)}`}>View Pass</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 2. CONFIRMED BOOKINGS */}
            <TabsContent value="confirmed" className="mt-6">
              {confirmedBookings.length === 0 ? (
                <Empty icon={CheckCircle2} title="No confirmed bookings" desc="Explore our services to schedule a transformation." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="grid gap-4">
                  {confirmedBookings.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h4 className="font-display text-lg font-medium text-foreground">{b.service_title || 'Healing Session'}</h4>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">Mode: {b.mode}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Scheduled: {formatInTz(b.start_time, timezone, { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-semibold self-start sm:self-auto">Paid &amp; Confirmed</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 3. PENDING BOOKINGS */}
            <TabsContent value="pending" className="mt-6">
              {pendingBookings.length === 0 ? (
                <Empty icon={AlertCircle} title="No pending bookings" desc="All your payments and sessions are fully processed." cta={{ href: '/booking', label: 'Schedule new session' }} />
              ) : (
                <div className="grid gap-4">
                  {pendingBookings.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-warning/30 bg-card p-5 shadow-soft flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <span className="rounded-full bg-warning/15 text-warning border border-warning/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Payment Pending</span>
                        <h4 className="font-display text-lg font-medium text-foreground mt-2">{b.service_title || 'Healing Session'}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Date Slot: {formatInTz(b.start_time, timezone, { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-1.5">Amount: {formatPrice(b.amount || 0, b.currency as any)}</p>
                      </div>
                      <Button asChild size="sm" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground shrink-0 gap-1.5 shadow-soft">
                        <Link href={`/booking/payment?id=${b.id}`}>
                          <span>Resume Payment</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 4. RECENT VISITS */}
            <TabsContent value="visits" className="mt-6">
              {recentVisits.length === 0 ? (
                <Empty icon={Activity} title="No visits recorded" desc="Explore concern areas in the search dropdown to populate this." cta={{ href: '/', label: 'Go to Search' }} />
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <h3 className="font-display text-lg font-medium text-foreground">Explored concern pathways</h3>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('recent_visits');
                        setRecentVisits([]);
                        toast.success('Recent visits cleared.');
                      }} 
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {recentVisits.map((v, idx) => (
                      <div key={idx} className="p-4 border border-border/50 bg-card rounded-xl shadow-soft flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-gold uppercase font-semibold tracking-wider">
                            <span>{v.category}</span>
                            <span>&middot;</span>
                            <span>{v.sub}</span>
                          </div>
                          <p className="text-sm text-foreground font-medium mt-1.5">{v.item}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3">
                          Explored: {new Date(v.timestamp).toLocaleDateString()} at {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 5. PAYMENT HISTORY */}
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

            {/* 6. SETTINGS / PERSONAL INFORMATION */}
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
