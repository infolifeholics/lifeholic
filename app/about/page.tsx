import type { Metadata } from 'next';
import { getFaqs } from '@/lib/data';
import { AboutHero } from '@/components/about/hero';
import { AboutStory } from '@/components/about/story';
import { AboutTimeline } from '@/components/about/timeline';
import { AboutValues } from '@/components/about/values';
import { AboutCerts } from '@/components/about/certs';
import { AboutGallery } from '@/components/about/gallery';
import { AboutFaq } from '@/components/about/faq';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Meet TheLifeHolics — a spiritual psychologist and therapist with nine years of practice, serving clients across India and the world.',
  alternates: { canonical: 'https://thelifeholics.com/about' },
};

export default async function AboutPage() {
  const faqs = await getFaqs('general');
  return (
    <>
      <AboutHero />
      <AboutStory />
      <AboutValues />
      <AboutTimeline />
      <AboutCerts />
      <AboutGallery />
      <AboutFaq faqs={faqs} />
    </>
  );
}
