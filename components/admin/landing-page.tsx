'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, UploadCloud, Video, X, Image as ImageIcon, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_VIDEO = 'https://cdn.prod.website-files.com/691c3d8b8165d353a2345b2d%2F691d841c9c6b35b63efb82bc_hero-bg-video_mp4.mp4';
const DEFAULT_AUDIO = '/liecio-calming-rain-257596.mp3';
const DEFAULT_FOUNDER_IMAGE = '/images/founder/photo.jpg';
const DEFAULT_FOUNDER_IMAGE_2 = 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_BG_IMAGE = 'https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200';

export function AdminLandingPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [founderImage, setFounderImage] = useState(DEFAULT_FOUNDER_IMAGE);
  const [founderImage2, setFounderImage2] = useState(DEFAULT_FOUNDER_IMAGE_2);
  const [bgImage, setBgImage] = useState(DEFAULT_BG_IMAGE);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingFounder, setUploadingFounder] = useState(false);
  const [uploadingFounder2, setUploadingFounder2] = useState(false);
  const [uploadingBgImage, setUploadingBgImage] = useState(false);
  const [uploadingFeed, setUploadingFeed] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      // 1. Fetch Video Settings
      const videoDoc = await getDoc(doc(db, 'settings', 'video'));
      if (videoDoc.exists()) {
        setVideoUrl(videoDoc.data().url || '');
      } else {
        setVideoUrl('');
      }

      // Fetch Audio Settings
      const audioDoc = await getDoc(doc(db, 'settings', 'music'));
      if (audioDoc.exists()) {
        setAudioUrl(audioDoc.data().url || '');
      } else {
        setAudioUrl('');
      }

      // 2. Fetch Founder portrait details
      const globalDoc = await getDoc(doc(db, 'cms', 'global'));
      if (globalDoc.exists()) {
        setFounderImage(globalDoc.data().about_image || DEFAULT_FOUNDER_IMAGE);
        setFounderImage2(globalDoc.data().about_image_2 || DEFAULT_FOUNDER_IMAGE_2);
        setBgImage(globalDoc.data().background_image || DEFAULT_BG_IMAGE);
      }

      // 3. Fetch Somatic Feed slots
      const feedDocs = await getDocs(collection(db, 'landing_feed'));
      const feedData = feedDocs.docs.map(doc => doc.data());
      const defaultPosts = [
        'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=500',
      ];
      const items = Array.from({ length: 4 }, (_, i) => {
        const id = `slot_${i + 1}`;
        const found = feedData?.find((d) => d.id === id);
        return {
          id,
          url: (found && found.url) ? found.url : defaultPosts[i],
          type: found ? found.type : 'image',
          likes: (found && typeof found.likes === 'number') ? found.likes : 0,
          link: found ? found.link : '',
        };
      });
      setFeedItems(items);
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
    const confirm = await (window as any).customConfirm('Are you sure you want to restore the default cinematic video?');
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    const toastId = toast.loading('Uploading custom background audio...');

    try {
      const { url } = await uploadToCloudinaryDirect(file, true);

      if (audioUrl && audioUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: audioUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'music'), {
        url,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      setAudioUrl(url);
      toast.success('Background audio updated successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDeleteAudio = async () => {
    if (!audioUrl) return;
    const confirm = await (window as any).customConfirm('Are you sure you want to restore the default calming audio?');
    if (!confirm) return;

    const toastId = toast.loading('Restoring default audio...');
    try {
      if (audioUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: audioUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'music'), {
        url: '',
        updated_at: new Date().toISOString(),
      }, { merge: true });

      setAudioUrl('');
      toast.success('Default audio restored.', { id: toastId });
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
    const confirm = await (window as any).customConfirm('Are you sure you want to restore the default founder portrait?');
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

  const handleFounder2Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFounder2(true);
    const toastId = toast.loading('Uploading story secondary image...');

    try {
      const { url } = await uploadToCloudinaryDirect(file, false);

      if (founderImage2 && founderImage2.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: founderImage2 }),
        });
      }

      await setDoc(doc(db, 'cms', 'global'), {
        about_image_2: url,
      }, { merge: true });

      setFounderImage2(url);
      toast.success('Story secondary image updated!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingFounder2(false);
    }
  };

  const handleDeleteFounder2 = async () => {
    if (founderImage2 === DEFAULT_FOUNDER_IMAGE_2) return;
    const confirm = await (window as any).customConfirm('Are you sure you want to restore the default story secondary image?');
    if (!confirm) return;

    const toastId = toast.loading('Restoring default image...');
    try {
      if (founderImage2.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: founderImage2 }),
        });
      }

      await setDoc(doc(db, 'cms', 'global'), {
        about_image_2: '',
      }, { merge: true });

      setFounderImage2(DEFAULT_FOUNDER_IMAGE_2);
      toast.success('Default image restored.', { id: toastId });
    } catch (err: any) {
      toast.error('Failed: ' + err.message, { id: toastId });
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBgImage(true);
    const toastId = toast.loading('Uploading global background image...');

    try {
      const { url } = await uploadToCloudinaryDirect(file, false);

      if (bgImage && bgImage.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: bgImage }),
        });
      }

      await setDoc(doc(db, 'cms', 'global'), {
        background_image: url,
      }, { merge: true });

      setBgImage(url);
      toast.success('Global background image updated!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingBgImage(false);
    }
  };

  const handleDeleteBgImage = async () => {
    if (bgImage === DEFAULT_BG_IMAGE) return;
    const confirm = await (window as any).customConfirm('Are you sure you want to restore the default background image?');
    if (!confirm) return;

    const toastId = toast.loading('Restoring default background image...');
    try {
      if (bgImage.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: bgImage }),
        });
      }

      await setDoc(doc(db, 'cms', 'global'), {
        background_image: '',
      }, { merge: true });

      setBgImage(DEFAULT_BG_IMAGE);
      toast.success('Default background image restored.', { id: toastId });
    } catch (err: any) {
      toast.error('Failed: ' + err.message, { id: toastId });
    }
  };
 
  const handleFeedUpload = async (slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const typeLabel = isVideo ? 'video' : 'image';

    setUploadingFeed(prev => ({ ...prev, [slotId]: true }));
    const toastId = toast.loading(`Uploading ${typeLabel} to ${slotId.replace('_', ' ')}...`);

    try {
      const { url } = await uploadToCloudinaryDirect(file, isVideo);
      const cacheBustedUrl = `${url}?v=${Date.now()}`;

      const slotDoc = await getDoc(doc(db, 'landing_feed', slotId));
      const existingLikes = slotDoc.exists() ? (slotDoc.data().likes || 0) : 0;

      await setDoc(doc(db, 'landing_feed', slotId), {
        id: slotId,
        url: cacheBustedUrl,
        type: typeLabel,
        likes: existingLikes,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      setFeedItems(prev => prev.map(item => item.id === slotId ? { ...item, url: cacheBustedUrl, type: typeLabel } : item));
      toast.success(`${typeLabel} uploaded successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingFeed(prev => ({ ...prev, [slotId]: false }));
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

      {/* SECTION: Audio Settings */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <Music className="h-6 w-6 text-gold" />
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">Landing Background Audio</h2>
              <p className="text-sm text-muted-foreground">Upload a custom audio or restore the default calming track.</p>
            </div>
          </div>
          {audioUrl && (
            <button
              onClick={handleDeleteAudio}
              className="p-1.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
              title="Restore default audio"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr] items-start">
          <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl border border-border/40 bg-card/60">
            <audio
              key={audioUrl || 'default'}
              controls
              className="w-full max-w-md mx-auto"
              src={audioUrl || DEFAULT_AUDIO}
            />
            {uploadingAudio && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <span className="mt-2 text-sm font-medium text-foreground">Uploading audio...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground block">Active Audio Source</span>
              <p className="text-[11px] text-foreground font-mono mt-1 break-all bg-card/60 p-2 rounded-lg border border-border/20">
                {audioUrl || 'Default Calming Track'}
              </p>
            </div>

            <label className="block w-full">
              <span className="sr-only">Choose audio</span>
              <input type="file" accept="audio/*" disabled={uploadingAudio} onChange={handleAudioUpload} className="hidden" id="bg-audio-input" />
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2 h-11"
                disabled={uploadingAudio}
                onClick={() => document.getElementById('bg-audio-input')?.click()}
              >
                <span>
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Replace Audio
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION: About Page Story Images */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">About Page Story Pictures</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the two main pictures shown on the About/Story page in real-time.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Image 1: Main Portrait */}
          <div className="p-4 rounded-2xl border border-border/40 bg-secondary/10 space-y-4">
            <div className="flex items-center justify-between border-b border-border/20 pb-2">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-gold" /> 1. Main Portrait (Top)
              </span>
              {founderImage !== DEFAULT_FOUNDER_IMAGE && (
                <button
                  onClick={handleDeleteFounder}
                  className="p-1 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
                  title="Restore default portrait"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-xl border border-border/40 bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founderImage}
                  alt="Founder Profile"
                  className="h-full w-full object-cover object-top animate-fade-in"
                />
                {uploadingFounder && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground">This is the main profile photo shown first on the About page.</p>
                <label className="block w-full">
                  <input type="file" accept="image/*" disabled={uploadingFounder} onChange={handleFounderUpload} className="hidden" id="portrait-input-1" />
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-full cursor-pointer flex items-center justify-center gap-1.5 h-9 text-xs"
                    disabled={uploadingFounder}
                    onClick={() => document.getElementById('portrait-input-1')?.click()}
                  >
                    <span>
                      <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                      Replace Image 1
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>

          {/* Image 2: Secondary Image */}
          <div className="p-4 rounded-2xl border border-border/40 bg-secondary/10 space-y-4">
            <div className="flex items-center justify-between border-b border-border/20 pb-2">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-gold" /> 2. Secondary Image (Bottom)
              </span>
              {founderImage2 !== DEFAULT_FOUNDER_IMAGE_2 && (
                <button
                  onClick={handleDeleteFounder2}
                  className="p-1 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
                  title="Restore default image"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-xl border border-border/40 bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founderImage2}
                  alt="Story Image 2"
                  className="h-full w-full object-cover animate-fade-in"
                />
                {uploadingFounder2 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground">This is the session or space photo shown second on the About page.</p>
                <label className="block w-full">
                  <input type="file" accept="image/*" disabled={uploadingFounder2} onChange={handleFounder2Upload} className="hidden" id="portrait-input-2" />
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-full cursor-pointer flex items-center justify-center gap-1.5 h-9 text-xs"
                    disabled={uploadingFounder2}
                    onClick={() => document.getElementById('portrait-input-2')?.click()}
                  >
                    <span>
                      <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                      Replace Image 2
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Global Fallback Background Image */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-gold" />
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">Global Background Image</h2>
              <p className="text-sm text-muted-foreground">Manage the background image shown on pages other than Home and Our Story.</p>
            </div>
          </div>
          {bgImage !== DEFAULT_BG_IMAGE && (
            <button
              onClick={handleDeleteBgImage}
              className="p-1.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
              title="Restore default background image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[1.5fr_2fr] items-start">
          <div className="relative aspect-[16/9] max-w-[320px] w-full overflow-hidden rounded-2xl border border-border/40 bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgImage}
              alt="Global Background"
              className="h-full w-full object-cover rounded-xl"
            />
            {uploadingBgImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <span className="mt-2 text-xs font-medium text-foreground">Uploading...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground block">Background Source</span>
              <p className="text-[11px] text-foreground font-mono mt-1 break-all bg-card/60 p-2 rounded-lg border border-border/20">
                {bgImage === DEFAULT_BG_IMAGE ? 'Default Background' : bgImage}
              </p>
            </div>

            <label className="block w-full">
              <input type="file" accept="image/*" disabled={uploadingBgImage} onChange={handleBgImageUpload} className="hidden" id="bg-image-input" />
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2 h-11"
                disabled={uploadingBgImage}
                onClick={() => document.getElementById('bg-image-input')?.click()}
              >
                <span>
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Replace Background Image
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION: Somatic Feed Assets ("A little quiet on your feed") */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-6">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">Somatic Feed Assets ("A little quiet on your feed")</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the four media slots displayed in the Instagram section on the landing page. Each slot supports either an image or a video.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {feedItems.map((item, idx) => (
            <SomaticFeedItemEditor
              key={item.id}
              item={item}
              idx={idx}
              uploadingFeed={uploadingFeed}
              handleFeedUpload={handleFeedUpload}
              setFeedItems={setFeedItems}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

interface SomaticFeedItemEditorProps {
  item: any;
  idx: number;
  uploadingFeed: Record<string, boolean>;
  handleFeedUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  setFeedItems: React.Dispatch<React.SetStateAction<any[]>>;
}

function SomaticFeedItemEditor({
  item,
  idx,
  uploadingFeed,
  handleFeedUpload,
  setFeedItems,
}: SomaticFeedItemEditorProps) {
  const [localLink, setLocalLink] = useState(item.link || '');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    setLocalLink(item.link || '');
  }, [item.link]);

  const handleSaveLink = async () => {
    setSavingLink(true);
    const toastId = toast.loading('Saving explore link...');
    try {
      await setDoc(doc(db, 'landing_feed', item.id), {
        link: localLink.trim()
      }, { merge: true });
      toast.success('Explore link saved successfully!', { id: toastId });
      setFeedItems(prev => prev.map(f => f.id === item.id ? { ...f, link: localLink.trim() } : f));
    } catch (err: any) {
      toast.error('Failed to save link: ' + err.message, { id: toastId });
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-border/40 bg-secondary/10 space-y-4 flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-border/20 pb-2">
        <span className="text-sm font-semibold text-foreground">
          Slot {idx + 1} ({item.type === 'video' ? 'Video' : 'Image'})
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/40 bg-card">
          {item.type === 'video' ? (
            <video
              src={item.url}
              muted
              loop
              playsInline
              autoPlay
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={item.url}
              alt={`Slot ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          )}
          {uploadingFeed[item.id] && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block w-full">
            <input
              type="file"
              accept="image/*,video/*"
              disabled={uploadingFeed[item.id]}
              onChange={(e) => handleFeedUpload(item.id, e)}
              className="hidden"
              id={`feed-input-${item.id}`}
            />
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full cursor-pointer flex items-center justify-center gap-1.5 h-9 text-xs"
              disabled={uploadingFeed[item.id]}
              onClick={() => document.getElementById(`feed-input-${item.id}`)?.click()}
            >
              <span>
                <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                Replace Slot {idx + 1}
              </span>
            </Button>
          </label>
        </div>

        <div className="space-y-2 border-t border-border/20 pt-3">
          <label className="block text-xs font-semibold text-muted-foreground">Explore Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="/workshops/example"
              value={localLink}
              onChange={(e) => setLocalLink(e.target.value)}
              className="flex-1 rounded-xl bg-card border border-border/40 text-xs px-3 py-1.5 focus:ring-1 focus:ring-gold"
            />
            <Button
              onClick={handleSaveLink}
              disabled={savingLink}
              size="sm"
              className="rounded-xl px-3 bg-gold text-black font-semibold text-xs h-8"
            >
              {savingLink ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
