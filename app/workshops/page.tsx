'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Workshop } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'workshops'));
    const unsub = onSnapshot(q, (snap) => {
      setWorkshops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workshop));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-2" />
        <p className="text-sm">Aligning upcoming somatic gatherings...</p>
      </div>
    );
  }

  const featured = workshops.filter((w) => w.featured && w.status === 'published');
  const upcoming = workshops.filter((w) => !w.featured && w.status === 'published');
  const completed = workshops.filter((w) => w.status === 'completed');

  return (
    <div className="min-h-screen bg-background-2/30 py-16 sm:py-24 text-left">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">Gather in Community</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Somatic Workshops &amp; Retreats
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Deep group experiences, inner child alignments, and ancestral patterns release led by certified somatic facilitators.
          </p>
        </div>

        {/* Featured Workshop */}
        {featured.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 fill-gold" /> Featured Somatic Experience
            </h2>
            <div className="grid gap-8 lg:grid-cols-12 rounded-3xl border border-border/60 bg-card p-6 lg:p-8 shadow-soft items-center">
              <div className="lg:col-span-7 aspect-[16/9] overflow-hidden rounded-2xl relative border border-border/20">
                <img src={featured[0].image} alt={featured[0].title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-4 left-4 bg-gold text-gold-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                  Featured Gathering
                </span>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
                <div>
                  <h3 className="font-display text-2xl lg:text-3xl font-medium text-foreground">{featured[0].title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{featured[0].short_description}</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground border-t border-b border-border/40 py-3">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-gold" />
                      {new Date(featured[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gold" />
                      {featured[0].start_time} - {featured[0].end_time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Exchange</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(featured[0].price_inr, 'INR')}</p>
                    </div>
                    <Link href={`/workshops/${featured[0].slug}`}>
                      <Button className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5">
                        Reserve Slot <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Workshops */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gold">Upcoming Gatherings</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming workshops scheduled at this time. Stay tuned!</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((w) => (
                <WorkshopCard key={w.id} w={w} />
              ))}
            </div>
          )}
        </div>

        {/* Completed Workshops */}
        {completed.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-border/40">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gold">Past Memories &amp; Integrations</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((w) => (
                <WorkshopCard key={w.id} w={w} isCompleted />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkshopCard({ w, isCompleted }: { w: Workshop; isCompleted?: boolean }) {
  const left = Math.max(0, w.seats_total - w.seats_booked);
  const pct = Math.round((w.seats_booked / w.seats_total) * 100);

  return (
    <article className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-4 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="aspect-[16/10] overflow-hidden rounded-2xl relative border border-border/20">
          <img src={w.image} alt={w.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-103" />
          <span className={cn(
            'absolute bottom-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full',
            isCompleted ? 'bg-secondary text-muted-foreground' : 'bg-gold text-gold-foreground'
          )}>
            {isCompleted ? 'Completed' : w.type}
          </span>
        </div>
        <div>
          <h3 className="font-display text-lg font-medium text-foreground line-clamp-1">{w.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{w.short_description}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/20 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(w.date).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {w.start_time}
          </span>
        </div>

        {!isCompleted && (
          <div className="space-y-1">
            <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{left} seats left</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-1">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Exchange</p>
            <p className="text-sm font-bold text-foreground">{formatPrice(w.price_inr, 'INR')}</p>
          </div>
          <Link href={`/workshops/${w.slug}`}>
            <Button size="sm" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground">
              {isCompleted ? 'View Memories' : 'Details'}
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
