import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How TheLifeHolics uses cookies and similar technologies.',
  alternates: { canonical: 'https://thelifeholics.com/legal/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'What cookies are',
          body: [
            'Cookies are small text files stored on your device. They help the site remember your preferences — like your bag, wishlist, and timezone — so you do not have to set them every visit.',
          ],
        },
        {
          heading: 'What we use',
          body: [
            'Essential cookies keep the site working — your session, your cart, your auth state. These cannot be disabled.',
            'We do not use advertising or cross-site tracking cookies.',
            'Analytics, if enabled, uses privacy-respecting cookies to understand how the site is used so we can improve it.',
          ],
        },
        {
          heading: 'Managing cookies',
          body: [
            'You can clear cookies in your browser settings at any time. Note that this will reset your bag and sign you out.',
          ],
        },
      ]}
    />
  );
}
