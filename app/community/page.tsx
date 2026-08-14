import type { Metadata } from 'next';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/site/reveal';
import { CommunityForm } from '@/components/community/community-form';
import { CommunityFaq } from '@/components/community/community-faq';

export const metadata: Metadata = {
  title: 'Join the Lifeholics Exclusive Community',
  description: 'Apply to join a small, intimate, and thoughtfully curated space for people genuinely committed to their personal growth and healing journey.',
  alternates: { canonical: 'https://thelifeholics.com/community' },
};

export default function CommunityPage() {
  return (
    <div className="pt-32 sm:pt-40 pb-20">
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Exclusive Membership"
            title="Join the Lifeholics Community"
            description="A thoughtfully curated space for those genuinely committed to personal growth, healing, and evolving together."
          />
        </div>
      </section>

      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-start">
            <Reveal className="space-y-6 text-left">
              <div className="rounded-3xl border border-white/10 bg-black/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-glow">
                <h3 className="font-display text-2xl font-medium text-white">
                  About Our Community
                </h3>
                
                <p className="text-sm leading-relaxed text-white/80">
                  The Lifeholics Community is a small, intimate, and thoughtfully curated space for people who are genuinely committed to their personal growth and healing journey.
                </p>
                
                <p className="text-sm leading-relaxed text-white/80">
                  This is not just another community—it’s a place for those who are willing to look within, understand the deeper meaning of life’s experiences, and grow alongside like-minded individuals.
                </p>
                
                <p className="text-sm leading-relaxed text-white/80">
                  We come together through monthly gatherings, meaningful discussions, and ongoing support to help each other evolve.
                </p>
                
                <div className="border-t border-white/10 pt-6">
                  <h4 className="font-semibold text-white text-sm mb-3">
                    Application Details
                  </h4>
                  <p className="text-xs text-white/70 mb-4">
                    In 4–5 lines, please share:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-white/70 space-y-2">
                    <li>Why you would like to join the Lifeholics Community</li>
                    <li>How you believe the community can support your journey</li>
                  </ul>
                </div>
                
                <p className="text-xs leading-relaxed text-white/60 italic border-t border-white/10 pt-4">
                  Every application is personally reviewed, and we’ll get back to you if we feel you’re the right fit for our community. We look forward to connecting with you.
                </p>
              </div>
            </Reveal>

            <div>
              <CommunityForm />
            </div>
          </div>
        </div>
      </section>

      <CommunityFaq />
    </div>
  );
}
