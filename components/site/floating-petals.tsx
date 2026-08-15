'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { usePathname } from 'next/navigation';

// SVG paths for organic shapes
const SHAPES = {
  // Tiny green leaf
  leaf: (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-accent/40">
      <path d="M17 2c-3.5 0-7.5 4-7.5 9 0 3.5 2.5 6 7.5 7.5 1-4 2.5-6.5 2.5-9.5C19.5 5.5 18.5 2 17 2z" />
    </svg>
  ),
  // Lotus petal (pink/rose tone)
  lotus: (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-rose-300/30">
      <path d="M12 2C9.5 7 7 11 7 15c0 3.5 2.5 5.5 5 5.5s5-2 5-5.5c0-4-2.5-8-5-13z" />
    </svg>
  ),
  // Bamboo leaf (long slender green)
  bamboo: (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-emerald-600/20">
      <path d="M19 2C13.5 4 8 8 4.5 14.5c5.5-2 11-4.5 15.5-9 1-.8.3-2.3-1-3.5z" />
    </svg>
  ),
  // Soft gold flower petal
  petal: (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-gold/30">
      <path d="M12 3c-4.5 0-7 3.5-7 7 0 4.5 3 8 7 8s7-3.5 7-8c0-3.5-2.5-7-7-7z" />
    </svg>
  ),
};

type ElementType = {
  id: number;
  type: 'leaf' | 'lotus' | 'bamboo' | 'petal' | 'dust' | 'light';
  size: number;
  left: number;
  top: number;
  opacity: number;
  parallaxRate: number;
  swayDuration: number;
  swayDelay: number;
  driftX: number;
  swayY: number;
  rotationSequence: number[];
};

function FloatingPetalItem({ el }: { el: ElementType }) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { rootMargin: '120px 0px 120px 0px' } // Pre-load 120px before entering viewport
    );

    observer.observe(item);
    return () => {
      observer.unobserve(item);
    };
  }, []);

  return (
    <div
      ref={itemRef}
      style={{
        position: 'absolute',
        left: `${el.left}%`,
        top: `${el.top}%`,
        width: `${el.size}px`,
        height: `${el.size}px`,
        opacity: el.opacity,
        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${el.parallaxRate}), 0)`,
      }}
      className="will-change-transform pointer-events-none"
    >
      {/* Gentle idle swaying animation (float, sway, rotate) - only run animation loops when visible */}
      {isVisible ? (
        <motion.div
          animate={{
            x: [0, el.driftX, 0],
            y: [0, el.swayY, 0],
            rotate: el.rotationSequence,
          }}
          transition={{
            duration: el.swayDuration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: el.swayDelay,
          }}
          className="w-full h-full flex items-center justify-center pointer-events-none"
        >
          {el.type === 'dust' && (
            <div className="w-full h-full rounded-full bg-amber-200/40 shadow-[0_0_8px_rgba(251,191,36,0.4)] blur-[0.5px]" />
          )}
          {el.type === 'light' && (
            <div className="w-full h-full rounded-full bg-emerald-100/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] blur-[1px]" />
          )}
          {el.type !== 'dust' && el.type !== 'light' && SHAPES[el.type as keyof typeof SHAPES]}
        </motion.div>
      ) : (
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          {el.type === 'dust' && (
            <div className="w-full h-full rounded-full bg-amber-200/40 shadow-[0_0_8px_rgba(251,191,36,0.4)] blur-[0.5px]" />
          )}
          {el.type === 'light' && (
            <div className="w-full h-full rounded-full bg-emerald-100/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] blur-[1px]" />
          )}
          {el.type !== 'dust' && el.type !== 'light' && SHAPES[el.type as keyof typeof SHAPES]}
        </div>
      )}
    </div>
  );
}

export function FloatingPetals() {
  const pathname = usePathname();
  const [elements, setElements] = useState<ElementType[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTargetPage = pathname === '/' || pathname === '/about';

  useEffect(() => {
    if (!isTargetPage) return;
    const types: ElementType['type'][] = ['leaf', 'lotus', 'bamboo', 'petal', 'dust', 'light'];
    
    // Generate 42 sparse nature elements distributed vertically
    const items = Array.from({ length: 42 }).map((_, i) => {
      const type = types[i % types.length];
      const isTinyParticle = type === 'dust' || type === 'light';
      const size = isTinyParticle ? Math.random() * 3 + 2 : Math.random() * 12 + 12;
      
      const startRotation = Math.random() * 360;
      // Some elements rotate completely, others gently sway back and forth
      const rotationSequence = Math.random() > 0.5 
        ? [startRotation, startRotation + 360] 
        : [startRotation, startRotation + Math.random() * 40 - 20, startRotation];

      return {
        id: i,
        type,
        size,
        left: Math.random() * 90 + 5, // Keep inside viewport boundaries
        top: Math.random() * 96 + 2,  // Distribute along the full height of the body
        opacity: isTinyParticle ? Math.random() * 0.4 + 0.3 : Math.random() * 0.2 + 0.1,
        parallaxRate: (Math.random() - 0.5) * 0.16, // Subtle depth: -0.08 to +0.08 scroll multiplier
        swayDuration: Math.random() * 10 + 12, // 12-22s slow cycle
        swayDelay: Math.random() * -22,
        driftX: (Math.random() - 0.5) * 40,
        swayY: -(Math.random() * 25 + 15),
        rotationSequence,
      };
    });
    setElements(items);
  }, [isTargetPage]);

  useEffect(() => {
    if (!isTargetPage || !containerRef.current) return;
    const container = containerRef.current;
    
    let ticked = false;
    const handleScroll = () => {
      if (!ticked) {
        window.requestAnimationFrame(() => {
          container.style.setProperty('--scroll-y', `${window.scrollY}px`);
          ticked = false;
        });
        ticked = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [elements, isTargetPage]);

  if (!isTargetPage) return null;

  return (
    <div ref={containerRef} className="absolute inset-y-0 left-0 right-0 z-10 overflow-hidden pointer-events-none min-h-full">
      {elements.map((el) => (
        <FloatingPetalItem key={el.id} el={el} />
      ))}
    </div>
  );
}

export default FloatingPetals;
