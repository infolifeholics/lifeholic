import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How TheLifeHolics collects, uses and protects your personal information.',
  alternates: {
    canonical: 'https://thelifeholics.com/legal/privacy',
  },
};

export default function PrivacyPage() {
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@thelifeholics.com';

  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'Our Promise to You',
          body: [
            'Your trust matters to us.',
            'At LifeHolics, we understand that when you reach out to us, you may be sharing personal information, experiences, and things that are deeply meaningful to you. We believe that this trust should always be handled with care, respect, and responsibility.',
            'This Privacy Policy explains what information we collect, why we need it, and how we protect it when you interact with LifeHolics.',
            'Any information you choose to share with us during a session is treated with confidentiality and care, subject to applicable legal and ethical requirements.',
          ],
        },
        {
          heading: 'What Information We Collect',
          body: [
            'When you book a session, register for a workshop, purchase a product, or contact us, we may collect information such as your name, email address, phone number, and any information you choose to share with us as part of your booking or communication.',
            'When you visit our website, we may also collect limited technical information, such as your browser, device, and approximate location. This helps us provide a smoother website experience and, where applicable, display information such as the appropriate timezone or currency.',
            'Your payment details are processed securely through our payment providers, such as Razorpay and Stripe. We do not store your complete payment or card details on our own servers.',
          ],
        },
        {
          heading: 'How We Use Your Information',
          body: [
            'We use the information you provide to:',
            '• Confirm and deliver your sessions, workshops, and orders.',
            '• Communicate with you about your bookings, purchases, and enquiries.',
            '• Send important reminders, confirmations, and receipts.',
            '• Respond to your messages and provide the support you request.',
            '• Improve our website, services, products, and overall experience.',
            '• Send you newsletters, updates, or other communications only when you have chosen to receive them.',
            'You can unsubscribe from our newsletters at any time.',
          ],
        },
        {
          heading: 'How We Protect Your Information',
          body: [
            'We take reasonable steps to keep your information safe.',
            'Your data is stored securely with our service providers and transmitted through encrypted connections. Access to personal information is limited to authorised personnel and service providers who need it for legitimate business purposes.',
            'Any session notes or personal information shared with us are treated as confidential and are not shared with others without your consent, except where disclosure may be required by law.',
          ],
        },
        {
          heading: 'Your Privacy Choices',
          body: [
            `You have the right to request access to, correction of, or deletion of your personal information, subject to applicable laws and any legitimate need for us to retain certain information. You may make such a request by writing to ${contactEmail}.`,
            'You may also unsubscribe from our newsletters at any time by using the unsubscribe option provided in our emails.',
            'If you have any questions about how your information is collected or used, we are always happy to hear from you.',
          ],
        },
        {
          heading: 'Contact Us',
          body: [
            `For any privacy-related questions, requests, or concerns, please write to: ${contactEmail}`,
            'We’ll do our best to respond thoughtfully and assist you.',
            'Your trust is important to us.',
            'Thank you for allowing LifeHolics to be a part of your journey.',
          ],
        },
      ]}
    />
  );
}
