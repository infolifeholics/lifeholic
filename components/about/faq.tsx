import type { Faq } from '@/lib/types';
import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

export function AboutFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Questions, gently answered" />
        <Reveal delay={0.15} className="mt-12">
          <FaqList items={faqs} defaultOpen={1} />
        </Reveal>
      </div>
    </section>
  );
}
