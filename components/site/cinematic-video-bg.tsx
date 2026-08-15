'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const DEFAULT_VIDEO = 'https://cdn.prod.website-files.com/691c3d8b8165d353a2345b2d%2F691d841c9c6b35b63efb82bc_hero-bg-video_mp4.mp4';

export function CinematicVideoBg() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(DEFAULT_VIDEO);
  const [fallbackImage, setFallbackImage] = useState('');

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

  // Listen to background image fallback in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'cms', 'global'), (snap) => {
      if (snap.exists() && snap.data().background_image) {
        setFallbackImage(snap.data().background_image);
      } else {
        setFallbackImage('');
      }
    }, (err) => console.warn('Could not fetch custom bg image:', err));
    return () => unsubscribe();
  }, []);

  // Pause background video when off-screen or tab is inactive to save CPU/GPU resources
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoPlayState = () => {
      if (document.hidden) {
        video.pause();
        return;
      }
      
      const isVideoPage = pathname === '/' || pathname === '/about';
      if (!isVideoPage) {
        video.pause();
        return;
      }

      if (window.scrollY > window.innerHeight * 1.2) {
        if (!video.paused) {
          video.pause();
        }
      } else {
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    };

    window.addEventListener('scroll', handleVideoPlayState, { passive: true });
    document.addEventListener('visibilitychange', handleVideoPlayState);
    
    // Initial check
    handleVideoPlayState();

    return () => {
      window.removeEventListener('scroll', handleVideoPlayState);
      document.removeEventListener('visibilitychange', handleVideoPlayState);
    };
  }, [pathname]);

  useEffect(() => {
    // Disable mouse parallax on touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      const isVideoPage = pathname === '/' || pathname === '/about';
      // Return early if tab is hidden, page is not a video page, or scrolled down past the hero section (covered)
      if (document.hidden || !isVideoPage || window.scrollY > window.innerHeight * 1.2) return;

      // Normalize to range [-15, 15] for max 30px offset
      const xOffset = (e.clientX / window.innerWidth - 0.5) * -30;
      const yOffset = (e.clientY / window.innerHeight - 0.5) * -30;
      mouseX.set(xOffset);
      mouseY.set(yOffset);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const isVideoPage = pathname === '/' || pathname === '/about';

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
        {isVideoPage ? (
          <video
            key={videoSrc}
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover select-none pointer-events-none"
            src={videoSrc}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallbackImage || "https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200"}
            alt="Page background"
            className="h-full w-full object-cover select-none pointer-events-none brightness-[0.7] contrast-[1.02]"
          />
        )}
      </motion.div>

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
