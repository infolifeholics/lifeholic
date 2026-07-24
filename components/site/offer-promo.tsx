'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function OfferPopup() {
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<any>(null);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('thelifeholics-offer-dismissed');
    if (isDismissed) return;

    const docRef = doc(db, 'settings', 'offers');
    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.active && data.showPopup) {
            setOffer(data);
            // Show popup with a tiny delay for feel-good entrance
            const t = setTimeout(() => setOpen(true), 1500);
            return () => clearTimeout(t);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch promo offer popup config:', err));
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem('thelifeholics-offer-dismissed', 'true');
  };

  if (!open || !offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card max-w-lg w-full p-6 md:p-8 shadow-glow transition-all duration-300">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-4 -mt-4 pointer-events-none" />
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary text-muted-foreground transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Special Promotion
          </span>

          {offer.imageUrl && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border/40 bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-bold text-primary tracking-widest uppercase block">{offer.discountText}</span>
            <h3 className="font-display text-2xl md:text-3xl font-medium text-foreground">{offer.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
          </div>

          <div className="pt-4 flex justify-center">
            {offer.linkUrl ? (
              <Button asChild onClick={handleClose} className="rounded-full px-8 gap-2">
                <Link href={offer.linkUrl}>
                  Claim this Offer <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={handleClose} className="rounded-full px-8">
                Sounds Good!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfferInlineBanner() {
  const [offer, setOffer] = useState<any>(null);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'offers');
    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.active) {
            setOffer(data);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch inline promo banner config:', err));
  }, []);

  if (!offer) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 my-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Ambient background splash */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left z-10">
          {offer.imageUrl && (
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-secondary border border-border/40 shrink-0 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={offer.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary tracking-wider uppercase block">{offer.discountText || 'EXCLUSIVE PROMO'}</span>
            <h3 className="font-display text-xl md:text-2xl font-medium text-foreground">{offer.title}</h3>
            <p className="text-sm text-muted-foreground max-w-xl">{offer.description}</p>
          </div>
        </div>

        <div className="shrink-0 z-10">
          <Button asChild className="rounded-full px-6 gap-2">
            <Link href={offer.linkUrl || '/shop'}>
              Claim Offer <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
