'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ShoppingBag, Heart, User } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/providers/cart-provider';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/shop', label: 'Shop' },
  { href: '/blog', label: 'Journal' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (pathname.startsWith('/admin')) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled ? 'py-3' : 'py-6'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex items-center justify-between rounded-full px-5 py-3 transition-all duration-500 border glow-border',
            scrolled 
              ? 'glass-strong shadow-glow backdrop-blur-md bg-black/10 border-white/5' 
              : 'bg-transparent border-transparent'
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
                  'relative rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 border border-transparent',
                  isActive(item.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/10 hover:backdrop-blur-md hover:border-white/5 hover:shadow-soft hover:scale-105'
                )}
              >
                <span className="relative z-10">{item.label}</span>
                {isActive(item.href) && (
                  <motion.span
                    layoutId="activeNav"
                    className="absolute inset-0 z-0 rounded-full bg-white/10 shadow-soft"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/shop/wishlist"
              className="hidden rounded-full p-2.5 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground sm:inline-flex"
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
              className="relative rounded-full p-2.5 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
              aria-label="Cart"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {count > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-gold-foreground">
                  {count}
                </span>
              )}
            </Link>
            <Link
              href={user ? '/account' : '/auth/login'}
              className="hidden rounded-full p-2.5 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground sm:inline-flex"
              aria-label="Account"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>
            <Button asChild size="sm" className="ml-1 hidden rounded-full md:inline-flex bg-primary hover:bg-primary/80 transition-all hover:scale-105">
              <Link href="/booking">Book a Session</Link>
            </Button>
            <button
              className="rounded-full p-2.5 text-foreground lg:hidden hover:bg-white/10 transition-colors"
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
              className="mt-2.5 rounded-3xl glass-strong p-5 shadow-glow border border-white/10 lg:hidden backdrop-blur-lg"
            >
              <nav className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-base font-medium transition-all',
                      isActive(item.href)
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-4 rounded-full py-6 text-base bg-primary hover:bg-primary/80">
                  <Link href="/booking">Book a Session</Link>
                </Button>
                <div className="mt-4 flex items-center justify-around gap-3 border-t border-white/5 pt-4 text-sm text-muted-foreground">
                  <Link href="/shop/wishlist" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                    <Heart className="h-4.5 w-4.5" /> Wishlist
                  </Link>
                  <Link href={user ? '/account' : '/auth/login'} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                    <User className="h-4.5 w-4.5" /> {user ? 'Account' : 'Sign in'}
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
