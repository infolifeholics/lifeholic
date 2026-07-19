import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of TheLifeHolics.',
  alternates: { canonical: 'https://thelifeholics.com/legal/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="July 2026"
      sections={[
        {
          heading: 'Welcome',
          body: [
            'By using this website and booking sessions or purchasing products, you agree to these terms. Please read them carefully — they are written in plain language.',
          ],
        },
        {
          heading: 'Therapeutic relationship',
          body: [
            'Sessions are a collaborative process between you and the therapist. They are not a substitute for medical care in emergencies. If you are in crisis or at risk of harm, please contact your local emergency services or a crisis helpline immediately.',
            'The therapist does not diagnose, prescribe, or provide medical treatment through this website.',
          ],
        },
        {
          heading: 'Bookings',
          body: [
            'When you book a session, the slot is reserved for you instantly. You agree to provide accurate contact information so we can send confirmations and reminders.',
            'Cancellation and rescheduling are governed by our Refund Policy.',
          ],
        },
        {
          heading: 'Shop',
          body: [
            'All prices are listed in INR and USD. We reserve the right to update prices and availability at any time.',
            'You agree to provide accurate shipping information for physical orders. We are not responsible for delays caused by incorrect addresses.',
          ],
        },
        {
          heading: 'Intellectual property',
          body: [
            'All content on this site — writing, imagery, meditations, courses — is owned by TheLifeHolics and protected by copyright. You may not copy, redistribute, or resell it without permission.',
            'Digital products are licensed for your personal use only.',
          ],
        },
        {
          heading: 'Limitation of liability',
          body: [
            'TheLifeHolics is not liable for indirect or incidental damages arising from the use of this site or its services. Our liability is limited to the amount you have paid for the relevant service.',
          ],
        },
        {
          heading: 'Changes',
          body: ['We may update these terms from time to time. Continued use of the site after changes constitutes acceptance of the new terms.'],
        },
      ]}
    />
  );
}
