'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Save, Image as ImageIcon, Trash2, Upload, Video, Play, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type GalleryItem = {
  url: string;
  type: 'image' | 'video';
};

const DEFAULT_FOUNDER_IMAGE = '/images/founder/photo.jpg';

const DEFAULT_GALLERY: GalleryItem[] = [
  { url: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3759106/pexels-photo-3759106.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
  { url: 'https://images.pexels.com/photos/3822908/pexels-photo-3822908.jpeg?auto=compress&cs=tinysrgb&w=700', type: 'image' },
];

export function AdminAboutCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFounder, setUploadingFounder] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const [founderImage, setFounderImage] = useState(DEFAULT_FOUNDER_IMAGE);
  const [aboutText, setAboutText] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>(DEFAULT_GALLERY);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch founder details
        const cmsSnap = await getDoc(doc(db, 'cms', 'global'));
        if (cmsSnap.exists()) {
          const cmsData = cmsSnap.data();
          if (cmsData.about_image) setFounderImage(cmsData.about_image);
          if (cmsData.about_text) setAboutText(cmsData.about_text);
        }

        // Fetch gallery details
        const gallerySnap = await getDoc(doc(db, 'settings', 'about_gallery'));
        if (gallerySnap.exists()) {
          const galleryData = gallerySnap.data();
          if (galleryData.items && Array.isArray(galleryData.items)) {
            setGallery(galleryData.items);
          }
        }
      } catch (err) {
        console.error('Error fetching About CMS data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFounderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFounder(true);
    const toastId = toast.loading('Uploading founder portrait...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();

      // Delete old from Cloudinary
      if (founderImage && founderImage.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: founderImage }),
        });
      }

      setFounderImage(url);
      toast.success('Founder image updated!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingFounder(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    const toastId = toast.loading(`Uploading media for slot ${index + 1}...`);

    try {
      const isVideoFile = file.type.startsWith('video/');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();

      const oldUrl = gallery[index]?.url;
      // Delete old from Cloudinary
      if (oldUrl && oldUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldUrl }),
        });
      }

      const updated = [...gallery];
      updated[index] = {
        url,
        type: isVideoFile ? 'video' : 'image'
      };
      setGallery(updated);
      toast.success('Gallery slot updated!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleResetFounder = async () => {
    if (founderImage && founderImage.includes('cloudinary.com')) {
      const toastId = toast.loading('Deleting portrait...');
      await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: founderImage }),
      });
      toast.success('Portrait removed.', { id: toastId });
    }
    setFounderImage(DEFAULT_FOUNDER_IMAGE);
  };

  const handleResetGalleryItem = async (index: number) => {
    const itemUrl = gallery[index]?.url;
    if (itemUrl && itemUrl.includes('cloudinary.com')) {
      const toastId = toast.loading(`Removing media from slot ${index + 1}...`);
      await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: itemUrl }),
      });
      toast.success('Media removed.', { id: toastId });
    }
    const updated = [...gallery];
    updated[index] = DEFAULT_GALLERY[index];
    setGallery(updated);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving About Page changes...');

    try {
      // Save copy and portrait
      await setDoc(doc(db, 'cms', 'global'), {
        about_image: founderImage,
        about_text: aboutText
      }, { merge: true });

      // Save gallery items
      await setDoc(doc(db, 'settings', 'about_gallery'), {
        items: gallery
      });

      toast.success('About page CMS successfully saved!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save content: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSaveAll} className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
      <div className="flex justify-between items-center pb-3 border-b border-border/40">
        <div>
          <h3 className="font-display text-lg font-medium text-foreground">About Page CMS</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage founder profile, copy, and bottom media gallery.</p>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 px-6">
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Founder profile copy & portrait */}
        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
            <FileText className="h-4 w-4 text-gold" /> Profile Copy &amp; Portrait
          </h4>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Portrait Upload */}
            <div className="space-y-2">
              <Label>Founder Portrait Photo</Label>
              <div className="relative w-32 h-44 rounded-2xl overflow-hidden border border-border/60 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founderImage}
                  alt="Founder profile"
                  className="w-full h-full object-cover object-top animate-fade-in"
                />
                {founderImage === DEFAULT_FOUNDER_IMAGE && (
                  <span className="absolute bottom-2 left-2 bg-background/80 text-[8px] font-bold px-1 py-0.5 rounded border border-border/30">
                    DEFAULT
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingFounder}
                  className="rounded-full text-xs h-8 relative overflow-hidden flex-1"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFounderUpload}
                    disabled={uploadingFounder}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
                {founderImage !== DEFAULT_FOUNDER_IMAGE && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFounder}
                    className="rounded-full text-xs h-8 hover:bg-rose-500/10 hover:text-rose-600 border border-transparent hover:border-rose-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Copy Text */}
            <div className="flex-1 space-y-2">
              <Label>About Biography Text</Label>
              <Textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="I am a spiritual psychologist..."
                className="rounded-xl min-h-[160px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Gallery Slots Management */}
        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
            <ImageIcon className="h-4 w-4 text-gold" /> Bottom Media Gallery (Max 6 Items)
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure the 6 media slots at the bottom of the About page. You can upload images or videos. Defaults are restored if slots are reset.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {gallery.map((item, idx) => (
              <div key={idx} className="space-y-2 flex flex-col">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border/60 bg-muted flex items-center justify-center">
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white animate-pulse" />
                      </div>
                      <span className="absolute top-2 left-2 bg-purple-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
                        <Video className="h-2 w-2" /> VIDEO
                      </span>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={`Gallery slot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {DEFAULT_GALLERY[idx].url === item.url && (
                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingIndex !== null}
                    className="rounded-full text-xs h-7 relative overflow-hidden flex-1 p-0"
                  >
                    {uploadingIndex === idx ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 mr-1" />
                    )}
                    <span>Replace</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleGalleryUpload(e, idx)}
                      disabled={uploadingIndex !== null}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>

                  {DEFAULT_GALLERY[idx].url !== item.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetGalleryItem(idx)}
                      className="rounded-full text-xs h-7 hover:bg-rose-500/10 hover:text-rose-600 border border-transparent hover:border-rose-500/20 p-1.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
