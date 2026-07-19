import type { Metadata } from 'next';
import { getAllFaqs } from '@/lib/data';
import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about sessions, booking, payments and more.',
  alternates: { canonical: 'https://thelifeholics.com/faq' },
};

export default async function FaqPage() {
  const faqs = await getAllFaqs();
  return (
    <div className="pt-32 sm:pt-40">
      <section className="py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Good to know" title="Frequently asked questions" />
          <Reveal delay={0.1} className="mt-12">
            <FaqList items={faqs} defaultOpen={1} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
