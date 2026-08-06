'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

export function HomeCommunity() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="rounded-[2.5rem] border border-white/10 bg-card/60 backdrop-blur-md p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-float relative overflow-hidden"
        >
          {/* Ambient blobs */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-gold/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-40 w-40 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
          
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Lifeholics Tribe
          </span>
          
          <h3 className="mt-6 font-display text-3xl sm:text-4xl text-foreground font-semibold tracking-tight">
            Join the Lifeholics Community
          </h3>
          
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium">
            A sanctuary for conscious souls. Connect with over 5,000+ members on a shared journey of healing, self-discovery, and spiritual growth. Get access to weekly journals, live circles, and guided meditations.
          </p>
          
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <a
              href={process.env.NEXT_PUBLIC_COMMUNITY_WHATSAPP_LINK || "https://chat.whatsapp.com/mock-community"}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-gold-foreground hover:bg-gold-hover transition-all hover:scale-[1.03] shadow-soft duration-200"
            >
              Join our WhatsApp Group
            </a>
            <Link
              href="/about"
              className="rounded-full border border-border/80 px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-all hover:scale-[1.03] duration-200"
            >
              Our Story
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
