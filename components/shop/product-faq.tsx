import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

const PRODUCT_FAQS: import('@/lib/types').Faq[] = [
  {
    id: 'pfaq-1',
    scope: 'product',
    sort_order: 1,
    question: 'What kind of products does LifeHolics offer?',
    answer:
      'Our products are thoughtfully created to support your personal and spiritual journey. Each product comes with its own intended purpose and usage guidance.',
  },
  {
    id: 'pfaq-2',
    scope: 'product',
    sort_order: 2,
    question: 'How are these products different from others in the market?',
    answer:
      'Our products are energetically charged using our latest galactic technology, shielded, and intentionally energised for a specific purpose. Unlike ordinary crystals and spiritual tools, our products carry an energetic shield that you consciously break to connect with the product\'s energy. This process creates a deeper, more intentional connection between you and the tool.\n\nCharged. Shielded. Activated with intention. Created for a purpose.',
  },
  {
    id: 'pfaq-3',
    scope: 'product',
    sort_order: 3,
    question: 'How do I know which product is right for me?',
    answer:
      'Each product page explains its purpose and intended use. If you\'re still unsure, you can reach out to us before purchasing and we can help you understand the product better.',
  },
  {
    id: 'pfaq-4',
    scope: 'product',
    sort_order: 4,
    question: 'Can I return or exchange a product?',
    answer:
      'No. All product purchases are non-refundable and non-exchangeable.\n\nPlease make sure you are certain about your purchase before placing the order.',
  },
  {
    id: 'pfaq-5',
    scope: 'product',
    sort_order: 5,
    question: 'Can I use a product without taking a session?',
    answer:
      'Yes. Our products can be used independently unless a particular product specifically states otherwise.',
  },
  {
    id: 'pfaq-6',
    scope: 'product',
    sort_order: 6,
    question: 'Are your products meant to replace professional medical treatment?',
    answer:
      'No. Our products and spiritual practices are not intended to diagnose, treat, cure, or replace medical or psychological care. If you have a medical or mental-health concern, please seek appropriate professional support.',
  },
];

export function ProductFaq() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Questions about our products" />
        <Reveal delay={0.15} className="mt-12">
          <FaqList items={PRODUCT_FAQS} defaultOpen={1} />
        </Reveal>
      </div>
    </section>
  );
}
