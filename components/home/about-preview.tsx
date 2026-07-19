import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal, RevealText } from '@/components/site/reveal';
import { FounderImage } from '@/components/site/founder-image';

const FOUNDER_IMAGE = '/images/founder/photo.jpg';

export function HomeAboutPreview() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Image column */}
          <Reveal className="relative">
            <div className="relative grid grid-cols-2 gap-4">
              {/* Main founder portrait — tall card */}
              <div className="col-span-1 aspect-[3/4] overflow-hidden rounded-3xl border border-border/60 shadow-float">
                <FounderImage
                  src={FOUNDER_IMAGE}
                  alt="TheLifeHolics founder"
                  className="h-full w-full object-cover object-top"
                />
              </div>

              {/* Secondary image — session / space photo offset down */}
              <div className="col-span-1 mt-10 flex flex-col gap-4">
                <div className="flex-1 overflow-hidden rounded-3xl border border-border/60 shadow-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Calm healing space"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-gold/30 bg-card/80 p-5 shadow-soft">
                  <p className="font-display text-3xl font-medium text-foreground">9+ yrs</p>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">of dedicated practice</p>
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-gold/40 to-transparent" />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Clients across India &amp; 14 countries worldwide
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative dots */}
            <div className="absolute -left-4 bottom-8 grid grid-cols-4 gap-1.5 opacity-20">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
              ))}
            </div>
          </Reveal>

          {/* Copy column */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-px w-6 bg-gold/70" /> About the practice
              </span>
            </Reveal>

            <RevealText
              as="h2"
              text="Therapy that remembers you are a soul, not a symptom"
              className="mt-5 font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl text-balance"
            />
            <Reveal delay={0.2}>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
                I am a spiritual psychologist and therapist. My work holds the whole of you —
                mind, body, emotion and the quiet voice beneath them all. For nearly a decade I
                have sat with people through grief, anxiety, relationship pain and the tender
                search for meaning — and watched them come back to themselves.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
                No judgement. No rush. Just presence, and a path that is yours alone.
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  ['Evidence-based', 'Rooted in established therapeutic practice.'],
                  ['Soul-centred', 'Holding meaning, not just symptom-relief.'],
                  ['Confidential', 'A space held with complete trust.'],
                  ['Global', 'Clients across 14 countries and counting.'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-2xl border border-border/60 bg-card/50 p-4">
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.5}>
              <Link
                href="/about"
                className="group mt-9 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Read the full story
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
