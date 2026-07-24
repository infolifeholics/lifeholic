'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Download,
  Heart,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Trash2,
  Bookmark,
  ExternalLink,
  Plus
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
  mode: string;
  status: string;
  notes: string | null;
  service_title?: string;
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  fulfilled: 'bg-success/15 text-success',
  confirmed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

export function AccountDashboard() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    // Load products for empty orders recommendation and wishlist names
    getDocs(collection(db, 'products'))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)))
      .catch((err) => console.error('Error fetching products:', err));
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

  // Handle auto select new wishlist items
  useEffect(() => {
    setSelectedWishlistIds((prev) => {
      return prev.filter((id) => wishlistIds.includes(id));
    });
  }, [wishlistIds]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>;
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
      toast.success('Profile updated.');
    } catch (error) {
      toast.error('Could not save.');
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
      // 1. Upload new image
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload image.');
      const data = await res.json();
      const newUrl = data.url;

      // 2. Save new url to state and Firestore immediately
      await setDoc(
        doc(db, 'profiles', user.id),
        { avatar_url: newUrl },
        { merge: true }
      );
      setAvatarUrl(newUrl);

      // 3. Delete old image if exists
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

  // Wishlist calculations
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));
  const selectedWishlistProducts = wishlistProducts.filter((p) => selectedWishlistIds.includes(p.id));
  const wishlistTotal = selectedWishlistProducts.reduce((sum, p) => sum + p.price_inr, 0);

  const toggleSelectWishlist = (id: string) => {
    setSelectedWishlistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllWishlist = () => {
    if (selectedWishlistIds.length === wishlistProducts.length) {
      setSelectedWishlistIds([]);
    } else {
      setSelectedWishlistIds(wishlistProducts.map((p) => p.id));
    }
  };

  return (
    <div className="pt-28 pb-20 sm:pt-36">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* INSTAGRAM-STYLE PROFILE SECTION */}
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 md:p-8 shadow-soft mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
            
            {/* Avatar Column */}
            <div className="relative group">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl md:text-3xl font-medium text-foreground">
                      {profile?.full_name || 'Your Name'}
                    </h1>
                    {profile?.member_id && (
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-semibold">
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
                  <span className="font-semibold text-foreground">{orders.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Orders</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{bookings.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Sessions</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{wishlistIds.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">Wishlist</span>
                </div>
              </div>

              {/* Bio & Details Grid */}
              <div className="space-y-2">
                {bio && <p className="text-sm text-foreground/90 whitespace-pre-line">{bio}</p>}
                
                <div className="grid gap-2 text-xs md:text-sm text-muted-foreground mt-4">
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
                  {address && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                      <span className="text-left">{address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PROFILE NAVIGATION TABS */}
        <div>
          <Tabs defaultValue="orders">
            <TabsList className="flex w-full justify-around rounded-full bg-secondary/60 p-1">
              <TabsTrigger value="orders" className="flex-1 rounded-full py-2.5"><Package className="mr-1.5 h-4 w-4" /> Orders</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1 rounded-full py-2.5"><Calendar className="mr-1.5 h-4 w-4" /> Sessions</TabsTrigger>
              <TabsTrigger value="wishlist" className="flex-1 rounded-full py-2.5"><Heart className="mr-1.5 h-4 w-4" /> Wishlist</TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 rounded-full py-2.5"><Settings className="mr-1.5 h-4 w-4" /> Profile Setup</TabsTrigger>
            </TabsList>

            {/* TAB CONTENT: ORDERS */}
            <TabsContent value="orders" className="mt-6">
              {orders.length === 0 ? (
                <div className="space-y-10">
                  <Empty
                    icon={ShoppingBag}
                    title="No orders yet"
                    desc="Your orders are currently empty. Check out our collections below."
                    cta={{ href: '/shop', label: 'Go to Shop' }}
                  />
                  {products.length > 0 && (
                    <div>
                      <h3 className="font-display text-2xl font-medium text-foreground mb-6">Recommended Products</h3>
                      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                        {products.slice(0, 3).map((p) => (
                          <Link key={p.id} href={`/shop/${p.slug}`} className="group block rounded-2xl border border-border/40 bg-card p-3 shadow-soft hover:-translate-y-1 transition-all duration-300">
                            <div className="aspect-square overflow-hidden rounded-xl bg-secondary mb-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.image} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-all duration-500" />
                            </div>
                            <h4 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-all line-clamp-1">{p.name}</h4>
                            <p className="text-sm font-medium text-foreground mt-1">{formatPrice(p.price_inr, 'INR')}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/40">
                        <div>
                          <p className="font-display font-medium text-foreground text-lg">{o.number}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider', STATUS_COLORS[o.status] || 'bg-secondary text-muted-foreground')}>{o.status}</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="py-4 space-y-4">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="h-16 w-16 rounded-xl overflow-hidden bg-secondary border border-border/40 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.image || 'https://images.pexels.com/photos/3182452/pexels-photo-3182452.jpeg?auto=compress&cs=tinysrgb&w=150'} alt={item.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground text-sm line-clamp-2">{item.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">Quantity: {item.quantity}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-medium text-foreground text-sm">{formatPrice(item.price || 0, o.currency as 'INR' | 'USD')}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-border/40 flex justify-between items-center text-sm font-semibold">
                        <span className="text-muted-foreground">Order Total</span>
                        <span className="text-lg text-foreground">{formatPrice(o.total, o.currency as 'INR' | 'USD')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB CONTENT: BOOKINGS/SESSIONS */}
            <TabsContent value="bookings" className="mt-6">
              {bookings.length === 0 ? (
                <Empty icon={Calendar} title="No sessions yet" desc="Your bookings will appear here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="space-y-4">
                  {bookings.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-lg font-medium text-foreground">
                          {formatInTz(b.start_time, profile?.timezone || 'Asia/Kolkata', { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                        <span className={cn('rounded-full px-3 py-1 text-xs font-medium capitalize', STATUS_COLORS[b.status] || 'bg-secondary text-muted-foreground')}>{b.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground capitalize">{b.service_title || `${b.mode} Session`}</p>
                      {b.notes && <p className="mt-3 text-xs bg-secondary/50 rounded-lg p-3 text-muted-foreground border border-border/20">Notes: {b.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB CONTENT: WISHLIST WITH CHECKBOX PRICING */}
            <TabsContent value="wishlist" className="mt-6">
              {wishlistProducts.length === 0 ? (
                <Empty icon={Heart} title="Your wishlist is empty" desc="Start listing items by hearting products." cta={{ href: '/shop', label: 'Explore Shop' }} />
              ) : (
                <div className="space-y-6">
                  {/* Select Bar */}
                  <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/30">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedWishlistIds.length === wishlistProducts.length && wishlistProducts.length > 0}
                        onChange={toggleSelectAllWishlist}
                        className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-foreground">Select All ({selectedWishlistIds.length} / {wishlistProducts.length})</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Selected Items Price:</span>
                      <span className="font-semibold text-foreground text-lg">{formatPrice(wishlistTotal, 'INR')}</span>
                    </div>
                  </div>

                  {/* List */}
                  <div className="grid gap-4">
                    {wishlistProducts.map((p) => (
                      <div key={p.id} className="flex gap-4 p-4 border border-border/50 bg-card rounded-2xl items-center shadow-soft hover:shadow-md transition-all">
                        <input
                          type="checkbox"
                          checked={selectedWishlistIds.includes(p.id)}
                          onChange={() => toggleSelectWishlist(p.id)}
                          className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                        />
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-secondary border border-border/40 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/shop/${p.slug}`} className="hover:text-primary transition-all">
                            <h4 className="font-display font-medium text-foreground text-base truncate">{p.name}</h4>
                          </Link>
                          <p className="text-sm font-semibold text-primary mt-1">{formatPrice(p.price_inr, 'INR')}</p>
                        </div>
                        <div className="flex flex-col gap-2 justify-center items-end shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => toggleWishlist(p.id)} className="rounded-full text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB CONTENT: PROFILE EDIT */}
            <TabsContent value="profile" className="mt-6">
              <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-soft">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="p-name">Full name</Label>
                    <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="p-phone">Phone number</Label>
                    <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" placeholder="e.g. +91 9876543210" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="p-email">Email (Cannot be changed)</Label>
                  <Input id="p-email" value={user.email || ''} disabled className="mt-1.5 bg-secondary/50 cursor-not-allowed" />
                </div>

                <div>
                  <Label htmlFor="p-tz">Timezone</Label>
                  <Input id="p-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5" />
                </div>

                <div>
                  <Label htmlFor="p-bio">Bio</Label>
                  <Textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5 min-h-[80px]" placeholder="Tell us about yourself..." />
                </div>

                <div>
                  <Label htmlFor="p-addr">Delivery Address</Label>
                  <Textarea id="p-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5 min-h-[80px]" placeholder="Full address for shipping orders..." />
                </div>

                <div className="pt-2">
                  <Button onClick={saveProfile} disabled={saving} className="rounded-full w-full sm:w-auto px-8">
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
