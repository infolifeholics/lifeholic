'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { SmoothScroll } from '@/components/site/smooth-scroll';
import { PageTransition } from '@/components/site/page-transition';
import { PageLoader } from '@/components/site/page-loader';
import { AuthProvider } from '@/components/providers/auth-provider';
import { CartProvider } from '@/components/providers/cart-provider';
import { WishlistProvider } from '@/components/providers/wishlist-provider';
import dynamic from 'next/dynamic';

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <PageLoader />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <SmoothScroll>
              <PageTransition>
                <CinematicVideoBg />
                <SoundToggle />
                <FloatingPetals />
                {children}
              </PageTransition>
            </SmoothScroll>
            <Toaster />
            <SonnerToaster />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
