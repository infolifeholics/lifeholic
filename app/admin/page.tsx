'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { formatPrice, formatInTz } from '@/lib/format';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminDashboard } from '@/components/admin/dashboard';
import { AdminAvailability } from '@/components/admin/availability';
import { AdminOrders } from '@/components/admin/orders';
import { AdminMessages } from '@/components/admin/messages';
import { Logo } from '@/components/site/logo';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Inbox, LayoutDashboard, Package, Settings, Image as ImageIcon } from 'lucide-react';
import { AdminLandingPage } from '@/components/admin/landing-page';
import { AdminServices } from '@/components/admin/services';
import { AdminMembers } from '@/components/admin/members';
import { AdminOffers } from '@/components/admin/offers';
import { Users, Tag } from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings & availability', icon: CalendarDays },
  { id: 'services', label: 'Services', icon: Settings },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'offers', label: 'Offers & Promos', icon: Tag },
  { id: 'messages', label: 'Messages', icon: Inbox },
  { id: 'landing', label: 'Landing Page', icon: ImageIcon },
] as const;

type Section = (typeof NAV)[number]['id'];

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminShell />
    </AdminGuard>
  );
}

function AdminShell() {
  const [section, setSection] = useState<Section>('overview');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'messages'), where('handled', '==', false));
    getDocs(q).then((snap) => setCount(snap.size));
  }, []);

  return (
    <div className="min-h-screen bg-background-2/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-soft lg:sticky lg:top-8">
            <div className="flex items-center justify-between">
              <Logo showWordmark={false} />
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Admin</span>
            </div>
            <nav className="mt-6 flex flex-row gap-1 lg:flex-col overflow-x-auto">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors lg:flex-none',
                    section === n.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{n.label}</span>
                  {n.id === 'messages' && count > 0 && (
                    <span className="ml-auto rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground">{count}</span>
                  )}
                </button>
              ))}
            </nav>
            <Link href="/" className="mt-6 flex items-center gap-2 rounded-full px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to site
            </Link>
          </div>
        </aside>

        <div className="flex-1">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground capitalize">
            {NAV.find((n) => n.id === section)?.label}
          </h1>
          <div className="mt-6">
            {section === 'overview' && <AdminDashboard />}
            {section === 'bookings' && (
              <div className="space-y-8">
                <AdminDashboard />
                <AdminAvailability />
              </div>
            )}
            {section === 'services' && <AdminServices />}
            {section === 'orders' && <AdminOrders />}
            {section === 'members' && <AdminMembers />}
            {section === 'offers' && <AdminOffers />}
            {section === 'messages' && <AdminMessages />}
            {section === 'landing' && <AdminLandingPage />}
          </div>
        </div>
      </div>
    </div>
  );
}
