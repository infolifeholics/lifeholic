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

  // Hide chrome on admin routes
  if (pathname.startsWith('/admin')) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-soft',
        scrolled ? 'py-2.5' : 'py-5'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 ease-soft',
            scrolled ? 'glass-strong shadow-soft' : 'bg-transparent'
          )}
        >
          <Link href="/" className="flex items-center" aria-label="TheLifeHolics home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/shop/wishlist"
              className="hidden rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex"
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
              className="relative rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
              className="hidden rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex"
              aria-label="Account"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>
            <Button asChild size="sm" className="ml-1 hidden rounded-full md:inline-flex">
              <Link href="/booking">Book a Session</Link>
            </Button>
            <button
              className="rounded-full p-2.5 text-foreground lg:hidden"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="mt-2 rounded-3xl glass-strong p-4 shadow-float lg:hidden">
            <nav className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-base font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild className="mt-3 rounded-full">
                <Link href="/booking">Book a Session</Link>
              </Button>
              <div className="mt-3 flex items-center gap-3 px-2 text-sm text-muted-foreground">
                <Link href="/shop/wishlist" className="inline-flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <Link href={user ? '/account' : '/auth/login'} className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" /> {user ? 'Account' : 'Sign in'}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
