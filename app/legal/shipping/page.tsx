import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Shipping & Delivery policy for physical products and digital services at LifeHolics.',
  alternates: { canonical: 'https://thelifeholics.com/legal/shipping' },
};

export default function ShippingPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@thelifeholics.com';

  return (
    <LegalPage
      eyebrow="Legal"
      title="Shipping Policy"
      updated="August 2026"
      sections={[
        {
          heading: '1. Where We Ship',
          body: [
            'We offer shipping across India and to most international destinations.',
            '• Within India: We ship to locations across the country.',
            '• International: We ship to most international destinations.',
            '• Remote Locations: Deliveries to remote or hard-to-reach locations may require additional time depending on courier availability and local delivery conditions.',
            'Please note that delivery timelines may vary depending on the destination, courier partner, customs procedures, weather conditions, and other circumstances beyond our control.',
          ],
        },
        {
          heading: '2. Order Processing',
          body: [
            'Orders for physical products generally begin processing within 2 business days of placing the order.',
            'Once your order has been processed and dispatched, you will receive the relevant shipping or delivery information, wherever applicable.',
          ],
        },
        {
          heading: '3. Delivery Timelines',
          body: [
            'Estimated delivery timelines are:',
            '• Within India: Approximately 7–10 days from the date of dispatch.',
            '• International Orders: Approximately 15–21 days from the date of dispatch.',
            'These are estimated timelines and are not guaranteed. Delivery may take longer in certain circumstances, including courier delays, customs clearance, public holidays, weather conditions, remote locations, or other unforeseen circumstances.',
          ],
        },
        {
          heading: '4. Shipping Charges',
          body: [
            'Shipping charges are calculated based on the product(s) selected and the delivery destination.',
            'The applicable shipping charges will be displayed and added to your order total at checkout before you complete your purchase.',
            'For international orders, any customs duties, import taxes, or other charges imposed by the destination country, where applicable, are the responsibility of the customer.',
          ],
        },
        {
          heading: '5. Digital Services',
          body: [
            'For digital services, including online sessions and other digitally delivered services, there is no physical shipping involved.',
            'Once your purchase or booking is successfully completed, the relevant details, confirmation, session information, or access details will be provided to the email address associated with your order or your LifeHolics account, as applicable.',
            'Please ensure that the email address and account details provided at the time of purchase are accurate.',
          ],
        },
        {
          heading: '6. Damaged Products',
          body: [
            'We take care to package products securely before dispatch. However, if your order arrives damaged, please follow these steps:',
            '• Please record a clear, continuous video while opening the package, showing the condition of the outer packaging and the product inside.',
            '• If the product is damaged, contact us within 2 days of delivery.',
            `• Send the unboxing video and relevant order details to ${contactEmail}.`,
            'An unboxing video may be required to verify damage and process a replacement request.',
          ],
        },
        {
          heading: '7. Replacement for Damaged Products',
          body: [
            'Replacement will be provided only in cases where the product is confirmed to have been damaged during delivery.',
            'Once we receive and review the required video and order details, our team will assess the claim and, where applicable, arrange a replacement.',
            'Please note that replacement requests submitted after 2 days of delivery or without the required evidence may not be accepted.',
          ],
        },
        {
          heading: '8. Lost or Delayed Shipments',
          body: [
            'If your shipment is delayed or appears to be lost in transit, please contact us so that we can assist you in checking the shipment status with the courier partner.',
            'Delivery timelines are estimates, and delays caused by courier partners, customs, weather, local restrictions, or other circumstances outside our control may occur.',
          ],
        },
      ]}
    />
  );
}
