import type { Metadata } from 'next';
import { AboutClientPage } from '@/components/about/about-client';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Meet TheLifeHolics — a spiritual psychologist and therapist with nine years of practice, serving clients across India and the world.',
  alternates: { canonical: 'https://thelifeholics.com/about' },
};

export default function AboutPage() {
  return <AboutClientPage />;
}
