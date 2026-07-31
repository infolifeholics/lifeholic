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
  { url: 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3759106/pexels-photo-3759106.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3822908/pexels-photo-3822908.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
];

export function AboutGallery() {
  const [items, setItems] = useState<GalleryItem[]>(DEFAULT_GALLERY);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'about_gallery'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.items && Array.isArray(data.items)) {
            setItems(data.items);
          }
        }
      } catch (err) {
        console.error('Error loading about gallery:', err);
      }
    };
    fetchGallery();
  }, []);

  const visibleItems = isExpanded ? items.slice(0, 6) : items.slice(0, 4);
  const hasMore = items.length > 4;

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 justify-center">
            {visibleItems.map((item, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl border border-border/60 relative ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}
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

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-full gap-2 border-gold/30 hover:border-gold hover:bg-gold/5 text-xs font-semibold px-6 py-2.5 transition-all"
              >
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show More <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
