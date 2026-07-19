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
              eyebrow="My story"
              title="The path that brought me here"
            />
            <Reveal delay={0.1}>
              <div className="mt-8 space-y-5 text-pretty text-base leading-relaxed text-muted-foreground">
                <p>
                  I did not arrive at this work through certainty. I arrived through my own
                  unraveling — the kind that asks you to either harden or soften, and the slow
                  discovery that softening was the only thing that ever helped.
                </p>
                <p>
                  Years of my own therapy, study, meditation and grief taught me that healing is
                  not a destination but a relationship — with yourself, your history, and the
                  quiet truth beneath the noise. I trained formally in psychology, then went
                  deeper into spiritual psychology, somatic work and inner child modalities,
                  because the mind alone was never enough.
                </p>
                <p>
                  Today I sit with others the way I once needed someone to sit with me: present,
                  unhurried, and willing to meet the whole of who they are.
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
                d: 'Evidence-based therapy, expanded by spiritual psychology, somatic awareness and the wisdom of presence.',
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
          text="I believe people come to therapy not to be fixed, but to be witnessed. The fixing, when it happens, is something they do themselves — once they feel safe enough to try."
          className="mx-auto mt-20 max-w-3xl text-center font-display text-2xl font-medium leading-relaxed text-foreground sm:text-3xl text-balance"
        />
      </div>
    </section>
  );
}
