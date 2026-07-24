'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_LANDING_IMAGES = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3182452/pexels-photo-3182452.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/409127/pexels-photo-409127.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/290518/pexels-photo-290518.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

interface LandingImage {
  id: number;
  url: string;
}

export function AdminLandingPage() {
  const [images, setImages] = useState<LandingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  const fetchImages = async () => {
    try {
      const colRef = collection(db, 'landing_images');
      const snap = await getDocs(colRef);
      const data = snap.docs.map((d) => d.data() as LandingImage);

      // Populate 5 slots with whatever is in DB or defaults
      const populated: LandingImage[] = Array.from({ length: 5 }, (_, i) => {
        const id = i + 1;
        const found = data?.find((d) => Number(d.id) === id);
        return {
          id,
          url: found ? found.url : DEFAULT_LANDING_IMAGES[i],
        };
      });

      setImages(populated);
    } catch (err: any) {
      console.warn('Could not fetch landing images from Firestore, using fallbacks:', err.message);
      const fallbackList = DEFAULT_LANDING_IMAGES.map((url, i) => ({
        id: i + 1,
        url,
      }));
      setImages(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleReplace = async (slotId: number, file: File) => {
    if (!file) return;

    setUploadingSlot(slotId);
    const toastId = toast.loading(`Uploading image for Slot ${slotId}...`);

    try {
      // 1. Upload to Cloudinary via our Next.js API route
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload server error');
      }

      const { url: cloudinaryUrl } = await res.json();
      if (!cloudinaryUrl) {
        throw new Error('Upload did not return URL');
      }

      // 2. Set doc in Firestore
      await setDoc(doc(db, 'landing_images', String(slotId)), {
        id: slotId,
        url: cloudinaryUrl,
        updated_at: new Date().toISOString(),
      });

      toast.success(`Slot ${slotId} replaced successfully!`, { id: toastId });
      fetchImages();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to replace Slot ${slotId}: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setUploadingSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading landing page configurations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft">
        <h2 className="font-display text-xl font-medium text-foreground">Hero Section Carousel Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Replace the images displayed in the main landing page hero section slideshow. Maximum 5 slots are supported.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-background-2/40 p-4 transition-all hover:border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Slot {img.id}
                </span>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/40 bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Slot ${img.id}`}
                  className="h-full w-full object-cover"
                />

                {uploadingSlot === img.id && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="mt-2 text-xs font-medium text-foreground">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block w-full">
                  <span className="sr-only">Choose image</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlot !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReplace(img.id, file);
                    }}
                    className="hidden"
                    id={`replace-input-${img.id}`}
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2"
                    disabled={uploadingSlot !== null}
                  >
                    <span onClick={() => document.getElementById(`replace-input-${img.id}`)?.click()}>
                      <UploadCloud className="h-4 w-4 text-muted-foreground" />
                      Replace Image
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
