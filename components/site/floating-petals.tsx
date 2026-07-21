'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

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

function FloatingPetalItem({ el, smoothScrollY }: { el: ElementType; smoothScrollY: any }) {
  // Calculate scroll-driven parallax transform based on actual scroll pixels
  const yOffset = useTransform(smoothScrollY, (latest: number) => latest * el.parallaxRate);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${el.left}%`,
        top: `${el.top}%`,
        width: `${el.size}px`,
        height: `${el.size}px`,
        opacity: el.opacity,
        y: yOffset,
      }}
      className="will-change-transform"
    >
      {/* Gentle idle swaying animation (float, sway, rotate) */}
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
        className="w-full h-full flex items-center justify-center"
      >
        {el.type === 'dust' && (
          <div className="w-full h-full rounded-full bg-amber-200/40 shadow-[0_0_8px_rgba(251,191,36,0.4)] blur-[0.5px]" />
        )}
        {el.type === 'light' && (
          <div className="w-full h-full rounded-full bg-emerald-100/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] blur-[1px]" />
        )}
        {el.type !== 'dust' && el.type !== 'light' && SHAPES[el.type as keyof typeof SHAPES]}
      </motion.div>
    </motion.div>
  );
}

export function FloatingPetals() {
  const [elements, setElements] = useState<ElementType[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track window scroll in pixels for smooth parallax mapping
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, { damping: 55, stiffness: 120 });

  useEffect(() => {
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
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-y-0 left-0 right-0 z-10 overflow-hidden pointer-events-none min-h-full">
      {elements.map((el) => (
        <FloatingPetalItem key={el.id} el={el} smoothScrollY={smoothScrollY} />
      ))}
    </div>
  );
}

export default FloatingPetals;
