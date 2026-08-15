'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { Testimonial } from '@/lib/types';
import { SectionHeading } from '@/components/site/section-heading';
import { StarRating } from '@/components/site/star-rating';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

export function HomeTestimonials({ items }: { items: Testimonial[] }) {
  const { user, profile } = useAuth();
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: 'start', dragFree: true });
  const [selected, setSelected] = useState(0);
  const [itemsList, setItemsList] = useState<Testimonial[]>(items);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    quote: '',
    rating: 5,
    role: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  // Set up IntersectionObserver to check if section is visible in viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, [itemsList]);

  // Autoplay functionality - only runs when visible
  useEffect(() => {
    if (!embla || !isVisible) return;
    const interval = setInterval(() => {
      embla.scrollNext();
    }, 3000); // 3 seconds interval
    return () => clearInterval(interval);
  }, [embla, isVisible]);

  // Real-time Firestore sync
  useEffect(() => {
    const q = query(
      collection(db, 'testimonials'),
      where('featured', '==', true)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setItemsList(items);
        } else {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Testimonial);
          list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          setItemsList(list);
        }
      },
      (error) => {
        console.error('Error fetching real-time testimonials:', error);
      }
    );
    return () => unsubscribe();
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.quote.trim()) {
      toast.error('Please write a testimonial message.');
      return;
    }
    if (!user) {
      toast.error('You must be signed in to submit a testimonial.');
      return;
    }
    setSubmitting(true);
    try {
      const newTestimonial = {
        userId: user.id || user.uid,
        name: profile?.full_name || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        image: profile?.avatar_url || user.photoURL || null,
        quote: form.quote.trim(),
        rating: Number(form.rating),
        role: form.role.trim() || null,
        location: form.location.trim() || null,
        featured: false,
        sort_order: 999,
        pinned: false,
      };

      await addDoc(collection(db, 'testimonials'), newTestimonial);

      toast.success('Thank you! Your testimonial has been submitted and is pending review.');
      setForm({ quote: '', rating: 5, role: '', location: '' });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error submitting testimonial:', err);
      toast.error(err.message || 'Failed to submit testimonial.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!itemsList.length) return null;

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="In their words"
          title="Quiet transformations"
          description="What clients say when they feel safe enough to share."
        />

        <div className="mt-14 overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {itemsList.map((t) => (
              <div key={t.id} className="min-w-0 flex-[0_0_88%] pr-5 sm:flex-[0_0_48%] lg:flex-[0_0_32%]">
                <figure className="flex h-full flex-col rounded-3xl glass-card glow-border reflection-sweep p-7 shadow-glow backdrop-blur-md border border-white/5">
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 glass text-foreground transition-all hover:bg-white/10 hover:scale-105"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
             {itemsList.map((_, i) => (
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 glass text-foreground transition-all hover:bg-white/10 hover:scale-105"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* If user is logged in, show Add Testimonial button */}
        {user && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-full bg-gold px-6 py-2.5 text-xs font-semibold text-black transition-all duration-300 hover:scale-105 hover:bg-gold/80 hover:shadow-[0_0_18px_rgba(212,175,55,0.5)] active:scale-95"
            >
              Add Your Testimonial
            </button>
          </div>
        )}

        {/* Testimonial Submission Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#161210] p-7 shadow-glow text-left space-y-4 animate-in zoom-in-95 duration-200 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="font-display text-xl font-medium text-white">Add Your Testimonial</h3>
              <p className="text-xs text-white/70">
                Share your journey and support others in finding their path. Testimonials are reviewed by admin before publishing.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, rating: star }))}
                        className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                      >
                        <span className={star <= form.rating ? 'text-gold' : 'text-white/20'}>★</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="test-role" className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">Your Role / Occupation (Optional)</label>
                  <input
                    id="test-role"
                    type="text"
                    placeholder="e.g. Healer, Client, Designer"
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="test-loc" className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">Your Location (Optional)</label>
                  <input
                    id="test-loc"
                    type="text"
                    placeholder="e.g. Mumbai, India"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="test-quote" className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">Your Testimonial (Required)</label>
                  <textarea
                    id="test-quote"
                    required
                    rows={4}
                    placeholder="Tell us about your experience..."
                    value={form.quote}
                    onChange={(e) => setForm(prev => ({ ...prev, quote: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-xs font-medium text-white/80 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-full bg-gold px-4 py-2.5 text-xs font-semibold text-black hover:bg-gold/80 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
