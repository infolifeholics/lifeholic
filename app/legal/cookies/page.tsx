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
            'Meta advertising measurement cookies and events are used only after you explicitly choose “Allow advertising cookies”. If you choose “Essential only”, Meta Pixel is not loaded and Meta events are not sent. You can change your choice using Privacy settings at any time.',
            'When enabled, Meta may use browser identifiers such as _fbp and _fbc to measure product views, cart activity, checkout starts, and completed purchases. See our Privacy Policy for the data shared with Meta.',
            'Google Analytics may use analytics technologies to understand how the site is used so we can improve it.',
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
