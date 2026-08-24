import { SectionHeading } from '@/components/site/section-heading';
import { Reveal, RevealText } from '@/components/site/reveal';

export function AboutStory() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <SectionHeading
              align="left"
              eyebrow="OUR STORY"
              title="The path that brought me here"
            />
            <Reveal delay={0.1}>
              <div className="mt-8 space-y-5 text-pretty text-base leading-relaxed text-muted-foreground">
                <p>
                  As I began my own journey of healing and self-discovery, I realized that many of our struggles whether related to health, relationships, finances, or emotions often have deeper roots than what we see on the surface.
                </p>
                <p>
                  The more I explored these deeper emotional, energetic, and spiritual patterns, the more I started understanding myself. As I healed and applied these learnings in my own life, I began noticing meaningful changes not just in how I felt, but in how I experienced life itself.
                </p>
                <p>
                  LifeHolics began with a profound inner experience. On the night of 14th August 2019, I heard a female voice say, <strong className="text-gold">&quot;I&apos;m pregnant.&quot;</strong> Spiritually, pregnancy symbolizes the birth of something that needs to be nurtured with love and care. Within a few weeks, LifeHolics came into existence. Looking back, I now understand that it wasn&apos;t just the birth of a platform it was the birth of a purpose. Over the years, my own healing journey has taught me that real transformation begins from within, and this community is an extension of everything life and the Universe have helped me learn.
                </p>
                <p>
                  Lifeholics was created with the intention of helping people gain clarity about their life’s challenges, understand the deeper patterns influencing them, and begin a journey of healing and transformation.
                </p>
                <p>
                  Our goal is not simply to solve problems, but to help you understand why they are happening, so you can create lasting change. We believe that when you understand yourself at a deeper level, you make different choices, experience healthier relationships, greater peace, and a more fulfilling life.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                t: 'Mission',
                d: 'To hold a calm, trustworthy space where people can meet themselves honestly — and heal at a pace that respects their wholeness.',
              },
              {
                t: 'Vision',
                d: 'A world where seeking help is sacred, not shameful — and where healing includes the soul, not just the symptom.',
              },
              {
                t: 'Approach',
                d: 'Evidence-based therapy, expanded by spiritual psychology, inner awareness and the wisdom of presence.',
              },
              {
                t: 'Promise',
                d: 'Confidentiality, gentleness, and the commitment to see you — not a diagnosis, not a problem, but a person.',
              },
            ].map((c, i) => (
              <Reveal key={c.t} delay={0.1 + i * 0.08}>
                <div className="h-full rounded-3xl border border-border/60 bg-card/50 p-6">
                  <h3 className="font-display text-xl font-medium text-foreground">{c.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <RevealText
          as="p"
          text="If Lifeholics can help even one person understand themselves a little better and move towards the life they truly wish to live, then its purpose is being fulfilled."
          className="mx-auto mt-20 max-w-3xl text-center font-display text-2xl font-medium leading-relaxed text-foreground sm:text-3xl text-balance"
        />
      </div>
    </section>
  );
}
