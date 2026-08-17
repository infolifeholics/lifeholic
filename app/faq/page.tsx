import type { Metadata } from 'next';
import { SectionHeading } from '@/components/site/section-heading';
import { GeneralFaq } from '@/components/site/general-faq';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers to common questions about LifeHolics spiritual therapy, session bookings, workshops, and payments.',
  alternates: { canonical: 'https://thelifeholics.com/faq' },
};

export default function FaqPage() {
  return (
    <div className="pt-32 sm:pt-40">
      <section className="py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Good to know" title="Frequently asked questions" />
          <GeneralFaq />
        </div>
      </section>
    </div>
  );
}
