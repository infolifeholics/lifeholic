'use client';

import { useEffect, useRef } from 'react';

export function ThankYouAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const activeCanvas = canvas;
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      activeCanvas.width = window.innerWidth;
      activeCanvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;

      constructor() {
        this.x = activeCanvas.width / 2;
        this.y = activeCanvas.height / 2 - 100;
        this.size = Math.random() * 8 + 5;
        
        // Vibrant palette
        const colors = [
          '#F59E0B', // Gold
          '#10B981', // Emerald
          '#3B82F6', // Blue
          '#EF4444', // Red
          '#EC4899', // Pink
          '#8B5CF6', // Purple
          '#06B6D4', // Cyan
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Burst vector
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 12 + 6;
        this.speedX = Math.cos(angle) * velocity;
        this.speedY = Math.sin(angle) * velocity - 3; // Upward bias
        
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.opacity = 1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.25; // Gravity
        this.speedX *= 0.98; // Air resistance
        this.rotation += this.rotationSpeed;
        if (this.y > activeCanvas.height - 20) {
          this.opacity -= 0.015;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.translate(this.x, this.y);
        c.rotate((this.rotation * Math.PI) / 180);
        c.globalAlpha = Math.max(0, this.opacity);
        c.fillStyle = this.color;
        
        // Draw rectangle particles
        c.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        c.restore();
      }
    }

    const particles: Particle[] = [];
    // Spawn initial burst
    for (let i = 0; i < 150; i++) {
      particles.push(new Particle());
    }

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.opacity <= 0) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animate();

    // Spawn a few extra trickles from the top corners for a premium feel
    const intervalId = setInterval(() => {
      if (particles.length < 50) {
        for (let i = 0; i < 5; i++) {
          const p = new Particle();
          p.x = Math.random() * activeCanvas.width;
          p.y = -10;
          p.speedX = Math.random() * 4 - 2;
          p.speedY = Math.random() * 3 + 2;
          particles.push(p);
        }
      }
    }, 100);

    // Stop secondary burst after 3 seconds
    setTimeout(() => {
      clearInterval(intervalId);
    }, 3000);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      />
      <style jsx global>{`
        .checkmark-container {
          position: relative;
          display: inline-block;
          margin: 0 auto;
          width: 84px;
          height: 84px;
        }
        .checkmark {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: block;
          stroke-width: 3;
          stroke: #10b981;
          stroke-miterlimit: 10;
          box-shadow: inset 0px 0px 0px #10b981;
          animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
        }
        .checkmark__circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 3;
          stroke-miterlimit: 10;
          stroke: #10b981;
          fill: none;
          animation: stroke .6s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;
        }
        .checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke .3s cubic-bezier(0.650, 0.000, 0.450, 1.000) .8s forwards;
          stroke: #ffffff;
        }

        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes scale {
          0%, 100% {
            transform: none;
          }
          50% {
            transform: scale3d(1.1, 1.1, 1);
          }
        }
        @keyframes fill {
          100% {
            box-shadow: inset 0px 0px 0px 40px #10b981;
          }
        }
      `}</style>
    </>
  );
}
