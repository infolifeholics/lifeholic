'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Package, Calendar, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { count: cartCount } = useCart();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadNotifications(snap.size);
    }, (err) => {
      console.error('Error listing unread notifications for mobile nav:', err);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  // Define tabs
  const tabs = [
    {
      name: 'Home',
      icon: Home,
      href: '/',
      isActive: pathname === '/'
    },
    {
      name: 'Orders',
      icon: Package,
      href: '/account?tab=orders',
      isActive: pathname === '/account' && searchParams.get('tab') === 'orders'
    },
    {
      name: 'Sessions',
      icon: Calendar,
      href: '/account?tab=upcoming',
      isActive: pathname === '/account' && (searchParams.get('tab') === 'upcoming' || searchParams.get('tab') === 'completed' || searchParams.get('tab') === 'cancelled')
    },
    {
      name: 'Cart',
      icon: ShoppingBag,
      href: '/account?tab=cart',
      isActive: pathname === '/account' && searchParams.get('tab') === 'cart',
      badge: cartCount
    },
    {
      name: 'Account',
      icon: User,
      href: '/account',
      isActive: pathname === '/account' && (searchParams.get('tab') === 'menu' || !searchParams.get('tab') || searchParams.get('tab') === 'personal'),
      badge: unreadNotifications
    }
  ];

  return (
    <div className="fixed bottom-5 inset-x-0 z-[49] flex justify-center px-4 md:hidden">
      <nav className="flex items-center justify-around w-full max-w-md h-16 px-4 bg-black border border-zinc-800 rounded-2xl shadow-glow transition-all duration-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              onClick={() => {
                if (window.location.pathname === '/account') {
                  window.dispatchEvent(new CustomEvent('reset-account-dashboard'));
                }
              }}
              className="relative flex flex-col items-center justify-center flex-1 h-full text-white/50 hover:text-white transition-colors duration-250 py-1 group"
            >
              <div className="relative p-1">
                <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-105", tab.isActive ? 'text-gold scale-110' : 'text-white/50 group-hover:text-white/80')} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-gold-foreground animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] mt-1 font-medium transition-all", tab.isActive ? 'text-gold font-semibold' : 'text-white/50 group-hover:text-white/85')}>
                {tab.name}
              </span>
              {tab.isActive && (
                <motion.div
                  layoutId="activeMobileTab"
                  className="absolute bottom-0.5 w-1 h-1 rounded-full bg-gold"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
