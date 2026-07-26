'use client';

import { useEffect, useState, useRef } from 'react';
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
import {
  ArrowLeft,
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  Image as ImageIcon,
  Users,
  Tag,
  Sparkles,
  FileText,
  Heart,
  Activity
} from 'lucide-react';
import { AdminLandingPage } from '@/components/admin/landing-page';
import { AdminServices } from '@/components/admin/services';
import { AdminMembers } from '@/components/admin/members';
import { AdminOffers } from '@/components/admin/offers';

// Import newly implemented components
import { AdminHealers } from '@/components/admin/healers';
import { AdminCoupons } from '@/components/admin/coupons';
import { AdminCMS } from '@/components/admin/cms';
import { AdminTestimonials } from '@/components/admin/testimonials';
import { AdminBlog } from '@/components/admin/blog';
import { AdminRecommendations } from '@/components/admin/recommendations';
import { AdminSettingsPanel } from '@/components/admin/settings-panel';
import { AdminWorkshops } from '@/components/admin/workshops';
import { AdminTodaysBookings } from '@/components/admin/todays-bookings';
import { AdminSlotsManagement } from '@/components/admin/slots-management';
import { AdminHolidayManagement } from '@/components/admin/holiday-management';
import { AdminQueueDashboard } from '@/components/admin/queue-dashboard';
import { AdminAnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { AdminErrorLogsViewer } from '@/components/admin/error-logs-viewer';
import { AlertTriangle, TrendingUp } from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics Trends', icon: TrendingUp },
  { id: 'todays_bookings', label: "Today's Bookings", icon: CalendarDays },
  { id: 'bookings', label: 'Bookings & Calendar', icon: CalendarDays },
  { id: 'slots_management', label: 'Session Slots', icon: Settings },
  { id: 'holiday_management', label: 'Holidays & Off-days', icon: CalendarDays },
  { id: 'workshops', label: 'Workshops', icon: CalendarDays },
  { id: 'healers', label: 'Healers', icon: Users },
  { id: 'services', label: 'Services', icon: Settings },
  { id: 'recommendations', label: 'Recommendation Rules', icon: Sparkles },
  { id: 'coupons', label: 'Discount Coupons', icon: Tag },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'messages', label: 'Messages & Contact', icon: Inbox },
  { id: 'cms', label: 'CMS Manager', icon: ImageIcon },
  { id: 'landing_page', label: 'Landing Page Assets', icon: ImageIcon },
  { id: 'testimonials', label: 'Testimonials', icon: Heart },
  { id: 'blog', label: 'Articles & Blogs', icon: FileText },
  { id: 'queue_monitor', label: 'Notification Queue', icon: Activity },
  { id: 'error_logs', label: 'System Error Logs', icon: AlertTriangle },
  { id: 'settings', label: 'System Settings', icon: Settings },
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
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), where('handled', '==', false));
    getDocs(q).then((snap) => setCount(snap.size));
  }, []);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const delta = e.deltaY;

      // Scroll inside element manually
      el.scrollTop += delta;

      // Prevent default page scroll
      e.preventDefault();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background-2/40 pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-64 lg:shrink-0">
          <div ref={sidebarRef} className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-soft lg:sticky lg:top-8 max-h-[90vh] lg:max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain custom-scrollbar">
            <div className="flex items-center justify-between">
              <Logo showWordmark={false} />
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Admin</span>
            </div>
            <nav className="mt-6 flex flex-row gap-1 lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-full px-3.5 py-2.5 text-xs font-medium transition-colors lg:flex-none whitespace-nowrap',
                    section === n.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span>{n.label}</span>
                  {n.id === 'messages' && count > 0 && (
                    <span className="ml-auto rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground">{count}</span>
                  )}
                </button>
              ))}
            </nav>
            <Link href="/" className="mt-6 flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to site
            </Link>
          </div>
        </aside>

        <div className="flex-1">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground capitalize text-left">
            {NAV.find((n) => n.id === section)?.label}
          </h1>
          <div className="mt-6">
            {section === 'overview' && <AdminDashboard onNavigateSection={setSection} />}
            {section === 'analytics' && <AdminAnalyticsDashboard />}
            {section === 'todays_bookings' && <AdminTodaysBookings />}
            {section === 'bookings' && <AdminDashboard onNavigateSection={setSection} />}
            {section === 'slots_management' && <AdminSlotsManagement />}
            {section === 'holiday_management' && <AdminHolidayManagement />}
            {section === 'workshops' && <AdminWorkshops />}
            {section === 'healers' && <AdminHealers />}
            {section === 'services' && <AdminServices />}
            {section === 'recommendations' && <AdminRecommendations />}
            {section === 'coupons' && <AdminCoupons />}
            {section === 'orders' && <AdminOrders />}
            {section === 'members' && <AdminMembers />}
            {section === 'messages' && <AdminMessages />}
            {section === 'cms' && <AdminCMS />}
            {section === 'landing_page' && <AdminLandingPage />}
            {section === 'testimonials' && <AdminTestimonials />}
            {section === 'blog' && <AdminBlog />}
            {section === 'queue_monitor' && <AdminQueueDashboard />}
            {section === 'error_logs' && <AdminErrorLogsViewer />}
            {section === 'settings' && <AdminSettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
