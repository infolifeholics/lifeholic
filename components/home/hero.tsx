'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { MagneticLink } from '@/components/site/magnetic';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_LANDING_IMAGES = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3182452/pexels-photo-3182452.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/409127/pexels-photo-409127.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/290518/pexels-photo-290518.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

export function HomeHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const colRef = collection(db, 'landing_images');
    getDocs(colRef)
      .then((snap) => {
        if (!snap.empty) {
          const data = snap.docs.map((doc) => doc.data());
          // Only map active slots that have valid URLs (filter out empty or deleted slots)
          const list = data
            .sort((a: any, b: any) => Number(a.id) - Number(b.id))
            .map((d: any) => d.url)
            .filter((url): url is string => !!url);
          
          setImages(list);
        } else {
          setImages([]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch landing images from Firestore:', err);
        setImages([]);
      });
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4500); // smooth rotation every 4.5 seconds
    return () => clearInterval(interval);
  }, [images]);

  const hasImages = images.length > 0;

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 sm:pt-44 lg:pt-48">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "grid items-center gap-10 lg:gap-16",
          hasImages ? "lg:grid-cols-[1.05fr_0.95fr]" : "grid-cols-1 max-w-3xl mx-auto text-center"
        )}>
          {/* Left — copy */}
          <motion.div style={{ y: yText, opacity }} className="relative z-10">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Spiritual Psychology &amp; Therapy
            </motion.span>

            <h1 className="mt-6 font-display text-5xl font-medium leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl text-balance">
              {'A calm space to'.split(' ').map((w, i) => (
                <span key={i} className="mr-3 inline-block overflow-hidden align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: EASE }}
                  >
                    {w}
                  </motion.span>
                </span>
              ))}
              <br />
              <motion.span
                className="text-gradient-gold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5, ease: EASE }}
              >
                come home to yourself
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
              className={cn("mt-7 text-pretty text-lg leading-relaxed text-muted-foreground", !hasImages && "mx-auto")}
            >
              Gentle, soulful therapy and healing for the life you are actually living —
              online and in person, for clients across India and the world.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
              className={cn("mt-9 flex flex-wrap items-center gap-3", !hasImages && "justify-center")}
            >
              <MagneticLink
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
              >
                Book a Session
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </MagneticLink>
              <MagneticLink
                href="/services"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-7 py-3.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-card"
              >
                Explore Services
              </MagneticLink>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className={cn("mt-10 flex items-center gap-6 text-sm text-muted-foreground", !hasImages && "justify-center")}
            >
              <div className="flex -space-x-3">
                {[
                  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80',
                  'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=80',
                  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=80',
                  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=80',
                ].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <p className={!hasImages ? "text-left" : ""}>
                <span className="font-medium text-foreground">1,200+ sessions</span> held with care ·
                <br className="hidden sm:block" /> clients in 14 countries
              </p>
            </motion.div>
          </motion.div>

          {/* Right — image stack */}
          {hasImages && (
            <motion.div
              style={{ y: yImg }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
              className="relative"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border/60 shadow-float bg-card">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={currentIndex}
                    src={images[currentIndex]}
                    alt="A calm, sunlit space for healing and reflection"
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* centered floating cards */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-48 rounded-2xl glass-card glow-border reflection-sweep p-4 shadow-glow backdrop-blur-md border border-white/10 pointer-events-auto"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next available</p>
                  <p className="mt-1 font-display text-lg text-foreground">Tomorrow · 6:00 PM</p>
                  <p className="text-xs text-muted-foreground">Online · 60 minutes</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="w-52 rounded-2xl glass-card glow-border reflection-sweep p-4 shadow-glow backdrop-blur-md border border-white/10 pointer-events-auto"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-breathe" />
                    <p className="text-xs font-semibold text-foreground">Currently accepting clients</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    IST &amp; global timezones · Online &amp; in person
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="mt-20 flex justify-center"
      >
        <div className="flex h-10 w-6 items-start justify-center rounded-full border border-border p-1.5">
          <motion.span
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-foreground/60"
          />
        </div>
      </motion.div>
    </section>
  );
}
