'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Service } from '@/lib/types';
import { RevealText, Reveal } from '@/components/site/reveal';
import { formatPrice } from '@/lib/format';

export function ServiceHero({ service }: { service: Service }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/services" className="hover:text-foreground">Services</Link>
          <span>/</span>
          <span className="text-foreground">{service.title}</span>
        </nav>

        <div className="mt-6 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {service.category}
            </span>
            <RevealText
              as="h1"
              text={service.title}
              className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl text-balance"
            />
            <Reveal delay={0.25}>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{service.short}</p>
            </Reveal>
            <Reveal delay={0.35}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={`/booking?service=${service.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
                >
                  Book this session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-sm text-muted-foreground">
                  from <span className="font-medium text-foreground">{formatPrice(service.price_inr, 'INR')}</span>
                </span>
              </div>
            </Reveal>
          </div>

          <motion.div style={{ y }} className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border/60 shadow-float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/25 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
