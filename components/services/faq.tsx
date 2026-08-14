import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

const SERVICE_FAQS: import('@/lib/types').Faq[] = [
  {
    id: 'faq-1',
    scope: 'service',
    sort_order: 1,
    question: 'How are the sessions conducted?',
    answer:
      'All our sessions are conducted online, from the comfort of your own space. You do not need to travel anywhere or be physically present with us.\n\nOur online sessions are designed to offer the same depth and effectiveness as an in-person session. We have conducted our sessions online so far and have seen the same transformative results. The work is not dependent on physical proximity, so please don\'t feel that choosing an online session means compromising on the experience.',
  },
  {
    id: 'faq-2',
    scope: 'service',
    sort_order: 2,
    question: 'How do I know which service is right for me?',
    answer:
      'If you\'re unsure about which service would be right for you, we recommend beginning with a One-on-One Clarity Session. It gives us an opportunity to understand what you\'re going through, identify what may be needed, and help you understand whether our approach is the right path for you before you commit to a deeper process.',
  },
  {
    id: 'faq-3',
    scope: 'service',
    sort_order: 3,
    question: 'What happens in a One-on-One Clarity Session?',
    answer:
      'A clarity session is a space to understand what you\'re experiencing at a deeper level. We explore your concerns, patterns, emotions, or situations and help bring clarity to what may be happening beneath the surface.\n\nBased on the session, you can then decide whether you wish to continue with another service.',
  },
  {
    id: 'faq-4',
    scope: 'service',
    sort_order: 4,
    question: 'How do I book the four sessions in the Four-Week Deep Transformation program?',
    answer:
      'You don\'t need to book all four sessions at once.\n\nYou first book your first session. Once that session is completed, you can go ahead and select your second session. The same process continues for the third and fourth sessions.\n\nThis allows the next session to be chosen based on your journey and what is needed at that stage.',
  },
  {
    id: 'faq-5',
    scope: 'service',
    sort_order: 5,
    question: 'How long do I have to complete the four sessions?',
    answer:
      'The four sessions must be consumed within one month from the beginning of your Four-Week Deep Transformation program.\n\nThe sessions are designed to work as a continuous four-week journey, so spacing them too far apart may affect the intended flow of the process.',
  },
  {
    id: 'faq-6',
    scope: 'service',
    sort_order: 6,
    question: 'Can I reschedule my session?',
    answer:
      'Yes. Sessions can be rescheduled, provided you request the rescheduling at least 48 hours before your scheduled session.\n\nPlease note that our sessions are not refundable. If you are unable to attend your scheduled session, you may request a rescheduling subject to the applicable terms.',
  },
  {
    id: 'faq-7',
    scope: 'service',
    sort_order: 7,
    question: 'Can I cancel my session and get a refund?',
    answer:
      'No. All service bookings are non-refundable.\n\nPlease make sure you are certain about booking a service before making your payment. If you are unable to attend, eligible bookings may only be rescheduled as per our rescheduling policy.',
  },
  {
    id: 'faq-8',
    scope: 'service',
    sort_order: 8,
    question: 'Do I need to prepare anything before a session?',
    answer:
      'You don\'t need any special preparation. Simply make sure you are in a quiet and comfortable space where you can be present without interruptions.',
  },
  {
    id: 'faq-9',
    scope: 'service',
    sort_order: 9,
    question: 'Will I need to attend every session at the same time?',
    answer:
      'Not necessarily. You can choose your available slot while booking each session, subject to the available appointments.',
  },
  {
    id: 'faq-10',
    scope: 'service',
    sort_order: 10,
    question: 'Is the information shared during a session confidential?',
    answer:
      'Yes. We respect the privacy of everything you share with us during your sessions and handle your personal information with care, in accordance with our Privacy Policy.',
  },
];

export function ServiceFaq({ slug: _slug }: { slug: string }) {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Questions about this work" />
        <Reveal delay={0.15} className="mt-12">
          <FaqList items={SERVICE_FAQS} defaultOpen={1} />
        </Reveal>
      </div>
    </section>
  );
}
