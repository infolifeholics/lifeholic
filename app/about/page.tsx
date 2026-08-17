import type { Metadata } from 'next';
import { AboutClientPage } from '@/components/about/about-client';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Meet LifeHolics — professional spiritual psychology, therapy, and healing services. Supporting your personal transformation and emotional growth.',
  alternates: { canonical: 'https://thelifeholics.com/about' },
};

export default function AboutPage() {
  return <AboutClientPage />;
}
