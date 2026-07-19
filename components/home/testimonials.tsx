'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { Testimonial } from '@/lib/types';
import { SectionHeading } from '@/components/site/section-heading';
import { StarRating } from '@/components/site/star-rating';
import { cn } from '@/lib/utils';

export function HomeTestimonials({ items }: { items: Testimonial[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: 'start', dragFree: true });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    onSelect();
  }, [embla, onSelect]);

  if (!items.length) return null;

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="In their words"
          title="Quiet transformations"
          description="What clients say when they feel safe enough to share."
        />

        <div className="mt-14 overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {items.map((t) => (
              <div key={t.id} className="min-w-0 flex-[0_0_88%] pr-5 sm:flex-[0_0_48%] lg:flex-[0_0_32%]">
                <figure className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/60 p-7 shadow-soft">
                  <Quote className="h-8 w-8 text-gold/50" />
                  <blockquote className="mt-4 flex-1 text-pretty font-display text-lg leading-relaxed text-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span className="h-11 w-11 rounded-full bg-secondary" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role}{t.role && t.location ? ' · ' : ''}{t.location}
                      </p>
                    </div>
                    <StarRating rating={t.rating} className="ml-auto" />
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => embla?.scrollPrev()}
            aria-label="Previous"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === selected ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <button
            onClick={() => embla?.scrollNext()}
            aria-label="Next"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
