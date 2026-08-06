'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Reveal } from '@/components/site/reveal';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Play, Video } from 'lucide-react';

type GalleryItem = {
  url: string;
  type: 'image' | 'video';
};

const DEFAULT_GALLERY: GalleryItem[] = [
  { url: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
];

export function AboutGallery() {
  const [items, setItems] = useState<GalleryItem[]>(DEFAULT_GALLERY);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'about_gallery'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.items && Array.isArray(data.items)) {
            setItems(data.items.slice(0, 2));
          }
        }
      } catch (err) {
        console.error('Error loading about gallery:', err);
      }
    };
    fetchGallery();
  }, []);

  const visibleItems = items.slice(0, 2);
  const hasMore = false;

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 justify-center max-w-3xl mx-auto">
            {visibleItems.map((item, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border/60 relative aspect-[4/3]"
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full group">
                    <video
                      src={item.url}
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-md">
                      <Video className="h-2.5 w-2.5" />
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
