'use client';

import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export function ScrollBlurWrapper({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll();

  // Smooth out the scroll changes
  const smoothScrollY = useSpring(scrollY, { damping: 40, stiffness: 180 });

  // Map scroll distance (0 to 500px) to bg opacity for a very soft, gradual transition
  const bgOpacity = useTransform(
    smoothScrollY,
    [0, 500],
    ['rgba(246, 241, 234, 0)', 'rgba(246, 241, 234, 0.3)']
  );

  return (
    <motion.div
      style={{
        backgroundColor: bgOpacity,
      }}
      className="relative z-10"
    >
      {children}
    </motion.div>
  );
}
