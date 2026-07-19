'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Download, Heart, LogOut, Package, Settings, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatInTz } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items: Array<{ name: string; quantity: number; price: number; type?: string }>;
};
type Booking = {
  id: string;
  start_time: string;
  mode: string;
  status: string;
  notes: string | null;
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
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Kolkata');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('id, number, status, total, currency, created_at, items')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) || []));

    supabase
      .from('bookings')
      .select('id, start_time, mode, status, notes')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .then(({ data }) => setBookings((data as Booking[]) || []));
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setTimezone(profile.timezone || 'Asia/Kolkata');
    }
  }, [profile]);

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
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, timezone })
      .eq('id', user.id);
    setSaving(false);
    if (error) return toast.error('Could not save.');
    await refreshProfile();
    toast.success('Profile updated.');
  };

  return (
    <div className="pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
              Hello, {profile?.full_name || user.email}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Welcome to your calm corner of the site.</p>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="rounded-full">
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>

        <div className="mt-10">
          <Tabs defaultValue="orders">
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto rounded-full bg-secondary/60 p-1">
              <TabsTrigger value="orders" className="rounded-full"><Package className="mr-1.5 h-4 w-4" /> Orders</TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-full"><Calendar className="mr-1.5 h-4 w-4" /> Sessions</TabsTrigger>
              <TabsTrigger value="wishlist" className="rounded-full"><Heart className="mr-1.5 h-4 w-4" /> Wishlist</TabsTrigger>
              <TabsTrigger value="profile" className="rounded-full"><Settings className="mr-1.5 h-4 w-4" /> Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-8">
              {orders.length === 0 ? (
                <Empty icon={ShoppingBag} title="No orders yet" desc="Your purchases will appear here." cta={{ href: '/shop', label: 'Browse the shop' }} />
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-lg font-medium text-foreground">{o.number}</p>
                        <span className={cn('rounded-full px-3 py-1 text-xs font-medium capitalize', STATUS_COLORS[o.status] || 'bg-secondary text-muted-foreground')}>{o.status}</span>
                      </div>
                      <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                        {o.items.map((i, idx) => <li key={idx}>{i.name} × {i.quantity}</li>)}
                      </ul>
                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-sm">
                        <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className="font-medium text-foreground">{formatPrice(o.total, o.currency as 'INR' | 'USD')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="mt-8">
              {bookings.length === 0 ? (
                <Empty icon={Calendar} title="No sessions yet" desc="Your bookings will appear here." cta={{ href: '/booking', label: 'Book a session' }} />
              ) : (
                <div className="space-y-4">
                  {bookings.map((b) => (
                    <div key={b.id} className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-lg font-medium text-foreground">
                          {formatInTz(b.start_time, profile?.timezone || 'Asia/Kolkata', { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                        <span className={cn('rounded-full px-3 py-1 text-xs font-medium capitalize', STATUS_COLORS[b.status] || 'bg-secondary text-muted-foreground')}>{b.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground capitalize">{b.mode} session</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wishlist" className="mt-8">
              <Empty icon={Heart} title="Your saved items" desc="Anything you heart in the shop lives here." cta={{ href: '/shop/wishlist', label: 'View wishlist' }} />
            </TabsContent>

            <TabsContent value="profile" className="mt-8">
              <div className="max-w-md space-y-4 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
                <div>
                  <Label htmlFor="p-name">Full name</Label>
                  <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" value={user.email || ''} disabled className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="p-phone">Phone</Label>
                  <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="p-tz">Timezone</Label>
                  <Input id="p-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5" />
                </div>
                <Button onClick={saveProfile} disabled={saving} className="rounded-full">
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
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
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="mt-4 font-display text-xl text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Button asChild className="mt-5 rounded-full"><Link href={cta.href}>{cta.label}</Link></Button>
    </div>
  );
}
