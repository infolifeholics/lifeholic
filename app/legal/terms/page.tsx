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
          heading: '1. Booking & Payment',
          body: [
            'All sessions must be booked in advance.',
            'Full payment is required to confirm your booking.',
            'Clients booked in the 4-Week Deep Transformation Program must book and complete all 4 sessions within 31 days of enrollment. Any session not used within this time will be considered cancelled.',
            "The next session slot will open for booking only after the current session is completed. It is the client's responsibility to keep track of their sessions and book them on time. The healer will not be responsible for sending reminders."
          ],
        },
        {
          heading: '2. Rescheduling Policy',
          body: [
            'You may reschedule your session by informing us at least 48 hours before your scheduled appointment.',
            'Rescheduling requests made less than 48 hours before the session may not be accommodated.'
          ],
        },
        {
          heading: '3. Missed Sessions',
          body: [
            'If you do not attend your scheduled session without prior notice, the session will be considered completed and cannot be rescheduled or refunded.',
            'It is your responsibility to join the session on time.'
          ],
        },
        {
          heading: '4. Cancellation by Lifeaholics',
          body: [
            'If Lifeaholics needs to cancel or reschedule your session due to unforeseen circumstances, you will be offered the next available suitable appointment at no additional cost.'
          ],
        },
        {
          heading: '5. Refund Policy',
          body: [
            'All payments made towards sessions, workshops, or healing programs are non-refundable.'
          ],
        },
        {
          heading: '6. Healing Process',
          body: [
            'Every individual’s healing journey is unique.',
            'While we strive to support you to the best of our ability, the number of sessions required varies from person to person.',
            'No specific outcome or timeline can be guaranteed.'
          ],
        },
        {
          heading: '7. Personal Responsibility',
          body: [
            'Healing is a collaborative process. Your willingness to participate, reflect, and apply the guidance shared during the sessions plays an important role in your journey.'
          ],
        },
        {
          heading: '8. Medical Disclaimer',
          body: [
            'Our sessions are intended to support your emotional, energetic, and spiritual well-being.',
            'They are not a substitute for medical, psychological, psychiatric, or legal advice, diagnosis, or treatment.',
            'Please continue any treatment or medication prescribed by your healthcare professional.'
          ],
        },
        {
          heading: '9. Confidentiality',
          body: [
            'All information shared during your sessions will be treated with respect and kept confidential, except where disclosure is required by law.'
          ],
        },
        {
          heading: '10. Respectful Conduct',
          body: [
            'We are committed to creating a safe and respectful healing space. We reserve the right to end or decline a session in cases of abusive, threatening, or inappropriate behaviour.'
          ],
        },
        {
          heading: '11. Acceptance of Terms',
          body: [
            'By booking a session with Lifeaholics, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.'
          ],
        }
      ]}
    />
  );
}
