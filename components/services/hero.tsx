'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Service } from '@/lib/types';
import { RevealText, Reveal } from '@/components/site/reveal';
import { formatPrice } from '@/lib/format';
import { useCurrency } from '@/components/providers/currency-provider';
import { convertInrToCurrency } from '@/lib/currency';

import { getOptimizedCloudinaryUrl } from '@/lib/utils';

export function ServiceHero({ service }: { service: Service }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const { currentCurrency, exchangeRate } = useCurrency();
  const isInternational = currentCurrency !== 'INR';
  const displayPrice = isInternational && exchangeRate ? convertInrToCurrency(service.price_inr, exchangeRate, currentCurrency) : service.price_inr;

  return (
    <section ref={ref} className="relative overflow-hidden pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-3xl border border-white/10 bg-black/90 p-7 sm:p-8 shadow-soft text-white text-left">
            <nav className="flex items-center gap-2 text-xs text-white/70 font-semibold" aria-label="Breadcrumb">
              <Link href="/services" className="hover:text-white">Services</Link>
              <span>/</span>
              <span className="text-white">{service.title}</span>
            </nav>

            <div className="mt-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-gold text-black px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em]">
                {service.category}
              </span>
              <RevealText
                as="h1"
                text={service.title}
                className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl text-balance"
              />
              <Reveal delay={0.25}>
                <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/90 font-medium">{service.short}</p>
              </Reveal>
              <Reveal delay={0.35}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/booking?service=${service.slug}`}
                    className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-black shadow-soft transition-colors hover:bg-gold/90"
                  >
                    Book this session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <span className="text-sm text-white/70 font-medium">
                    from <span className="font-semibold text-white">{formatPrice(displayPrice, currentCurrency)}</span> <span className="text-[10px] text-white/60 ml-0.5">(incl. GST)</span>
                  </span>
                </div>
              </Reveal>
            </div>
          </div>

          <motion.div style={{ y }} className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border/60 shadow-float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getOptimizedCloudinaryUrl(service.image, 'image')} alt={service.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/25 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
