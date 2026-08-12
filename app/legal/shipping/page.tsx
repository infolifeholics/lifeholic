import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'How physical products are shipped, delivered and tracked.',
  alternates: { canonical: 'https://thelifeholics.com/legal/shipping' },
};

export default function ShippingPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@thelifeholics.com';
  return (
    <LegalPage
      eyebrow="Legal"
      title="Shipping Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'Where we ship',
          body: [
            'We ship physical products across India and to most international destinations. Some remote locations may take longer.',
            'Digital products are delivered instantly to your account and email — no shipping required.',
          ],
        },
        {
          heading: 'Processing & delivery',
          body: [
            'Orders are processed within 1–2 business days. Physical products typically arrive within 3–7 days in India and 10–21 days internationally.',
            'You will receive a tracking link by email once your order ships.',
          ],
        },
        {
          heading: 'Shipping costs',
          body: [
            'Shipping within India is free on orders above ₹1,500. Below that, a flat ₹149 applies.',
            'International shipping is calculated at checkout based on destination and weight.',
          ],
        },
        {
          heading: 'Damaged or lost orders',
          body: [
            `If your order arrives damaged or is lost in transit, please write to ${contactEmail} within 7 days and we will replace or refund it.`,
          ],
        },
      ]}
    />
  );
}
