import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

const GENERAL_FAQS: import('@/lib/types').Faq[] = [
  {
    id: 'gfaq-1',
    scope: 'general',
    sort_order: 1,
    question: 'How do I book a session, workshop, or purchase a product?',
    answer:
      'You can explore the relevant section of our website and follow the booking or purchase process mentioned on the respective page.',
  },
  {
    id: 'gfaq-2',
    scope: 'general',
    sort_order: 2,
    question: 'What if I have more questions before booking?',
    answer:
      'If you still have questions after going through the relevant information, you can reach out to us. We\'d rather you understand what you\'re choosing before you book.',
  },
  {
    id: 'gfaq-3',
    scope: 'general',
    sort_order: 3,
    question: 'What if I realise that a service isn\'t right for me?',
    answer:
      'That\'s completely okay. Our intention is not to convince you to book something. If you\'re unsure, start with a One-on-One Clarity Session so you can understand whether our approach is right for you.',
  },
  {
    id: 'gfaq-4',
    scope: 'general',
    sort_order: 4,
    question: 'How do I contact LifeHolics?',
    answer:
      'You can reach out to us through the contact details provided on our website. We\'re happy to help you with questions related to sessions, workshops, products, or the community.',
  },
];

export function GeneralFaq() {
  return (
    <Reveal delay={0.1} className="mt-10">
      <FaqList items={GENERAL_FAQS} defaultOpen={1} />
    </Reveal>
  );
}

// Export the static list directly for pages that need to pass it as a prop
export { GENERAL_FAQS };
