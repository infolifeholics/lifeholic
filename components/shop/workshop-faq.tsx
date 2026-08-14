import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

const WORKSHOP_FAQS: import('@/lib/types').Faq[] = [
  {
    id: 'wfaq-1',
    scope: 'workshop',
    sort_order: 1,
    question: 'What are LifeHolics workshops about?',
    answer:
      'Our workshops are created to help you explore specific aspects of your emotional, spiritual, energetic, and personal journey in a guided learning environment.\n\nEach workshop focuses on a particular theme, so the content and format may vary.',
  },
  {
    id: 'wfaq-2',
    scope: 'workshop',
    sort_order: 2,
    question: 'Are workshops conducted online?',
    answer:
      'Yes. Our workshops are conducted online unless specifically mentioned otherwise on the workshop page.',
  },
  {
    id: 'wfaq-3',
    scope: 'workshop',
    sort_order: 3,
    question: 'Do I need prior knowledge or experience to attend a workshop?',
    answer:
      'Usually, no. Most workshops are designed to be accessible even if you\'re new to the subject. If a workshop requires prior knowledge or experience, it will be clearly mentioned in its description.',
  },
  {
    id: 'wfaq-4',
    scope: 'workshop',
    sort_order: 4,
    question: 'Can I attend a workshop if I have never taken a session with LifeHolics?',
    answer:
      'Absolutely. You do not necessarily need to have taken an individual session with us before attending a workshop.',
  },
  {
    id: 'wfaq-5',
    scope: 'workshop',
    sort_order: 5,
    question: 'Can I get a refund if I cannot attend a workshop?',
    answer:
      'No. All workshop bookings are non-refundable and non-exchangeable.\n\nPlease make sure you are certain about your participation before booking a workshop.',
  },
  {
    id: 'wfaq-6',
    scope: 'workshop',
    sort_order: 6,
    question: 'Will I receive workshop recordings or material?',
    answer:
      'This depends on the individual workshop. If recordings, notes, workbooks, or other resources are included, they will be mentioned in the workshop details.',
  },
];

export function WorkshopFaq() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Questions about our workshops" />
        <Reveal delay={0.15} className="mt-12">
          <FaqList items={WORKSHOP_FAQS} defaultOpen={1} />
        </Reveal>
      </div>
    </section>
  );
}
