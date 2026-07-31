'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, UploadCloud, Trash2, Video, X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_LANDING_IMAGES = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3182452/pexels-photo-3182452.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/409127/pexels-photo-409127.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/290518/pexels-photo-290518.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

const DEFAULT_VIDEO = 'https://cdn.prod.website-files.com/691c3d8b8165d353a2345b2d%2F691d841c9c6b35b63efb82bc_hero-bg-video_mp4.mp4';

interface LandingImage {
  id: number;
  url: string;
  isCustom?: boolean;
}

export function AdminLandingPage() {
  const [images, setImages] = useState<LandingImage[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [uploadingFeedSlot, setUploadingFeedSlot] = useState<string | null>(null);

  const fetchLandingData = async () => {
    try {
      // 1. Fetch Carousel Images
      const colRef = collection(db, 'landing_images');
      const snap = await getDocs(colRef);
      const data = snap.docs.map((d) => d.data());

      const populated: LandingImage[] = Array.from({ length: 5 }, (_, i) => {
        const id = i + 1;
        const found = data?.find((d) => Number(d.id) === id);
        return {
          id,
          url: found ? found.url : '',
          isCustom: !!found,
        };
      });
      setImages(populated);

      // 2. Fetch Video Settings
      const videoDoc = await getDoc(doc(db, 'settings', 'video'));
      if (videoDoc.exists()) {
        setVideoUrl(videoDoc.data().url || '');
      } else {
        setVideoUrl('');
      }

      // 3. Fetch Music Settings
      const musicDoc = await getDoc(doc(db, 'settings', 'music'));
      if (musicDoc.exists()) {
        setMusicUrl(musicDoc.data().url || '');
      } else {
        setMusicUrl('');
      }

      // 4. Fetch Landing Feed Items
      const feedSnap = await getDocs(collection(db, 'landing_feed'));
      const feedData = feedSnap.docs.map((d) => d.data());
      const defaultPosts = [
        'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=500',
        'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=500',
      ];
      const populatedFeed = Array.from({ length: 4 }, (_, i) => {
        const id = `slot_${i + 1}`;
        const found = feedData?.find((d) => d.id === id);
        return {
          id,
          url: (found && found.url) ? found.url : defaultPosts[i],
          type: found ? found.type : 'image',
          public_id: found ? found.public_id : '',
          isCustom: !!(found && found.url),
          likes: found ? found.likes || 0 : 0
        };
      });
      setFeedItems(populatedFeed);
    } catch (err: any) {
      console.warn('Could not fetch data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingData();
  }, []);

  const handleReplaceFeed = async (slotId: string, file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
    const isVideo = file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext || '');

    if (!isImage && !isVideo) {
      toast.error('Unsupported file type. Please upload a JPG, PNG, WEBP image or MP4, MOV, WEBM video.');
      return;
    }

    setUploadingFeedSlot(slotId);
    const toastId = toast.loading(`Uploading media for Landing Feed ${slotId}...`);

    try {
      const isVideoFile = isVideo;
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload server error');

      const { url: cloudinaryUrl, public_id: cloudinaryPublicId } = await res.json();
      if (!cloudinaryUrl) throw new Error('Upload did not return URL');

      // Delete old custom file if it exists
      const currentItem = feedItems.find(item => item.id === slotId);
      if (currentItem?.isCustom && currentItem.url.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: currentItem.url }),
        });
      }

      await setDoc(doc(db, 'landing_feed', slotId), {
        id: slotId,
        url: cloudinaryUrl,
        public_id: cloudinaryPublicId || '',
        type: isVideoFile ? 'video' : 'image',
        likes: currentItem ? currentItem.likes || 0 : 0,
        updated_at: new Date().toISOString(),
      });

      toast.success(`Landing Feed ${slotId} replaced successfully!`, { id: toastId });
      fetchLandingData();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`, { id: toastId });
    } finally {
      setUploadingFeedSlot(null);
    }
  };

  const handleReplace = async (slotId: number, file: File) => {
    if (!file) return;

    setUploadingSlot(slotId);
    const toastId = toast.loading(`Uploading image for Slot ${slotId}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload server error');

      const { url: cloudinaryUrl } = await res.json();
      if (!cloudinaryUrl) throw new Error('Upload did not return URL');

      // Delete old custom file if it exists
      const currentImage = images.find(img => img.id === slotId);
      if (currentImage?.isCustom && currentImage.url.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: currentImage.url }),
        });
      }

      await setDoc(doc(db, 'landing_images', String(slotId)), {
        id: slotId,
        url: cloudinaryUrl,
        updated_at: new Date().toISOString(),
      });

      toast.success(`Slot ${slotId} replaced successfully!`, { id: toastId });
      fetchLandingData();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`, { id: toastId });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleDeleteImage = async (slotId: number, imageUrl: string) => {
    if (!imageUrl) {
      toast.info(`Slot ${slotId} is already empty.`);
      return;
    }

    const confirm = window.confirm(`Are you sure you want to permanently delete Slot ${slotId} image from Cloudinary?`);
    if (!confirm) return;

    const toastId = toast.loading(`Deleting image ${slotId} from Cloudinary...`);
    try {
      // 1. Delete from Cloudinary permanently
      if (imageUrl.includes('cloudinary.com')) {
        const delRes = await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: imageUrl }),
        });
        if (!delRes.ok) throw new Error('Failed to delete from Cloudinary.');
      }

      // 2. Remove document from Firestore
      await deleteDoc(doc(db, 'landing_images', String(slotId)));

      toast.success(`Slot ${slotId} custom image permanently deleted.`, { id: toastId });
      fetchLandingData();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed.', { id: toastId });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    const toastId = toast.loading('Uploading background video...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Video upload failed.');
      const data = await res.json();

      // Delete old video from Cloudinary if exists
      if (videoUrl && videoUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'video'), {
        url: data.url,
        updated_at: new Date().toISOString(),
      });

      setVideoUrl(data.url);
      toast.success('Background video uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Video upload failed.', { id: toastId });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    const confirm = window.confirm('Are you sure you want to permanently delete custom background video? It will fallback to default video.');
    if (!confirm) return;

    const toastId = toast.loading('Deleting video...');
    try {
      if (videoUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'video'), { url: '' });
      setVideoUrl('');
      toast.success('Custom video deleted. Restored default video.', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete video.', { id: toastId });
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMusic(true);
    const toastId = toast.loading('Uploading background music...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Music upload failed.');
      const data = await res.json();

      // Delete old music from Cloudinary if exists
      if (musicUrl && musicUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: musicUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'music'), {
        url: data.url,
        updated_at: new Date().toISOString(),
      });

      setMusicUrl(data.url);
      toast.success('Background music uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Music upload failed.', { id: toastId });
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleDeleteMusic = async () => {
    const confirm = window.confirm('Are you sure you want to permanently delete custom background music? It will fallback to default ambient sound.');
    if (!confirm) return;

    const toastId = toast.loading('Deleting music...');
    try {
      if (musicUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: musicUrl }),
        });
      }

      await setDoc(doc(db, 'settings', 'music'), { url: '' });
      setMusicUrl('');
      toast.success('Custom music deleted. Restored default ambient sound.', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete music.', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading landing configurations...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION: Video Configuration */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">Landing Background Video</h2>
              <p className="text-sm text-muted-foreground">Upload a custom video or restore the default cinematic clip.</p>
            </div>
          </div>
          {videoUrl && (
            <button
              onClick={handleDeleteVideo}
              className="p-1.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all animate-fade-in"
              title="Delete custom video and restore default"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Video Preview Block */}
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-2 text-sm font-medium text-foreground">Uploading video...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground block">Active Video Source</span>
              <p className="text-xs text-foreground font-mono mt-1 break-all bg-card/60 p-2 rounded-lg border border-border/20">
                {videoUrl || 'Default Cinematic Clip'}
              </p>
            </div>

            <label className="block w-full">
              <span className="sr-only">Choose video</span>
              <input type="file" accept="video/*" disabled={uploadingVideo} onChange={handleVideoUpload} className="hidden" />
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2"
                disabled={uploadingVideo}
              >
                <span>
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Upload Custom Video
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION: Music Configuration */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">Landing Background Music</h2>
              <p className="text-sm text-muted-foreground">Upload a custom music track or restore the default ambient sounds.</p>
            </div>
          </div>
          {musicUrl && (
            <button
              onClick={handleDeleteMusic}
              className="p-1.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all animate-fade-in"
              title="Delete custom music and restore default"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr] items-start">
          <div className="relative p-6 flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-background-2/40 aspect-[3/1] md:aspect-auto">
            {musicUrl ? (
              <audio
                key={musicUrl}
                controls
                className="w-full max-w-md my-4"
                src={musicUrl}
              />
            ) : (
              <div className="text-center p-4 my-2">
                <p className="text-sm font-semibold text-muted-foreground">Synthesized Ambient Soundtrack Active</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Gently modulated wind generator + singing bowl chimes.</p>
              </div>
            )}
            {uploadingMusic && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-2 text-sm font-medium text-foreground">Uploading music...</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground block">Active Music Source</span>
              <p className="text-xs text-foreground font-mono mt-1 break-all bg-card/60 p-2 rounded-lg border border-border/20">
                {musicUrl || 'Default Synthesized Ambient Sound'}
              </p>
            </div>

            <label className="block w-full">
              <span className="sr-only">Choose music file</span>
              <input type="file" accept="audio/*" disabled={uploadingMusic} onChange={handleMusicUpload} className="hidden" />
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2"
                disabled={uploadingMusic}
              >
                <span>
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Upload Custom Music
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION: Carousel Images */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft">
        <h2 className="font-display text-xl font-medium text-foreground">Hero Section Carousel Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Replace or delete custom images in the main slideshow. Deleting restores default presets.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-background-2/40 p-4 transition-all hover:border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Slot {img.id} {img.isCustom && <span className="text-[10px] text-primary capitalize ml-1">(custom)</span>}
                </span>
                <button
                  onClick={() => handleDeleteImage(img.id, img.url)}
                  className="p-1 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
                  title="Reset to default image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/40 bg-card flex flex-col items-center justify-center">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={`Slot ${img.id}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                    <span className="text-xs text-muted-foreground font-medium block">Empty Slot</span>
                  </div>
                )}

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

      {/* SECTION: Landing Feed (Instagram style) */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft">
        <h2 className="font-display text-xl font-medium text-foreground">"A Little Quiet On Your Feed" Section Media</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Replace or update the 4 active landing page feed items. Supports both high-resolution Images and Portrait/Landscape Videos.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {feedItems.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-background-2/40 p-4 transition-all hover:border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Slot {item.id.replace('slot_', '')} {item.isCustom ? <span className="text-[10px] text-primary capitalize ml-1">(custom)</span> : <span className="text-[10px] text-muted-foreground/60 ml-1">(default)</span>}
                </span>
                <span className="text-[10px] font-mono bg-secondary/80 px-2 py-0.5 rounded-full border border-border/30 capitalize text-foreground/80">
                  {item.type}
                </span>
              </div>

              <div className="relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-card flex flex-col items-center justify-center">
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={`Feed ${item.id}`}
                    className="h-full w-full object-cover"
                  />
                )}

                {uploadingFeedSlot === item.id && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="mt-2 text-xs font-medium text-foreground">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  disabled={uploadingFeedSlot !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReplaceFeed(item.id, file);
                  }}
                  className="hidden"
                  id={`replace-feed-input-${item.id}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full cursor-pointer flex items-center justify-center gap-2"
                  disabled={uploadingFeedSlot !== null}
                  onClick={() => document.getElementById(`replace-feed-input-${item.id}`)?.click()}
                >
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Replace Media
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
