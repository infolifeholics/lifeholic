import { getAllFaqs } from '@/lib/data';
import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

export async function ServiceFaq({ slug }: { slug: string }) {
  const all = await getAllFaqs();
  const items = all.filter((f) => f.scope === 'general' || f.scope === `service:${slug}` || f.scope === 'booking');
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Questions about this work" />
        <Reveal delay={0.15} className="mt-12">
          <FaqList items={items} defaultOpen={1} />
        </Reveal>
      </div>
    </section>
  );
}
