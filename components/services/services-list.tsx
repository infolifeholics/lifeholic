'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, Video } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/site/reveal';
import { formatPrice } from '@/lib/format';
import { getServiceRoute } from '@/lib/routes';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import { useCurrency } from '@/components/providers/currency-provider';
import { convertInrToCurrency } from '@/lib/currency';

export function ServicesList({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const { currentCurrency, exchangeRate } = useCurrency();

  useEffect(() => {
    const q = query(collection(db, 'services'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Service)
        .filter((s) => s.active !== false);
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setServices(list);
    });
    return () => unsub();
  }, []);

  return (
    <Stagger className="grid gap-6 md:grid-cols-2" gap={0.07}>
      {services.map((s) => (
        <StaggerItem key={s.id}>
          <Link href={getServiceRoute(s.slug)} className="group block h-full">
            <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float sm:flex-row sm:h-[220px]">
              <div className="relative w-full aspect-[4/3] overflow-hidden sm:w-[293px] sm:h-[220px] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent sm:bg-gradient-to-r" />
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    {s.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {s.duration_minutes} min
                  </span>
                  <span 
                    className="inline-flex items-center gap-1 text-[10px] text-gold font-semibold"
                    style={{ backgroundColor: '#121212', padding: '1px 6px', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                  >
                    {s.duration_minutes} Mins × {s.included_sessions || 1} {(s.included_sessions || 1) === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg sm:text-xl font-medium text-foreground">{s.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-normal text-muted-foreground">{s.short}</p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1 text-[9px] text-muted-foreground">
                    <Video className="h-2.5 w-2.5" /> Online
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
                  <span className="text-xs text-muted-foreground">
                    from <span className="font-medium text-foreground">
                      {formatPrice(
                        currentCurrency === 'INR'
                          ? s.price_inr
                          : convertInrToCurrency(s.price_inr, exchangeRate || 0, currentCurrency),
                        currentCurrency
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">(incl. GST)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                    Explore <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </article>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
