import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site/site-header';
import { MobileNav } from '@/components/site/mobile-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { OfferPopup } from '@/components/site/offer-promo';
import { cn } from '@/lib/utils';
import { GlobalErrorBoundary } from '@/components/site/error-boundary';
import Script from 'next/script';

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

export const viewport = {
  themeColor: '#f6f1ea',
};

export const metadata: Metadata = {
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
          <GlobalErrorBoundary>
            <SiteHeader />
            <Suspense fallback={null}>
              <MobileNav />
            </Suspense>
            <main className="relative">{children}</main>
            <SiteFooter />
            <OfferPopup />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "MedicalBusiness",
                  "name": "TheLifeHolics",
                  "alternateName": "Lifeholics",
                  "url": "https://thelifeholics.com",
                  "logo": "https://thelifeholics.com/favicon.svg",
                  "sameAs": [
                    "https://www.instagram.com/thelifeholics",
                    "https://youtube.com/thelifeholics"
                  ],
                  "description": "TheLifeHolics offers spiritual psychology, one-on-one therapy, relationship guidance, inner child healing, mindfulness and meditation — online and in person.",
                  "priceRange": "$$",
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Mumbai",
                    "addressCountry": "IN"
                  }
                }),
              }}
            />
            <Script id="service-worker-reg" strategy="afterInteractive">
              {`
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `}
            </Script>
            <Script id="inspect-protection" strategy="afterInteractive">
              {`
                // 1. Disable Right Click Context Menu
                document.addEventListener('contextmenu', e => e.preventDefault());

                // 2. Disable Keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
                document.addEventListener('keydown', e => {
                  if (
                    e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
                    (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
                    (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'U' || e.key === 'u'))
                  ) {
                    e.preventDefault();
                    return false;
                  }
                });

                // 3. Prevent Console access inspection (Clear and mute console in production environment)
                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                  setInterval(() => {
                    // Constant debugger statement to disrupt debugging tools
                    (function() { return false; }['constructor']('debugger')['call']());
                  }, 100);

                  console.log = function() {};
                  console.info = function() {};
                  console.warn = function() {};
                  console.error = function() {};
                }
              `}
            </Script>
          </GlobalErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
