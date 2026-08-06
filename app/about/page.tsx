import type { Metadata } from 'next';
import { Reveal, RevealText } from '@/components/site/reveal';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const DEFAULT_FOUNDER_IMAGE = '/images/founder/photo.jpg';
const DEFAULT_GALLERY = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=700',
];

export const metadata: Metadata = {
  title: 'About',
  description:
    'Meet TheLifeHolics — a spiritual psychologist and therapist with nine years of practice, serving clients across India and the world.',
  alternates: { canonical: 'https://thelifeholics.com/about' },
};

export default async function AboutPage() {
  // 1. Fetch Founder Portrait
  let founderImage = DEFAULT_FOUNDER_IMAGE;
  try {
    const globalDoc = await getDoc(doc(db, 'cms', 'global'));
    if (globalDoc.exists()) {
      founderImage = globalDoc.data().about_image || DEFAULT_FOUNDER_IMAGE;
    }
  } catch (e) {
    console.error('Error fetching founder portrait:', e);
  }

  // 2. Fetch Gallery Items
  let galleryPics = DEFAULT_GALLERY;
  try {
    const galleryDoc = await getDoc(doc(db, 'settings', 'about_gallery'));
    if (galleryDoc.exists()) {
      const items = galleryDoc.data().items || [];
      galleryPics = Array.from({ length: 4 }, (_, i) => {
        return (items[i]?.url || DEFAULT_GALLERY[i]) as string;
      });
    }
  } catch (e) {
    console.error('Error fetching about gallery:', e);
  }

  return (
    <div className="relative bg-background/20 backdrop-blur-[3px] z-10 min-h-screen pt-36 pb-24 sm:pt-44">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          
          {/* Left Column: Image Card */}
          <div className="relative lg:sticky lg:top-28">
            <div className="relative overflow-hidden rounded-[2rem] shadow-float border border-white/20 bg-white/20 backdrop-blur-md p-3">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founderImage}
                  alt="TheLifeHolics founder"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              
              {/* Overlay Badge */}
              <div className="absolute bottom-8 left-8 right-8">
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 px-5 py-4 text-center text-white shadow-float">
                  <p className="font-display text-xl font-medium tracking-wide">TheLifeHolics</p>
                  <p className="mt-0.5 text-xs uppercase tracking-widest text-white/70">
                    Spiritual Psychologist &amp; Therapist
                  </p>
                </div>
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
                  female voice say, <strong className="text-[#c59b27] font-bold">&ldquo;I&apos;m pregnant.&rdquo;</strong> Spiritually, pregnancy symbolizes the birth of something that needs
                  to be nurtured with love and care. Within a few weeks, LifeHolics came into existence. Looking back, I
                  now understand that it wasn&apos;t just the birth of a platform—it was the birth of a purpose. Over the
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

        {/* 4 Pictures Grid at the bottom */}
        <div className="mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {galleryPics.map((picUrl, idx) => (
              <div key={idx} className="overflow-hidden rounded-3xl border border-white/20 bg-white/20 backdrop-blur-md p-2 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={picUrl}
                  alt={`Gallery photo ${idx + 1}`}
                  className="h-full w-full object-cover rounded-2xl"
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
