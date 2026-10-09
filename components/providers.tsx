'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { SmoothScroll } from '@/components/site/smooth-scroll';
import { PageTransition } from '@/components/site/page-transition';
import { PageLoader } from '@/components/site/page-loader';
import { AuthProvider } from '@/components/providers/auth-provider';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { CartProvider } from '@/components/providers/cart-provider';
import { WishlistProvider } from '@/components/providers/wishlist-provider';
import dynamic from 'next/dynamic';
import { MetaTrackingProvider } from '@/components/providers/meta-tracking-provider';

const CinematicVideoBg = dynamic(
  () => import('@/components/site/cinematic-video-bg'),
  { ssr: false }
);

const CustomCursor = dynamic(
  () => import('@/components/site/custom-cursor'),
  { ssr: false }
);

const SoundToggle = dynamic(
  () => import('@/components/site/sound-toggle'),
  { ssr: false }
);

const FloatingPetals = dynamic(
  () => import('@/components/site/floating-petals'),
  { ssr: false }
);

import { ConfirmProvider } from '@/components/providers/confirm-provider';

export function Providers({ children, pixelId }: { children: React.ReactNode; pixelId: string }) {
  return (
    <MetaTrackingProvider pixelId={pixelId}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <PageLoader />
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <WishlistProvider>
                <SmoothScroll>
                  <ConfirmProvider>
                    <CinematicVideoBg />
                    <SoundToggle />
                    <FloatingPetals />
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </ConfirmProvider>
                </SmoothScroll>
                <Toaster />
                <SonnerToaster />
              </WishlistProvider>
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </MetaTrackingProvider>
  );
}
