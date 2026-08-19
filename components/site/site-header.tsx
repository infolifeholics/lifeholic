'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ShoppingBag, Heart, User, Bell } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/providers/cart-provider';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const NAV = [
  // { href: '/', label: 'Home' },
  { href: '/about', label: 'Our Story' },
  { href: '/services', label: 'Services' },
  { href: '/shop', label: 'Products' },
  { href: '/workshops', label: 'Workshops' },
  { href: '/community', label: 'Community' },

  // { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { user, profile, refreshProfile } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const qNotifs = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsubscribe = onSnapshot(qNotifs, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error listening to notifications in header:', err);
    });
    return () => unsubscribe();
  }, [user]);

  // Lock body scroll when notifications dropdown is open
  useEffect(() => {
    if (showNotifDropdown) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showNotifDropdown]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkSingleRead = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) { }
  };

  const [showWhatsAppBanner, setShowWhatsAppBanner] = useState(false);
  const [whatsappVal, setWhatsappVal] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user && profile && !profile.whatsapp && !dismissed) {
      setShowWhatsAppBanner(true);
    } else {
      setShowWhatsAppBanner(false);
    }
  }, [user, profile, dismissed]);

  const handleSaveWhatsapp = async () => {
    const sanitized = whatsappVal.replace(/[^0-9+]/g, '');
    if (sanitized.length < 10) {
      toast.error('Please enter a valid WhatsApp number (minimum 10 digits).');
      return;
    }
    setSavingWhatsapp(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await setDoc(doc(db, 'profiles', user!.uid), { whatsapp: sanitized }, { merge: true });
      await refreshProfile();
      toast.success('WhatsApp number saved successfully!');
      setDismissed(true);
    } catch (e) {
      toast.error('Failed to save WhatsApp number.');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  useEffect(() => {
    let lastValue = window.scrollY > 24;
    const onScroll = () => {
      const isScrolled = window.scrollY > 24;
      if (isScrolled !== lastValue) {
        lastValue = isScrolled;
        setScrolled(isScrolled);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (pathname.startsWith('/admin')) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {showWhatsAppBanner && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-gold text-gold-foreground py-2 px-4 text-xs font-semibold flex items-center justify-between shadow-soft">
          <div className="flex-1 flex items-center justify-center gap-3 flex-wrap">
            <span>Stay updated with your booking on WhatsApp. Please add your WhatsApp number.</span>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                placeholder="e.g. +919876543210"
                value={whatsappVal}
                onChange={(e) => setWhatsappVal(e.target.value)}
                className="bg-gold-foreground/10 border border-gold-foreground/20 rounded-full px-3 py-1 text-xs text-gold-foreground placeholder:text-gold-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold-foreground/55 w-44"
              />
              <button
                onClick={handleSaveWhatsapp}
                disabled={savingWhatsapp}
                className="bg-gold-foreground text-gold rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-foreground/90 transition-colors"
              >
                {savingWhatsapp ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 rounded-full hover:bg-gold-foreground/10 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <header
        className={cn(
          'fixed inset-x-0 z-50 transition-all duration-500',
          showWhatsAppBanner ? 'top-10' : 'top-0',
          scrolled ? 'py-3' : 'py-6'
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex items-center justify-between rounded-full px-5 py-3 transition-all duration-500 border glow-border',
              scrolled
                ? 'bg-white shadow-glow backdrop-blur-md border-black/5'
                : 'bg-white/90 backdrop-blur-md border-black/5'
            )}
          >
            <Link href="/" className="flex items-center transition-transform duration-300 hover:scale-105" aria-label="TheLifeHolics home">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-3 lg:flex" aria-label="Primary">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 border border-transparent',
                    isActive(item.href)
                      ? 'text-black'
                      : 'text-black/85 hover:text-black hover:bg-black/10 hover:backdrop-blur-md hover:border-black/5 hover:shadow-soft hover:scale-105'
                  )}
                >
                  <span className="relative z-10">{item.label}</span>
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute inset-0 z-0 rounded-full bg-black/5 shadow-soft"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/shop/wishlist"
                className="hidden rounded-full p-2.5 text-black/85 transition-all hover:bg-black/10 hover:text-black sm:inline-flex"
                aria-label="Wishlist"
              >
                <Heart className="h-[18px] w-[18px]" />
                {wishCount > 0 && (
                  <span className="absolute -mt-5 ml-3 rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground">
                    {wishCount}
                  </span>
                )}
              </Link>
              <Link
                href="/shop/cart"
                className="relative rounded-full p-2.5 text-black/85 transition-all hover:bg-black/10 hover:text-black"
                aria-label="Cart"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {count > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-gold-foreground">
                    {count}
                  </span>
                )}
              </Link>
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="relative rounded-full p-2.5 text-black/85 transition-all hover:bg-black/10 hover:text-black"
                    aria-label="Notifications"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-gold-foreground animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#161210]/95 backdrop-blur-xl p-4 shadow-glow z-50 text-left"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3">
                            <span className="font-semibold text-sm text-white">Notifications</span>
                            <button
                              onClick={async () => {
                                try {
                                  const { doc, writeBatch } = await import('firebase/firestore');
                                  const batch = writeBatch(db);
                                  notifications.forEach((n) => {
                                    if (!n.read) batch.update(doc(db, 'notifications', n.id), { read: true });
                                  });
                                  await batch.commit();
                                  toast.success('All notifications marked as read.');
                                } catch (e) {
                                  toast.error('Failed to mark notifications.');
                                }
                              }}
                              className="text-xs text-gold hover:underline"
                            >
                              Mark all read
                            </button>
                          </div>
                          <div className="max-h-72 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                            {notifications.length === 0 ? (
                              <p className="text-xs text-white/60 text-center py-6">No notifications found.</p>
                            ) : (
                              notifications.slice(0, 5).map((n) => (
                                <div
                                  key={n.id}
                                  onClick={async () => {
                                    if (!n.read) await handleMarkSingleRead(n.id);
                                    setShowNotifDropdown(false);
                                    window.location.href = '/account?tab=notifications';
                                  }}
                                  className={cn(
                                    "p-2.5 rounded-xl border text-xs cursor-pointer transition-colors",
                                    n.read ? "bg-white/5 border-transparent text-white/50" : "bg-gold/10 border-gold/30 text-white font-medium"
                                  )}
                                >
                                  <p className="font-semibold text-[11px] text-white">{n.title}</p>
                                  <p className="text-[10px] text-white/70 line-clamp-2 mt-0.5">{n.message}</p>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="border-t border-white/10 mt-3 pt-2 text-center">
                            <Link
                              href="/account?tab=notifications"
                              onClick={() => setShowNotifDropdown(false)}
                              className="text-xs text-gold font-medium hover:underline inline-block"
                            >
                              View all notifications &rarr;
                            </Link>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <Link
                href={user ? '/account' : '/auth/login'}
                onClick={() => {
                  if (window.location.pathname === '/account') {
                    window.dispatchEvent(new CustomEvent('reset-account-dashboard'));
                  }
                }}
                className="hidden rounded-full p-2.5 text-black/85 transition-all hover:bg-black/10 hover:text-black sm:inline-flex"
                aria-label="Account"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
              {/* <Button asChild size="sm" className="ml-1 hidden rounded-full md:inline-flex bg-primary hover:bg-primary/80 transition-all hover:scale-105">
                <Link href="/booking">Book a Session</Link>
              </Button> */}
              <button
                className="rounded-full p-2.5 text-black lg:hidden hover:bg-black/10 transition-colors"
                aria-label="Toggle menu"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile drawer with motion animations */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-2.5 rounded-3xl bg-white p-5 shadow-glow border border-black/5 lg:hidden backdrop-blur-md"
              >
                <nav className="flex flex-col gap-1">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'rounded-2xl px-4 py-3 text-base font-bold transition-all flex items-center justify-between',
                        isActive(item.href)
                          ? 'bg-gold/10 text-gold border border-gold/30'
                          : 'text-black hover:bg-black/5 hover:text-black'
                      )}
                    >
                      <span className={cn(isActive(item.href) && 'font-extrabold')}>
                        {item.label}
                      </span>
                    </Link>
                  ))}
                  <Button asChild className="mt-4 rounded-full py-6 text-base bg-primary hover:bg-primary/80">
                    <Link href="/booking">Book a Session</Link>
                  </Button>
                  <div className="mt-4 flex items-center justify-around gap-3 border-t border-black/5 pt-4 text-sm font-bold text-black">
                    <Link href="/shop/wishlist" className="inline-flex items-center gap-2 hover:text-gold transition-colors">
                      <Heart className="h-4.5 w-4.5" /> Wishlist
                    </Link>
                    <Link
                      href={user ? '/account' : '/auth/login'}
                      onClick={() => {
                        if (window.location.pathname === '/account') {
                          window.dispatchEvent(new CustomEvent('reset-account-dashboard'));
                        }
                      }}
                      className="inline-flex items-center gap-2 hover:text-gold transition-colors"
                    >
                      <User className="h-4.5 w-4.5" /> {user ? 'Account' : 'Sign in'}
                    </Link>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}
