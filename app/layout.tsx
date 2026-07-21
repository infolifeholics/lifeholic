import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { cn } from '@/lib/utils';
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

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  themeColor: '#f6f1ea',
  metadataBase: new URL('https://thelifeholics.com'),
  title: {
    default: 'TheLifeHolics — Spiritual Psychology & Therapy',
    template: '%s · TheLifeHolics',
  },
  description:
    'TheLifeHolics offers spiritual psychology, one-on-one therapy, relationship guidance, inner child healing, mindfulness and meditation — online and in person, for Indian and international clients.',
  keywords: [
    'spiritual psychologist',
    'therapy',
    'inner child healing',
    'relationship guidance',
    'mindfulness',
    'meditation',
    'emotional healing',
    'wellness',
  ],
  authors: [{ name: 'TheLifeHolics' }],
  creator: 'TheLifeHolics',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thelifeholics.com',
    siteName: 'TheLifeHolics',
    title: 'TheLifeHolics — Spiritual Psychology & Therapy',
    description:
      'A calm, safe space for spiritual psychology, therapy, emotional healing and mindful growth.',
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'TheLifeHolics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TheLifeHolics — Spiritual Psychology & Therapy',
    description:
      'A calm, safe space for spiritual psychology, therapy, emotional healing and mindful growth.',
    images: ['/og.svg'],
  },
  alternates: { canonical: 'https://thelifeholics.com' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(sans.variable, serif.variable, 'font-sans antialiased relative min-h-screen')}>
        <Providers>
          <CinematicVideoBg />
          <CustomCursor />
          <SoundToggle />
          <FloatingPetals />
          <SiteHeader />
          <main className="relative">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
