import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Refund and cancellation policy for sessions, workshops and shop orders.',
  alternates: { canonical: 'https://thelifeholics.com/legal/refund' },
};

export default function RefundPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@thelifeholics.com';
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'Sessions',
          body: [
            'Sessions can be rescheduled free of charge up to 24 hours before the scheduled time.',
            'Cancellations within 24 hours of the session will retain the session fee, as the time has been reserved for you and cannot be offered to someone else.',
            'If you are unwell or in crisis, please reach out — we will always do our best to find a kind solution.',
          ],
        },
        {
          heading: 'Workshops',
          body: [
            'Workbook bookings can be cancelled for a full refund up to 7 days before the event.',
            'Within 7 days, the booking may be transferred to another person or credited toward a future workshop.',
          ],
        },
        {
          heading: 'Digital products',
          body: [
            'Because digital products (meditations, courses, journals) are delivered instantly and cannot be returned, they are generally non-refundable.',
            `If a product is faulty or not as described, please write to ${contactEmail} and we will make it right.`,
          ],
        },
        {
          heading: 'Physical products',
          body: [
            'Physical products can be returned in their original condition within 14 days of delivery for a full refund, less return shipping.',
            'Damaged or incorrect items will be replaced or refunded at no cost to you.',
          ],
        },
        {
          heading: 'How refunds are processed',
          body: [
            'Refunds are issued to the original payment method within 7–10 business days.',
            `Write to ${contactEmail} with your order number to begin a refund.`,
          ],
        },
      ]}
    />
  );
}
