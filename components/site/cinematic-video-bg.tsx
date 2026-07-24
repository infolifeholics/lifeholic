'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const DEFAULT_VIDEO = 'https://cdn.prod.website-files.com/691c3d8b8165d353a2345b2d%2F691d841c9c6b35b63efb82bc_hero-bg-video_mp4.mp4';

export function CinematicVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(DEFAULT_VIDEO);

  // Track scroll for zoom and slight translation parallax
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], ['0%', '-5%']);
  const scaleParallax = useTransform(scrollYProgress, [0, 1], [1.02, 1.08]);

  // Track mouse coordinates for subtle parallax (15-30px max)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for mouse parallax interpolation
  const springConfig = { damping: 45, stiffness: 180, mass: 1.2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'video');
    getDoc(docRef)
      .then((snap) => {
        if (snap.exists() && snap.data().url) {
          setVideoSrc(snap.data().url);
        }
      })
      .catch((err) => console.warn('Could not fetch custom bg video:', err));
  }, []);

  useEffect(() => {
    // Disable mouse parallax on touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to range [-15, 15] for max 30px offset
      const xOffset = (e.clientX / window.innerWidth - 0.5) * -30;
      const yOffset = (e.clientY / window.innerHeight - 0.5) * -30;
      mouseX.set(xOffset);
      mouseY.set(yOffset);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-background">
      {/* Parallax Container */}
      <motion.div
        className="relative h-[110%] w-[110%] -left-[5%] -top-[5%]"
        style={{
          x: smoothX,
          y: smoothY,
          translateY: yParallax,
          scale: scaleParallax,
        }}
      >
        <video
          key={videoSrc}
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover select-none pointer-events-none blur-[2px]"
          src={videoSrc}
        />
      </motion.div>

      {/* Premium Cinematic Overlay (white gradient, vignette, radial glow, grain) */}
      <div className="absolute inset-0 bg-white/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/45 to-white/75" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(172, 168, 168, 0.85)_100%)]" />
      <div className="absolute inset-0 bg-grain opacity-[0.18] mix-blend-overlay" />

      {/* Ambient floating CSS particles (lightweight dust) */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.35]">
        {Array.from({ length: 15 }).map((_, i) => {
          const size = Math.random() * 3 + 2;
          const delay = Math.random() * 12;
          const duration = Math.random() * 20 + 20;
          const left = Math.random() * 100;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-gold/50 blur-[1px] animate-float-ambient"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                bottom: '-20px',
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            />
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes float-ambient {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.65;
          }
          90% {
            opacity: 0.65;
          }
          100% {
            transform: translateY(-110vh) translateX(50px) scale(0.8);
            opacity: 0;
          }
        }
        .animate-float-ambient {
          animation-name: float-ambient;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
}

export default CinematicVideoBg;
