'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { SmoothScroll } from '@/components/site/smooth-scroll';
import { PageTransition } from '@/components/site/page-transition';
import { PageLoader } from '@/components/site/page-loader';
import { AuthProvider } from '@/components/providers/auth-provider';
import { CartProvider } from '@/components/providers/cart-provider';
import { WishlistProvider } from '@/components/providers/wishlist-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <PageLoader />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <SmoothScroll>
              <PageTransition>{children}</PageTransition>
            </SmoothScroll>
            <Toaster />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
