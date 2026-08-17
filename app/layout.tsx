import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site/site-header';
import { MobileNav } from '@/components/site/mobile-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { OfferPopup } from '@/components/site/offer-promo';
import { PwaInstall } from '@/components/site/pwa-install';
import { cn } from '@/lib/utils';
import { GlobalErrorBoundary } from '@/components/site/error-boundary';
import { ClientHardening } from '@/components/site/client-hardening';
import { DiscoveryCallModal } from '@/components/services/free-consultation-modal';
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
    default: 'The LifeHolics — Holistic Health Services',
    template: '%s · The LifeHolics',
  },
  description:
    'The LifeHolics offers professional spiritual psychology, therapy sessions, relationship guidance, inner child healing, mindfulness, workshops, and community space for holistic personal transformation.',
  keywords: [
    'LifeHolics',
    'The LifeHolics',
    'spiritual psychologist',
    'therapy sessions',
    'inner child healing',
    'relationship guidance',
    'mindfulness workshops',
    'meditation community',
    'emotional healing',
    'holistic wellness',
  ],
  authors: [{ name: 'LifeHolics' }],
  creator: 'LifeHolics',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thelifeholics.com',
    siteName: 'LifeHolics',
    title: 'The LifeHolics — Personal Healing & Spiritual Transformation',
    description:
      'A calm, safe space for spiritual psychology, therapy sessions, workshops, and community growth.',
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'The LifeHolics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The LifeHolics — Personal Healing & Spiritual Transformation',
    description:
      'A calm, safe space for spiritual psychology, therapy sessions, workshops, and community growth.',
    images: ['/og.svg'],
  },
  alternates: { canonical: 'https://thelifeholics.com' },
  manifest: '/manifest.json',
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
            <ClientHardening />
            <SiteHeader />
            <Suspense fallback={null}>
              <MobileNav />
            </Suspense>
            <main className="relative">{children}</main>
            <SiteFooter />
            <OfferPopup />
            <PwaInstall />
            <DiscoveryCallModal showButtonOnly={true} serviceId="general" serviceName="General Site Help" />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "MedicalBusiness",
                  "name": "LifeHolics",
                  "alternateName": "The LifeHolics",
                  "url": "https://thelifeholics.com",
                  "logo": "https://thelifeholics.com/favicon.svg",
                  "sameAs": [
                    "https://www.instagram.com/thelifeholics",
                    "https://youtube.com/thelifeholics"
                  ],
                  "description": "The LifeHolics offers spiritual psychology, one-on-one therapy sessions, relationship guidance, inner child healing, mindfulness, workshops, and community space.",
                  "priceRange": "$$",
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Mumbai",
                    "addressCountry": "IN"
                  }
                }),
              }}
            />
            <Script
              data-cfasync="false"
              type="text/javascript"
              src="https://cache.consentframework.com/js/pa/53540/c/PNlIj/stub?source=google-tag"
              strategy="afterInteractive"
            />
            <Script
              data-cfasync="false"
              type="text/javascript"
              src="https://choices.consentframework.com/js/pa/53540/c/PNlIj/cmp?source=google-tag"
              strategy="afterInteractive"
            />
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-XL22R8SDH9"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-XL22R8SDH9');
              `}
            </Script>
            <Script id="service-worker-reg" strategy="afterInteractive">
              {`
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `}
            </Script>
          </GlobalErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
