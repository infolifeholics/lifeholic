'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, UploadCloud, Trash2, Video, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_VIDEO = 'https://cdn.prod.website-files.com/691c3d8b8165d353a2345b2d%2F691d841c9c6b35b63efb82bc_hero-bg-video_mp4.mp4';
const DEFAULT_FOUNDER_IMAGE = '/images/founder/photo.jpg';
const DEFAULT_GALLERY = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=700',
];

export function AdminLandingPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [founderImage, setFounderImage] = useState(DEFAULT_FOUNDER_IMAGE);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingFounder, setUploadingFounder] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      // 1. Fetch Video Settings
      const videoDoc = await getDoc(doc(db, 'settings', 'video'));
      if (videoDoc.exists()) {
        setVideoUrl(videoDoc.data().url || '');
      } else {
        setVideoUrl('');
      }

      // 2. Fetch Founder portrait details
      const globalDoc = await getDoc(doc(db, 'cms', 'global'));
      if (globalDoc.exists()) {
        setFounderImage(globalDoc.data().about_image || DEFAULT_FOUNDER_IMAGE);
      }

      // 3. Fetch About Gallery items
      const galleryDoc = await getDoc(doc(db, 'settings', 'about_gallery'));
      if (galleryDoc.exists()) {
        const items = galleryDoc.data().items || [];
        const populated = Array.from({ length: 4 }, (_, i) => {
          return (items[i]?.url || DEFAULT_GALLERY[i]) as string;
        });
        setGallery(populated);
      } else {
        setGallery(DEFAULT_GALLERY);
      }
    } catch (err: any) {
      console.error('Error fetching CMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uploadToCloudinaryDirect = async (file: File, isVideoOrAudio: boolean) => {
    const signRes = await fetch('/api/upload/sign', { method: 'POST' });
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate upload signature');
    }
    const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json();

    const resourceType = isVideoOrAudio ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadRes = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Direct Cloudinary upload failed');
    }

    const data = await uploadRes.json();
    return {
      url: data.secure_url,
      public_id: data.public_id,
    };
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    const toastId = toast.loading('Uploading custom background video...');

    try {
      const { url } = await uploadToCloudinaryDirect(file, true);

      if (videoUrl && videoUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'video'), {
        url,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      setVideoUrl(url);
      toast.success('Background video updated successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoUrl) return;
    const confirm = window.confirm('Are you sure you want to restore the default cinematic video?');
    if (!confirm) return;

    const toastId = toast.loading('Restoring default video...');
    try {
      if (videoUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'video'), {
        url: '',
        updated_at: new Date().toISOString(),
      }, { merge: true });

      setVideoUrl('');
      toast.success('Default video restored.', { id: toastId });
    } catch (err: any) {
      toast.error('Failed: ' + err.message, { id: toastId });
    }
  };

  const handleFounderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFounder(true);
    const toastId = toast.loading('Uploading founder portrait...');

    try {
      const { url } = await uploadToCloudinaryDirect(file, false);

      if (founderImage && founderImage.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: founderImage }),
        });
      }

      await setDoc(doc(db, 'cms', 'global'), {
        about_image: url,
      }, { merge: true });

      setFounderImage(url);
      toast.success('Founder portrait updated!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingFounder(false);
    }
  };

  const handleDeleteFounder = async () => {
    if (founderImage === DEFAULT_FOUNDER_IMAGE) return;
    const confirm = window.confirm('Are you sure you want to restore the default founder portrait?');
    if (!confirm) return;

    const toastId = toast.loading('Restoring default portrait...');
    try {
      if (founderImage.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: founderImage }),
        });
      }

      await setDoc(doc(db, 'cms', 'global'), {
        about_image: '',
      }, { merge: true });

      setFounderImage(DEFAULT_FOUNDER_IMAGE);
      toast.success('Default portrait restored.', { id: toastId });
    } catch (err: any) {
      toast.error('Failed: ' + err.message, { id: toastId });
    }
  };

  const handleGalleryReplace = async (index: number, file: File) => {
    if (!file) return;

    setUploadingGalleryIdx(index);
    const toastId = toast.loading(`Uploading image for Slot ${index + 1}...`);

    try {
      const { url } = await uploadToCloudinaryDirect(file, false);

      const oldUrl = gallery[index];
      if (oldUrl && oldUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldUrl }),
        });
      }

      const updated = [...gallery];
      updated[index] = url;

      const itemsPayload = updated.map((u) => ({ url: u, type: 'image' }));
      await setDoc(doc(db, 'settings', 'about_gallery'), {
        items: itemsPayload,
      });

      setGallery(updated);
      toast.success(`Slot ${index + 1} updated successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingGalleryIdx(null);
    }
  };

  const handleDeleteGalleryItem = async (index: number) => {
    const itemUrl = gallery[index];
    if (itemUrl === DEFAULT_GALLERY[index]) return;

    const confirm = window.confirm(`Are you sure you want to restore the default image for Slot ${index + 1}?`);
    if (!confirm) return;

    const toastId = toast.loading(`Restoring Slot ${index + 1} to default...`);
    try {
      if (itemUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: itemUrl }),
        });
      }

      const updated = [...gallery];
      updated[index] = DEFAULT_GALLERY[index];

      const itemsPayload = updated.map((u) => ({ url: u, type: 'image' }));
      await setDoc(doc(db, 'settings', 'about_gallery'), {
        items: itemsPayload,
      });

      setGallery(updated);
      toast.success(`Slot ${index + 1} restored to default.`, { id: toastId });
    } catch (err: any) {
      toast.error('Failed: ' + err.message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      
      {/* SECTION: Video Settings */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-gold" />
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">Landing Background Video</h2>
              <p className="text-sm text-muted-foreground">Upload a custom video or restore the default cinematic clip.</p>
            </div>
          </div>
          {videoUrl && (
            <button
              onClick={handleDeleteVideo}
              className="p-1.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
              title="Restore default video"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr] items-start">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-card">
            <video
              key={videoUrl || 'default'}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="h-full w-full object-cover"
              src={videoUrl || DEFAULT_VIDEO}
            />
            {uploadingVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <span className="mt-2 text-sm font-medium text-foreground">Uploading video...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground block">Active Video Source</span>
              <p className="text-[11px] text-foreground font-mono mt-1 break-all bg-card/60 p-2 rounded-lg border border-border/20">
                {videoUrl || 'Default Cinematic Clip'}
              </p>
            </div>

            <label className="block w-full">
              <span className="sr-only">Choose video</span>
              <input type="file" accept="video/*" disabled={uploadingVideo} onChange={handleVideoUpload} className="hidden" id="bg-video-input" />
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2 h-11"
                disabled={uploadingVideo}
                onClick={() => document.getElementById('bg-video-input')?.click()}
              >
                <span>
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Replace Video
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION: About Page Main Portrait */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-gold" />
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">About Main Portrait</h2>
              <p className="text-sm text-muted-foreground">Manage the main profile photo shown on the About page.</p>
            </div>
          </div>
          {founderImage !== DEFAULT_FOUNDER_IMAGE && (
            <button
              onClick={handleDeleteFounder}
              className="p-1.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
              title="Restore default portrait"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[1.5fr_2fr] items-start">
          <div className="relative aspect-[3/4] max-w-[240px] w-full overflow-hidden rounded-2xl border border-border/40 bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={founderImage}
              alt="Founder Profile"
              className="h-full w-full object-cover object-top"
            />
            {uploadingFounder && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <span className="mt-2 text-xs font-medium text-foreground">Uploading...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground block">Portrait Source</span>
              <p className="text-[11px] text-foreground font-mono mt-1 break-all bg-card/60 p-2 rounded-lg border border-border/20">
                {founderImage === DEFAULT_FOUNDER_IMAGE ? 'Default Founder Portrait' : founderImage}
              </p>
            </div>

            <label className="block w-full">
              <input type="file" accept="image/*" disabled={uploadingFounder} onChange={handleFounderUpload} className="hidden" id="portrait-input" />
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2 h-11"
                disabled={uploadingFounder}
                onClick={() => document.getElementById('portrait-input')?.click()}
              >
                <span>
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Replace Portrait
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION: About Page Bottom Gallery (4 Slots) */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">About Page Gallery (4 Pictures)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Replace the 4 custom pictures shown at the bottom of the About page.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.map((imgUrl, idx) => {
            const isCustom = imgUrl !== DEFAULT_GALLERY[idx];
            return (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl border border-border/80 bg-background-2/40 p-4 transition-all hover:border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Slot {idx + 1} {isCustom && <span className="text-[10px] text-gold font-bold ml-1">(custom)</span>}
                  </span>
                  {isCustom && (
                    <button
                      onClick={() => handleDeleteGalleryItem(idx)}
                      className="p-1 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
                      title="Restore default image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/40 bg-card flex flex-col items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Gallery Slot ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {uploadingGalleryIdx === idx && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-gold" />
                      <span className="mt-2 text-xs font-medium text-foreground">Uploading...</span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingGalleryIdx !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGalleryReplace(idx, file);
                    }}
                    className="hidden"
                    id={`replace-gallery-${idx}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2 text-xs"
                    disabled={uploadingGalleryIdx !== null}
                    onClick={() => document.getElementById(`replace-gallery-${idx}`)?.click()}
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                    Replace Image
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
