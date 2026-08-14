import { SectionHeading } from '@/components/site/section-heading';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

const COMMUNITY_FAQS: import('@/lib/types').Faq[] = [
  {
    id: 'cfaq-1',
    scope: 'community',
    sort_order: 1,
    question: 'What is the LifeHolics Community?',
    answer:
      'The LifeHolics Community is a space for people who are looking for deeper conversations, self-exploration, awareness, and meaningful connection.\n\nIt is not simply about networking or socialising. The intention is to create a space where people can come together, share, reflect, learn, and grow.',
  },
  {
    id: 'cfaq-2',
    scope: 'community',
    sort_order: 2,
    question: 'Who can join the community?',
    answer:
      'The community is open to everybody who is focused on their own healing, wants to grow as a person, and genuinely resonates with the intention of the community.\n\nYou don\'t need to have everything figured out. You simply need to be willing to look within, learn, reflect, and grow.',
  },
  {
    id: 'cfaq-3',
    scope: 'community',
    sort_order: 3,
    question: 'How do I apply to join the community?',
    answer:
      'You can email us your details at support@thelifeholics.com along with a little about yourself and answer the following:\n\n• Why do you feel this community would be right for you?\n• How do you think being part of this community would help you?\n• Why do you want to be a part of the LifeHolics Community?\n\nThis helps us understand whether the community is the right space for you and whether you resonate with its intention.',
  },
  {
    id: 'cfaq-4',
    scope: 'community',
    sort_order: 4,
    question: 'How often does the community meet?',
    answer:
      'Community meetings are organised periodically. The frequency, format, and schedule may vary and will be communicated to members in advance.',
  },
  {
    id: 'cfaq-5',
    scope: 'community',
    sort_order: 5,
    question: 'Are community meetings online or offline?',
    answer:
      'This may vary depending on the particular community or gathering. The details will be shared with members before each meeting.',
  },
  {
    id: 'cfaq-6',
    scope: 'community',
    sort_order: 6,
    question: 'Is the community a business or networking group?',
    answer:
      'No. The intention of the LifeHolics Community is not to create a conventional networking or business group. It is a space centred around depth, meaningful conversations, awareness, and connection.',
  },
  {
    id: 'cfaq-7',
    scope: 'community',
    sort_order: 7,
    question: 'Can I join only to learn from others?',
    answer:
      'Yes. You can participate at your own comfort level. You don\'t have to have all the answers or share everything. Sometimes simply listening and reflecting can be valuable.',
  },
  {
    id: 'cfaq-8',
    scope: 'community',
    sort_order: 8,
    question: 'Is everything shared within the community confidential?',
    answer:
      'We encourage every member to respect the privacy of others and maintain confidentiality around personal experiences shared within the group. Community participation is based on mutual trust and respect.',
  },
];

export function CommunityFaq() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Questions about our community" />
        <Reveal delay={0.15} className="mt-12">
          <FaqList items={COMMUNITY_FAQS} defaultOpen={1} />
        </Reveal>
      </div>
    </section>
  );
}
