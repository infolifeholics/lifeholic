import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How TheLifeHolics collects, uses and protects your personal information.',
  alternates: { canonical: 'https://thelifeholics.com/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'Our promise',
          body: [
            'Your trust is the foundation of this practice. This policy explains what information we collect, why we collect it, and how we keep it safe.',
            'Because this is a therapeutic practice, confidentiality is treated with the highest care. Everything you share in sessions is held privately, within the ethical and legal limits of therapy.',
          ],
        },
        {
          heading: 'Information we collect',
          body: [
            'When you book a session or place an order, we collect your name, email, phone number (if provided), and the details you choose to share in your booking notes.',
            'When you browse the site, we may collect technical information such as your browser, device, and approximate location (for timezone and currency display).',
            'Payment information is processed by our payment providers (Razorpay and Stripe) and is never stored on our servers.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To confirm and deliver your sessions and orders, to send reminders and receipts, and to respond to your messages.',
            'To improve the site and the experience, and to send our newsletter — only if you have opted in. You can unsubscribe at any time.',
          ],
        },
        {
          heading: 'How we protect it',
          body: [
            'Data is stored securely with Supabase and transmitted over encrypted connections. Access is restricted to authorised personnel only.',
            'Session notes and therapeutic content are kept confidential and are never shared without your explicit consent, except where required by law.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You may request access to, correction of, or deletion of your personal data at any time by writing to hello@thelifeholics.com.',
            'You may unsubscribe from the newsletter at any time using the link in any email.',
          ],
        },
        {
          heading: 'Contact',
          body: ['Questions about privacy? Write to hello@thelifeholics.com and we will respond thoughtfully.'],
        },
      ]}
    />
  );
}
