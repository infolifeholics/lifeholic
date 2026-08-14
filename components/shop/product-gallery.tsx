'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { ProductWishlistButton } from '@/components/shop/product-wishlist-button';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  gallery: string[];
  productName: string;
  productId: string;
}

export function ProductGallery({ gallery, productName, productId }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const sliderRef = useRef<HTMLDivElement>(null);
  const hoverContainerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const isDragging = useRef(false);
  const startDragOffset = useRef({ x: 0, y: 0 });

  // Sync scroll position with activeIndex on click
  const scrollToIndex = (index: number) => {
    if (!sliderRef.current) return;
    const clientWidth = sliderRef.current.clientWidth;
    sliderRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  // Detect activeIndex from scroll
  const handleScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    if (clientWidth === 0) return;
    const index = Math.round(scrollLeft / clientWidth);
    if (index !== activeIndex && index >= 0 && index < gallery.length) {
      setActiveIndex(index);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxIndex]);

  // Navigate next/prev
  const navigateMain = (direction: number) => {
    let nextIndex = activeIndex + direction;
    if (nextIndex < 0) nextIndex = gallery.length - 1;
    if (nextIndex >= gallery.length) nextIndex = 0;
    scrollToIndex(nextIndex);
  };

  const navigateLightbox = (direction: number) => {
    let nextIndex = lightboxIndex + direction;
    if (nextIndex < 0) nextIndex = gallery.length - 1;
    if (nextIndex >= gallery.length) nextIndex = 0;
    setLightboxIndex(nextIndex);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Hover zoom handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverContainerRef.current) return;
    const { left, top, width, height } = hoverContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setHoverPosition({ x, y });
  };

  // Lightbox Zoom and Drag Panning
  const handleZoom = (amount: number) => {
    setZoomScale((prev) => Math.max(1, Math.min(4, prev + amount)));
  };

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale === 1) return;
    isDragging.current = true;
    startDragOffset.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPanOffset({
      x: e.clientX - startDragOffset.current.x,
      y: e.clientY - startDragOffset.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Mobile Swipe and Double Tap Gestures
  const touchStart = useRef({ x: 0, y: 0 });
  const touchTime = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    
    // Double tap check
    if (now - touchTime.current < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      if (zoomScale > 1) {
        resetZoom();
      } else {
        setZoomScale(2);
      }
    }
    touchTime.current = now;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main image container */}
      <div 
        ref={hoverContainerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-float select-none group/gallery"
      >
        {/* Wishlist item */}
        <div className="absolute right-4 top-4 z-10">
          <ProductWishlistButton productId={productId} className="!h-11 !w-11" />
        </div>

        {/* Zoom Overlay Indicator */}
        <button 
          onClick={() => {
            setLightboxIndex(activeIndex);
            setLightboxOpen(true);
          }}
          className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border/40 bg-background/80 text-foreground backdrop-blur-sm transition-all hover:bg-background md:opacity-0 md:group-hover/gallery:opacity-100"
          aria-label="Zoom Image"
        >
          <Maximize2 className="h-5 w-5" />
        </button>

        {/* Carousel Slider */}
        <div 
          ref={sliderRef}
          onScroll={handleScroll}
          className="flex h-full w-full overflow-x-auto scroll-snap-x-mandatory scroll-smooth no-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {gallery.map((src, i) => (
            <div 
              key={i} 
              onClick={() => {
                setLightboxIndex(i);
                setLightboxOpen(true);
              }}
              className="relative min-w-full w-full h-full aspect-[4/3] scroll-snap-align-start shrink-0 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={src} 
                alt={`${productName} - Image ${i + 1}`} 
                className={cn(
                  "h-full w-full object-contain transition-transform duration-100 ease-out",
                  isHovering && activeIndex === i && "md:scale-[1.8]"
                )}
                style={
                  isHovering && activeIndex === i
                    ? { transformOrigin: `${hoverPosition.x}% ${hoverPosition.y}%` }
                    : undefined
                }
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {/* Carousel Arrows */}
        {gallery.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); navigateMain(-1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border/20 bg-background/70 text-foreground backdrop-blur-sm transition-all hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); navigateMain(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border/20 bg-background/70 text-foreground backdrop-blur-sm transition-all hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails row */}
      {gallery.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {gallery.map((src, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "aspect-square h-16 w-16 overflow-hidden rounded-2xl border transition-all duration-300 shrink-0",
                activeIndex === i 
                  ? "border-gold ring-2 ring-gold/20" 
                  : "border-border/60 hover:border-gold/45"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox Portal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 select-none">
          {/* Header Controls */}
          <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <span className="text-white text-xs font-semibold tracking-wider">
              {lightboxIndex + 1} / {gallery.length}
            </span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleZoom(0.25)} 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button 
                onClick={() => handleZoom(-0.25)} 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setLightboxOpen(false)} 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Slider Window */}
          <div 
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            onMouseMove={handleDragMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Main Lightbox Image */}
            <div 
              onMouseDown={handleMouseDown}
              className={cn(
                "max-h-[85vh] max-w-[90vw] transition-transform duration-200 ease-out",
                zoomScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              )}
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={gallery[lightboxIndex]} 
                alt={`${productName} Large view`}
                className="max-h-[85vh] max-w-[90vw] object-contain pointer-events-none rounded-lg"
              />
            </div>

            {/* Navigation buttons inside Lightbox */}
            {gallery.length > 1 && (
              <>
                <button 
                  onClick={() => navigateLightbox(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => navigateLightbox(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          {gallery.length > 1 && (
            <div className="absolute bottom-4 flex gap-2.5 overflow-x-auto max-w-[80vw] no-scrollbar py-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => { setLightboxIndex(i); resetZoom(); }}
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-xl border-2 transition-all shrink-0",
                    lightboxIndex === i ? "border-gold" : "border-transparent opacity-50 hover:opacity-100"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
