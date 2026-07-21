'use client';

import { motion, useInView, useScroll, useTransform, useSpring, type Variants } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

// Fade + rise on scroll into view.
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: '-12% 0px -12% 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

// Stagger a list of children.
export function Stagger({
  children,
  className,
  gap = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={cn(className)}>
      {children}
    </motion.div>
  );
}

// Word-by-word headline reveal.
export function RevealText({
  text,
  className,
  as: Tag = 'h2',
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const words = text.split(' ');

  return (
    <Tag ref={ref} className={cn('inline-block', className)} aria-label={text}>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-block whitespace-nowrap mr-[0.25em]">
          {word.split('').map((char, charIdx) => {
            // Calculate a unique sequential delay index for each character
            const charGlobalIdx = words.slice(0, wordIdx).join('').length + charIdx;
            return (
              <span key={charIdx} className="inline-block overflow-hidden align-bottom">
                <motion.span
                  className="inline-block origin-bottom"
                  initial={{ y: '115%', filter: 'blur(4px)', scale: 0.92 }}
                  animate={inView ? { y: 0, filter: 'blur(0px)', scale: 1 } : {}}
                  transition={{
                    duration: 0.85,
                    delay: delay + charGlobalIdx * 0.02,
                    ease: EASE,
                  }}
                >
                  {char}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

// Scroll-driven story wrapper that triggers progressive animations based on target viewport coordinates
export function ScrollStory({
  children,
  className,
  startOffset = 'start end',
  endOffset = 'end start',
}: {
  children: React.ReactNode;
  className?: string;
  startOffset?: string;
  endOffset?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [startOffset as any, endOffset as any],
  });

  const smoothProgress = useSpring(scrollYProgress, { damping: 30, stiffness: 200 });

  const opacity = useTransform(smoothProgress, [0, 0.25, 0.75, 1], [0.35, 1, 1, 0.35]);
  const y = useTransform(smoothProgress, [0, 0.25, 0.75, 1], [40, 0, 0, -40]);
  const scale = useTransform(smoothProgress, [0, 0.25, 0.75, 1], [0.97, 1, 1, 0.97]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, scale }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  );
}
