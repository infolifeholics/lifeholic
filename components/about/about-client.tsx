'use client';

import { useEffect, useState } from 'react';
import { Reveal, RevealText } from '@/components/site/reveal';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_FOUNDER_IMAGE = '/images/founder/photo.jpg';

export function AboutClientPage() {
  const [founderImage, setFounderImage] = useState(DEFAULT_FOUNDER_IMAGE);
  const [founderImage2, setFounderImage2] = useState('https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'cms', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.about_image) {
            setFounderImage(data.about_image);
          }
          if (data.about_image_2) {
            setFounderImage2(data.about_image_2);
          }
        }
      },
      (err) => {
        console.error('Error listening to about CMS data in real-time:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Render 4 pictures at the bottom, using both dynamic images alternating
  const galleryPics = [founderImage, founderImage2, founderImage, founderImage2];

  return (
    <div className="relative bg-background/20 backdrop-blur-[3px] z-10 min-h-screen pt-36 pb-24 sm:pt-44">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">

          {/* Left Column: Image Card */}
          <div className="relative lg:sticky lg:top-28">
            <div className="flex flex-col gap-6">
              {/* Main founder portrait — tall card */}
              <div className="aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/20 bg-white/20 backdrop-blur-md p-2 shadow-float">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founderImage}
                  alt="TheLifeHolics founder"
                  className="h-full w-full object-cover object-top rounded-2xl"
                />
              </div>

              {/* Secondary image — session / space photo */}
              <div className="aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/20 bg-white/20 backdrop-blur-md p-2 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founderImage2}
                  alt="Calm healing space"
                  className="h-full w-full object-cover rounded-2xl"
                />
              </div>
            </div>

            {/* Decorative dot grids */}
            <div className="absolute -left-4 -bottom-4 grid grid-cols-4 gap-1.5 opacity-25">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold" />
              ))}
            </div>
          </div>

          {/* Right Column: Story Text with White/Glass Card & Blur */}
          <div className="rounded-[2.5rem] border border-white/30 bg-white/40 backdrop-blur-md p-8 sm:p-12 shadow-glow">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                <span className="h-px w-6 bg-gold" /> Our Story
              </span>
            </Reveal>

            <RevealText
              as="h1"
              text="The path that brought me here"
              className="mt-5 font-display text-4xl font-semibold leading-tight text-black sm:text-5xl"
            />

            <Reveal delay={0.25}>
              <div className="mt-8 space-y-6 text-black font-medium text-base sm:text-lg leading-relaxed">
                <p>
                  As I began my own journey of healing and self-discovery, I realized that many of our struggles
                  whether related to health, relationships, finances, or emotions often have deeper roots than what
                  we see on the surface.
                </p>
                <p>
                  The more I explored these deeper emotional, energetic, and spiritual patterns, the more I started
                  understanding myself. As I healed and applied these learnings in my own life, I began noticing
                  meaningful changes not just in how I felt, but in how I experienced life itself.
                </p>
                <p>
                  LifeHolics began with a profound inner experience. On the night of 14th August 2019, I heard a
                  female voice say, <strong className="text-[#c59b27] font-bold">&ldquo;I&apos;m pregnant.&rdquo;</strong> Spiritually, pregnancy symbolizes the birth of something that needs
                  to be nurtured with love and care. Within a few weeks, LifeHolics came into existence. Looking back, I
                  now understand that it wasn&apos;t just the birth of a purpose it was the birth of a purpose. Over the
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
                <p className="border-t border-black/10 pt-6 font-display text-xl sm:text-2xl font-semibold text-black leading-relaxed italic">
                  &ldquo;If Lifeholics can help even one person understand themselves a little better and move towards the
                  life they truly wish to live, then its purpose is being fulfilled.&rdquo;
                </p>
              </div>
            </Reveal>
          </div>

        </div>


      </div>
    </div>
  );
}
