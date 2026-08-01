'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

export function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background"
        >
          {/* Ambient blobs behind loader */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-accent/20 via-gold/15 to-transparent blur-[120px]" />
            <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-secondary/30 to-transparent blur-[100px]" />
          </div>

          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="relative z-10 flex flex-col items-center gap-5"
          >
            {/* Animated circle + leaf mark */}
            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.svg
                viewBox="0 0 80 80"
                className="absolute inset-0"
                initial={{ rotate: -10, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 1, ease: EASE }}
              >
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="hsl(41 50% 72%)"
                  strokeWidth="1.5"
                  strokeDasharray="226"
                  strokeDashoffset="226"
                  style={{ animation: 'stroke-draw 1.4s ease forwards' }}
                />
              </motion.svg>
              <motion.svg
                viewBox="0 0 40 48"
                className="h-9 w-9"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
              >
                <path
                  d="M20 44 C20 44 4 30 4 16 C4 7.2 11.2 2 20 2 C28.8 2 36 7.2 36 16 C36 30 20 44 20 44Z"
                  fill="none"
                  stroke="hsl(30 25% 32%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M20 44 L20 14"
                  stroke="hsl(41 50% 62%)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </motion.svg>
            </div>

            {/* Brand name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
              className="flex items-baseline gap-0 font-display text-2xl tracking-wide"
            >
              {imageError ? (
                <>
                  <span className="font-medium text-foreground">TheLife</span>
                  <span className="text-gradient-gold font-medium">Holics</span>
                </>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/logo-wordmark.png"
                  alt="TheLifeHolics"
                  onError={() => setImageError(true)}
                  className="h-6 w-auto object-contain brightness-95 contrast-105"
                />
              )}
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
              className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
            >
              Spiritual Psychology &amp; Therapy
            </motion.p>

            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 h-px w-28 origin-left rounded-full bg-gradient-to-r from-transparent via-gold/60 to-transparent"
            />
          </motion.div>

          {/* Slide out wipe */}
          <motion.div
            initial={{ scaleY: 0, originY: 1 }}
            exit={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="absolute inset-0 bg-secondary"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
