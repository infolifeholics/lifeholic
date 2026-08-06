'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Link from 'next/link';
import { CalendarDays, Clock, Sparkles, Loader2, ArrowRight, MapPin } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Workshop } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'current' | 'completed'>('all');

  const TABS = [
    { id: 'all', label: 'All Workshops' },
    { id: 'upcoming', label: 'Upcoming Workshops' },
    { id: 'current', label: 'Current Workshops' },
    { id: 'completed', label: 'Completed Workshops' },
  ] as const;

  useEffect(() => {
    const q = query(collection(db, 'workshops'));
    const unsub = onSnapshot(q, (snap) => {
      setWorkshops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workshop));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const parsedWorkshops = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return workshops.map(w => {
      let calculatedStatus: 'upcoming' | 'current' | 'completed' = 'upcoming';
      
      if (!w.date) {
        calculatedStatus = 'upcoming';
      } else {
        const start = w.date;
        const end = w.end_date || w.date;
        
        if (todayStr < start) {
          calculatedStatus = 'upcoming';
        } else if (todayStr >= start && todayStr <= end) {
          calculatedStatus = 'current';
        } else {
          calculatedStatus = 'completed';
        }
      }
      
      return {
        ...w,
        calculatedStatus
      };
    });
  }, [workshops]);

  const filteredWorkshops = useMemo(() => {
    return parsedWorkshops.filter(w => {
      if (w.status === 'draft' || w.status === 'cancelled') return false;
      if (activeTab === 'all') return true;
      return w.calculatedStatus === activeTab;
    });
  }, [parsedWorkshops, activeTab]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-2" />
        <p className="text-sm">Aligning somatic gatherings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-2/30 py-16 sm:py-24 text-left">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Gather in Community</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            WORKSHOPS
          </h1>
          <p className="text-sm sm:text-base text-black font-medium leading-relaxed">
            At Lifeholics, our workshops are designed to help you understand yourself on a deeper level while experiencing practical healing techniques that you can apply in your daily life. Each workshop focuses on a specific area of healing and personal transformation.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex justify-center border-b border-border/40 pb-px">
          <div className="flex flex-wrap bg-secondary/60 p-1 rounded-3xl border border-border/40 items-center justify-center gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                  activeTab === tab.id 
                    ? "bg-gold text-gold-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-8">
          {filteredWorkshops.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card/40">
              <p className="text-sm font-medium text-foreground">No workshops found.</p>
              <p className="mt-1 text-xs text-muted-foreground">More Workshops Coming Soon. We’re continuously creating new workshops to support different aspects of healing, self-discovery, and personal growth.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkshops.map((w) => (
                <WorkshopCard key={w.id} w={w} isCompleted={w.calculatedStatus === 'completed'} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function WorkshopCard({ w, isCompleted }: { w: Workshop; isCompleted?: boolean }) {
  const left = Math.max(0, w.seats_total - w.seats_booked);
  const pct = Math.round((w.seats_booked / w.seats_total) * 100);

  return (
    <article className="group relative h-full overflow-hidden rounded-3xl border border-white/20 bg-white/40 backdrop-blur-md p-4 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between">
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
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {w.venue_name || w.location || 'Online'}
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
