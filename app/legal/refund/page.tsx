import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy',
  description:
    'Cancellation, refund and rescheduling policy for LifeHolics services, workshops and products.',
  alternates: {
    canonical: 'https://thelifeholics.com/legal/refund',
  },
};

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cancellation & Refund Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'Refund & Rescheduling Policy',
          body: [
            'At LifeHolics, we value your time and ours. We encourage you to make your bookings and purchases thoughtfully and only when you are certain about proceeding.',
            'Please read the following policy carefully before making a payment.',
          ],
        },
        {
          heading: '1. Services',
          body: [
            'All bookings for our services are non-refundable and cannot be cancelled once the payment has been made.',
            'However, if you are unable to attend your scheduled session, you may request one rescheduling, provided the request is made at least 48 hours before your scheduled session time.',
            'Rescheduling requests made less than 48 hours before the scheduled session will not be accommodated.',
            'Once a session has been rescheduled, the new date and time will be considered final.',
            'Payments made towards services cannot be transferred, cancelled, or refunded.',
            'We therefore request you to book a session only when you are certain about your availability.',
          ],
        },
        {
          heading: '2. Workshops',
          body: [
            'All workshop registrations are non-refundable and non-cancellable.',
            'Since workshops are conducted on a fixed date and at a fixed time, workshop bookings cannot be rescheduled or transferred to another workshop, session, or product.',
            'Please ensure that you are available on the scheduled date and time before completing your registration.',
          ],
        },
        {
          heading: '3. Products',
          body: [
            'All products purchased from LifeHolics are non-refundable and non-cancellable.',
            'We request you to carefully review the product details before placing your order and purchase only when you are completely sure about your decision.',
            'Once an order has been placed, it cannot be cancelled or refunded.',
          ],
        },
        {
          heading: '4. Refunds',
          body: [
            'All payments made towards services, workshops, and products are final.',
            'Refund requests will not be accepted or processed under any circumstances. We encourage you to carefully consider your purchase or booking before making the payment.',
            'By proceeding with a booking or purchase, you acknowledge and agree to the terms of this Refund & Rescheduling Policy.',
            'Please choose thoughtfully, book mindfully, and purchase only when you are sure.',
            'Thank you for understanding and respecting our policy.',
          ],
        },
      ]}
    />
  );
}
