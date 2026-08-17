'use client';

import { useEffect, useState, useRef } from 'react';
import { Instagram, Heart, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { RevealText, Reveal } from '@/components/site/reveal';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function LazyVideo({ src, className, onLoadedMetadata }: { src: string; className?: string; onLoadedMetadata?: (e: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.load();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch((err) => {
              console.warn("Autoplay failed:", err);
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(video);
    return () => {
      observer.unobserve(video);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onLoadedMetadata={onLoadedMetadata}
    />
  );
}

export function HomeInstagram() {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aspectRatios, setAspectRatios] = useState<Record<string, 'portrait' | 'landscape' | 'square'>>({});
  const [centerHeartActive, setCenterHeartActive] = useState<Record<string, boolean>>({});
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; startX: number; startY: number; rotate: number; scale: number; color: string; duration: number }>>([]);
  const [lastClickTimeMap, setLastClickTimeMap] = useState<Record<string, number>>({});

  const handleCardClick = (itemId: string, e: React.MouseEvent) => {
    const now = Date.now();
    const lastClick = lastClickTimeMap[itemId] || 0;
    if (now - lastClick < 300) {
      handleLike(itemId, e);
    }
    setLastClickTimeMap((prev) => ({ ...prev, [itemId]: now }));
  };

  useEffect(() => {
    const q = collection(db, 'landing_feed');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data());
      const defaultPosts = [
        'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=500',
      ];
      const defaultLikes = [1240, 5120, 8430, 4310];
      const items = Array.from({ length: 4 }, (_, i) => {
        const id = `slot_${i + 1}`;
        const found = data?.find((d) => d.id === id);
        return {
          id,
          url: (found && found.url) ? found.url : defaultPosts[i],
          type: found ? found.type : 'image',
          likes: Math.max((found && typeof found.likes === 'number') ? found.likes : 0, defaultLikes[i]),
          link: found ? found.link : '',
        };
      });
      setFeedItems(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleImageLoad = (id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    let ratio: 'portrait' | 'landscape' | 'square' = 'square';
    if (img.naturalWidth > img.naturalHeight + 50) {
      ratio = 'landscape';
    } else if (img.naturalHeight > img.naturalWidth + 50) {
      ratio = 'portrait';
    }
    setAspectRatios((prev) => {
      if (prev[id] === ratio) return prev;
      return { ...prev, [id]: ratio };
    });
  };

  const handleVideoMetadata = (id: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    let ratio: 'portrait' | 'landscape' | 'square' = 'square';
    if (video.videoWidth > video.videoHeight) {
      ratio = 'landscape';
    } else if (video.videoHeight > video.videoWidth) {
      ratio = 'portrait';
    }
    setAspectRatios((prev) => {
      if (prev[id] === ratio) return prev;
      return { ...prev, [id]: ratio };
    });
  };

  const handleLike = async (itemId: string, e?: React.MouseEvent) => {
    // 1. Center heart animation
    setCenterHeartActive((prev) => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      setCenterHeartActive((prev) => ({ ...prev, [itemId]: false }));
    }, 850);

    const colors = [
      '#f43f5e', // rose
      '#ec4899', // pink
      '#d946ef', // fuchsia
      '#a855f7', // purple
      '#eab308', // yellow
      '#f97316', // orange
      '#3b82f6', // blue
      '#10b981'  // emerald
    ];

    // 2. Spawn 18 colorful hearts spread across the screen
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const newHearts = Array.from({ length: 18 }).map(() => ({
      id: Math.random(),
      startX: Math.random() * windowWidth,
      startY: windowHeight + Math.random() * 80,
      rotate: (Math.random() - 0.5) * 80,
      scale: 0.5 + Math.random() * 0.9,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 1.4 + Math.random() * 1.4
    }));

    setFloatingHearts((prev) => [...prev, ...newHearts]);

    // 3. Firestore increment (using setDoc with merge: true to initialize if missing)
    try {
      const docRef = doc(db, 'landing_feed', itemId);
      const currentItem = feedItems.find(item => item.id === itemId);
      const newLikes = (currentItem?.likes || 0) + 1;

      await setDoc(docRef, {
        id: itemId,
        likes: newLikes,
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to persist like increment:', err);
    }

    // 4. Cleanup hearts
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 3000);
  };

  const handleShare = async (item: any) => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?post=${item.id}`;
    const shareData = {
      title: 'The Lifeholics Feed',
      text: 'Check out this post from @thelifeholics!',
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn('Share failed:', err);
      }
    } else {
      // Fallback
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link.');
      }
    }
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Instagram className="h-3.5 w-3.5 text-gold" /> @thelifeholics
          </span>
          <RevealText
            as="h2"
            text="A little quiet on your feed"
            className="mt-4 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
          />
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-gold mr-2" />
            Loading feed...
          </div>
        ) : (
          <Reveal delay={0.2}>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-center items-start">
              {feedItems.map((item) => {
                const ratio = aspectRatios[item.id] || 'square';
                const ratioClass =
                  ratio === 'portrait'
                    ? 'aspect-[3/4]'
                    : ratio === 'landscape'
                      ? 'aspect-[4/3]'
                      : 'aspect-square';

                return (
                  <div
                    key={item.id}
                    className="relative flex flex-col items-center group w-full max-w-sm mx-auto"
                  >
                    {/* Media Card */}
                    <div
                      onClick={(e) => handleCardClick(item.id, e)}
                      className={cn(
                        'relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-500 cursor-pointer select-none bg-card/40',
                        ratioClass
                      )}
                    >
                      {item.type === 'video' ? (
                        <LazyVideo
                          key={item.url}
                          src={item.url}
                          className="h-full w-full object-cover"
                          onLoadedMetadata={(e) => handleVideoMetadata(item.id, e)}
                        />
                      ) : (
                        <img
                          key={item.url}
                          src={item.url}
                          alt="Feed post"
                          className="h-full w-full object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
                          onLoad={(e) => handleImageLoad(item.id, e)}
                          loading="lazy"
                        />
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-all duration-300 group-hover:opacity-100">
                        <div className="flex flex-col items-center justify-center pointer-events-none mb-3">
                          <Instagram className="h-8 w-8 text-white mb-2 transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300" />
                          <span className="text-xs text-white/90 font-medium">Double-tap to like</span>
                        </div>
                        {item.link && (
                          <div className="mt-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                            {item.link.startsWith('http') ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-gold hover:bg-gold/80 text-black font-semibold text-xs px-4 py-2 rounded-full shadow-glow transition-all duration-300 active:scale-95"
                              >
                                Explore
                              </a>
                            ) : (
                              <Link
                                href={item.link}
                                className="inline-flex items-center gap-1 bg-gold hover:bg-gold/80 text-black font-semibold text-xs px-4 py-2 rounded-full shadow-glow transition-all duration-300 active:scale-95"
                              >
                                Explore
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Central heart pop animation */}
                      <AnimatePresence>
                        {centerHeartActive[item.id] && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.2, 1], opacity: [0, 0.9, 0.9] }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                          >
                             <Heart className="h-20 w-20 text-white fill-white" />
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
 
                     {/* Like Counter & Button Block */}
                     <div className="mt-3 flex items-center justify-between w-full px-4 text-xs text-muted-foreground">
                       <button
                         onClick={(e) => handleLike(item.id, e)}
                         className="flex items-center gap-1.5 hover:text-rose-500 transition-colors group/btn py-1"
                       >
                         <Heart className="h-4 w-4 transition-transform group-hover/btn:scale-125 group-active/btn:scale-95 duration-200" />
                         <span className="font-semibold text-foreground">{item.likes.toLocaleString()} likes</span>
                       </button>
 
                       <button
                         onClick={() => handleShare(item)}
                         className="flex items-center gap-1 hover:text-gold transition-colors group/share py-1 text-muted-foreground"
                         title="Share Post"
                       >
                         <Share2 className="h-3.5 w-3.5 transition-transform group-hover/share:scale-110" />
                         <span>Share</span>
                       </button>
                     </div>
                   </div>
                 );
               })}
             </div>
           </Reveal>
         )}
 
         {/* Global floating hearts layer */}
         <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
           <AnimatePresence>
             {floatingHearts.map((h) => (
               <motion.span
                 key={h.id}
                 initial={{ opacity: 1, scale: h.scale, x: h.startX, y: h.startY, rotate: h.rotate }}
                 animate={{
                   opacity: [1, 0.9, 0],
                   y: h.startY - 400,
                   x: h.startX + (Math.random() - 0.5) * 150,
                   rotate: h.rotate + (Math.random() - 0.5) * 95
                 }}
                 exit={{ opacity: 0 }}
                 transition={{ duration: h.duration, ease: 'easeOut' }}
                 className="absolute pointer-events-none"
                 style={{ color: h.color }}
               >
                 <Heart className="h-8 w-8 fill-current" />
               </motion.span>
             ))}
           </AnimatePresence>
         </div>

        <div className="mt-12 text-center">
          <Link
            href="https://www.instagram.com/thelifeholics/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Follow along <Instagram className="h-4 w-4 animate-pulse" />
          </Link>
        </div>
      </div>
    </section>
  );
}
