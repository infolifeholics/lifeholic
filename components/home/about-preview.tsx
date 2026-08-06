'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal, RevealText, ScrollStory } from '@/components/site/reveal';
import { FounderImage } from '@/components/site/founder-image';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_FOUNDER_IMAGE = '/images/founder/photo.jpg';

export function HomeAboutPreview() {
  const [founderImage, setFounderImage] = useState(DEFAULT_FOUNDER_IMAGE);
  const [founderImage2, setFounderImage2] = useState('https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'cms', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.about_image) {
          setFounderImage(data.about_image);
        }
        if (data.about_image_2) {
          setFounderImage2(data.about_image_2);
        }
      }
    }, (err) => {
      console.error('Error fetching about CMS data:', err);
    });
    return () => unsubscribe();
  }, []);

  return (
    <section className="relative py-28 sm:py-36">
      <ScrollStory>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

            {/* Image column */}
            <Reveal className="relative">
              <div className="relative grid grid-cols-2 gap-4">
                {/* Main founder portrait — tall card */}
                <div className="col-span-1 aspect-[3/4] overflow-hidden rounded-3xl border border-border/60 shadow-float">
                  <FounderImage
                    src={founderImage}
                    alt="TheLifeHolics founder"
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                {/* Secondary image — session / space photo offset down */}
                <div className="col-span-1 mt-10 flex flex-col gap-4">
                  <div className="flex-1 overflow-hidden rounded-3xl border border-border/60 shadow-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={founderImage2}
                      alt="Calm healing space"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {/* <div className="overflow-hidden rounded-2xl glass-card glow-border p-5 shadow-glow backdrop-blur-md border border-white/10">
                    <p className="font-display text-3xl font-medium text-foreground">9+ yrs</p>
                    <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">of dedicated practice</p>
                    <div className="mt-3 h-px w-full bg-gradient-to-r from-gold/40 to-transparent" />
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Clients across India &amp; 14 countries worldwide
                    </p>
                  </div> */}
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
                  <span className="h-px w-6 bg-gold/70" /> Our Story
                </span>
              </Reveal>

              <RevealText
                as="h2"
                text="Our Story"
                className="mt-5 font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl text-balance"
              />

              <Reveal delay={0.25}>
                <div className="mt-8 space-y-6 text-muted-foreground font-medium text-base sm:text-lg leading-relaxed max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  <p>
                    As I began my own journey of healing and self-discovery, I realized that many of our struggles—
                    whether related to health, relationships, finances, or emotions—often have deeper roots than what
                    we see on the surface.
                  </p>
                  <p>
                    The more I explored these deeper emotional, energetic, and spiritual patterns, the more I started
                    understanding myself. As I healed and applied these learnings in my own life, I began noticing
                    meaningful changes—not just in how I felt, but in how I experienced life itself.
                  </p>
                  <p>
                    LifeHolics began with a profound inner experience. On the night of 14th August 2019, I heard a
                    female voice say, <strong className="text-gold font-bold">&ldquo;I&apos;m pregnant.&rdquo;</strong> Spiritually, pregnancy symbolizes the birth of something that needs
                    to be nurtured with love and care. Within a few weeks, LifeHolics came into existence. Looking back, I
                    now understand that it wasn&apos;t just the birth of a purpose—it was the birth of a purpose. Over the
                    years, my own healing journey has taught me that real transformation begins from within, and this
                    community is an extension of everything life and the Universe have helped me learn.
                  </p>
                  <p>
                    Lifeholics was created with the intention of helping people gain clarity about their life&apos;s challenges,
                    understand the deeper patterns influencing them, and begin a journey of healing and
                    transformation.
                  </p>
                  <p>
                    Our goal is not simply to solve problems, but to help you understand why they are happening, so you
                    can create lasting change. We believe that when you understand yourself at a deeper level, you make
                    different choices, experience healthier relationships, greater peace, and a more fulfilling life.
                  </p>
                  <p className="border-t border-white/10 pt-6 font-display text-xl sm:text-2xl font-semibold text-foreground leading-relaxed italic">
                    &ldquo;If Lifeholics can help even one person understand themselves a little better and move towards the
                    life they truly wish to live, then its purpose is being fulfilled.&rdquo;
                  </p>
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
      </ScrollStory>
    </section>
  );
}
