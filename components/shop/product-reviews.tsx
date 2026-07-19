'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { StarRating } from '@/components/site/star-rating';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  name: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export function ProductReviews({ productId, initial }: { productId: string; initial: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !body) {
      toast.error('Please add your name and a few words.');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({ product_id: productId, name, rating, title: title || null, body })
      .select('id, name, rating, title, body, created_at')
      .single();
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit your review. Please try again.');
      return;
    }
    setReviews((r) => [data as Review, ...r]);
    setOpen(false);
    setName(''); setTitle(''); setBody(''); setRating(5);
    toast.success('Thank you — your review is live.');
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-medium text-foreground">Reviews ({reviews.length})</h3>
        <Button variant="outline" onClick={() => setOpen((o) => !o)} className="rounded-full">
          {open ? 'Cancel' : 'Write a review'}
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border/60 bg-card/50 p-6">
          <div>
            <Label>Your rating</Label>
            <div className="mt-2 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                  className={cn('text-2xl transition-transform hover:scale-110', n <= rating ? 'text-gold' : 'text-muted-foreground/30')}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="r-name">Name</Label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="r-title">Title <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="r-body">Your review</Label>
            <Textarea id="r-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1.5" required />
          </div>
          <Button type="submit" disabled={submitting} className="rounded-full">
            {submitting ? 'Submitting…' : 'Submit review'}
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
            No reviews yet — be the first to share your experience.
          </p>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{r.name}</p>
                  <StarRating rating={r.rating} size={12} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.title && <p className="mt-3 font-medium text-foreground">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
