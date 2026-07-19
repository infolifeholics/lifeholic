'use client';

import { useEffect, useRef } from 'react';

// Soft, slow-moving ambient blobs + grain. Pointer-events-none so it never blocks UI.
export function BackgroundAmbient() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!wrap.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      wrap.current.style.setProperty('--mx', `${x}px`);
      wrap.current.style.setProperty('--my', `${y}px`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-aurora"
      style={{ ['--mx' as string]: '0px', ['--my' as string]: '0px' }}
    >
      <div
        className="absolute -top-32 -left-24 h-[44vw] w-[44vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(90_18%_82%_/_0.55),transparent_62%)] blur-3xl animate-float-slow"
        style={{ transform: 'translate(var(--mx), var(--my))' }}
      />
      <div className="absolute top-1/3 -right-24 h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(41_50%_80%_/_0.5),transparent_62%)] blur-3xl animate-float-slower" />
      <div className="absolute bottom-[-12vw] left-1/4 h-[36vw] w-[36vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(30_25%_86%_/_0.55),transparent_62%)] blur-3xl animate-breathe" />
      <div className="absolute inset-0 bg-grain opacity-[0.5]" />
    </div>
  );
}
