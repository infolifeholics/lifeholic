'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Save, FileText, HelpCircle, PhoneCall, Info, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CMSSection = {
  id: string;
  quote?: string;
  hero_title?: string;
  hero_subtitle?: string;
  about_text?: string;
  terms_text?: string;
  contact_phone?: string;
  contact_email?: string;
  footer_text?: string;
  about_image?: string;
  about_image_2?: string;
  background_image?: string;
};

export function AdminCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImage2, setUploadingImage2] = useState(false);
  const [uploadingImageBg, setUploadingImageBg] = useState(false);
  const [data, setData] = useState<CMSSection>({
    id: 'global',
    quote: 'Your quote here...',
    hero_title: 'Somatic Healing & Inner Transformation',
    hero_subtitle: 'A space for deep emotional release, integration, and conscious becoming.',
    about_text: 'Spiritual psychology and holistic healing.',
    terms_text: 'Terms and conditions...',
    contact_phone: '+91 98765 43210',
    contact_email: 'info@thelifeholics.com',
    footer_text: '© 2026 TheLifeHolics. All rights reserved.',
    about_image: '',
    about_image_2: '',
    background_image: '',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'about_image' | 'about_image_2' | 'background_image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'about_image') setUploadingImage(true);
    else if (field === 'about_image_2') setUploadingImage2(true);
    else setUploadingImageBg(true);
    
    const toastId = toast.loading('Uploading image to Cloudinary...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const result = await res.json();
      const newUrl = result.url;

      if (!newUrl) throw new Error('No URL returned');

      // Delete old image if it was uploaded to Cloudinary
      const oldUrl = data[field];
      if (oldUrl && oldUrl.includes('cloudinary.com')) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldUrl }),
        });
      }

      setData(prev => ({ ...prev, [field]: newUrl }));
      toast.success('Image uploaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload image: ' + err.message, { id: toastId });
    } finally {
      if (field === 'about_image') setUploadingImage(false);
      else if (field === 'about_image_2') setUploadingImage2(false);
      else setUploadingImageBg(false);
    }
  };

  const handleResetImage = async (field: 'about_image' | 'about_image_2' | 'background_image') => {
    const oldUrl = data[field];
    if (oldUrl && oldUrl.includes('cloudinary.com')) {
      const toastId = toast.loading('Deleting custom image from Cloudinary...');
      try {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldUrl }),
        });
        toast.success('Image deleted from Cloudinary.', { id: toastId });
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete image from Cloudinary.', { id: toastId });
      }
    }
    setData(prev => ({ ...prev, [field]: '' }));
  };

  const fetchCMS = async () => {
    try {
      const snap = await getDocs(collection(db, 'cms'));
      const globalDoc = snap.docs.find((d) => d.id === 'global');
      if (globalDoc) {
        setData({ id: 'global', ...globalDoc.data() } as CMSSection);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCMS();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving CMS content...');
    try {
      await setDoc(doc(db, 'cms', 'global'), data, { merge: true });
      toast.success('CMS content saved successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save CMS: ' + err.message, { id: toastId });
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
    <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
      <div className="flex justify-between items-center pb-3 border-b border-border/40">
        <div>
          <h3 className="font-display text-lg font-medium text-foreground">Content Management System (CMS)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Edit copy and contact details visible across the website dynamically.</p>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 px-6">
          <Save className="h-4 w-4" /> Save Content
        </Button>
      </div>

      <div className="space-y-4">
        {/* Hero Copy */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4 text-gold" /> Hero Copy & Global Background
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Hero Main Title</Label>
              <Input
                value={data.hero_title || ''}
                onChange={(e) => setData({ ...data, hero_title: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Hero Subtitle</Label>
              <Input
                value={data.hero_subtitle || ''}
                onChange={(e) => setData({ ...data, hero_subtitle: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/20 space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-gold" /> Global Fallback Background Image
            </Label>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative w-32 h-20 rounded-xl overflow-hidden border border-border/60 bg-muted">
                {data.background_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.background_image}
                    alt="Background fallback"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="https://res.cloudinary.com/jue23qpn/image/upload/v1786025367/thelifeholics/awrke3peqgig991aiual.png"
                    alt="Default fallback background"
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
                {!data.background_image && (
                  <span className="absolute bottom-1 left-1 bg-background/80 text-[8px] font-bold px-1 py-0.5 rounded border border-border/30">
                    DEFAULT
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <p className="text-xs text-muted-foreground">
                  Upload a background image to show on all pages except the Home page and Our Story page (which will continue to show the background video).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingImageBg}
                    className="rounded-full gap-1.5 px-4 text-xs h-9 relative overflow-hidden"
                  >
                    {uploadingImageBg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>{data.background_image ? 'Replace Image' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'background_image')}
                      disabled={uploadingImageBg}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>

                  {data.background_image && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleResetImage('background_image')}
                      className="rounded-full gap-1.5 px-4 text-xs h-9 hover:bg-rose-500/10 hover:text-rose-600 border border-transparent hover:border-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Reset to Default</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quotes & About */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-gold" /> Page Copy (Quote & About)
          </h4>
          <div>
            <Label>Daily Quote Banner</Label>
            <Textarea
              value={data.quote || ''}
              onChange={(e) => setData({ ...data, quote: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[60px]"
            />
          </div>
          <div>
            <Label>About Us Copy</Label>
            <Textarea
              value={data.about_text || ''}
              onChange={(e) => setData({ ...data, about_text: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[100px]"
            />
          </div>
          <div className="pt-2 border-t border-border/20 space-y-6">
            {/* Image 1: Founder Portrait */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-gold" /> About Section Founder Image
              </Label>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-border/60 bg-muted">
                  {data.about_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.about_image}
                      alt="Founder portrait"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/images/founder/photo.jpg"
                      alt="Default founder portrait"
                      className="w-full h-full object-cover object-top opacity-60"
                    />
                  )}
                  {!data.about_image && (
                    <span className="absolute bottom-1 left-1 bg-background/80 text-[8px] font-bold px-1 py-0.5 rounded border border-border/30">
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <p className="text-xs text-muted-foreground">
                    Replace the main founder image shown in the About section on the homepage and about page.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage}
                      className="rounded-full gap-1.5 px-4 text-xs h-9 relative overflow-hidden"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{data.about_image ? 'Replace Image' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'about_image')}
                        disabled={uploadingImage}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>

                    {data.about_image && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleResetImage('about_image')}
                        className="rounded-full gap-1.5 px-4 text-xs h-9 hover:bg-rose-500/10 hover:text-rose-600 border border-transparent hover:border-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Reset to Default</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Image 2: Secondary Healing Space Image */}
            <div className="space-y-3 pt-4 border-t border-border/20">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-gold" /> About Section Secondary Image
              </Label>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-border/60 bg-muted">
                  {data.about_image_2 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.about_image_2}
                      alt="Secondary about image"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800"
                      alt="Default secondary image"
                      className="w-full h-full object-cover object-top opacity-60"
                    />
                  )}
                  {!data.about_image_2 && (
                    <span className="absolute bottom-1 left-1 bg-background/80 text-[8px] font-bold px-1 py-0.5 rounded border border-border/30">
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <p className="text-xs text-muted-foreground">
                    Replace the secondary session / space image shown in the About section on the homepage and about page.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage2}
                      className="rounded-full gap-1.5 px-4 text-xs h-9 relative overflow-hidden"
                    >
                      {uploadingImage2 ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{data.about_image_2 ? 'Replace Image' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'about_image_2')}
                        disabled={uploadingImage2}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>

                    {data.about_image_2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleResetImage('about_image_2')}
                        className="rounded-full gap-1.5 px-4 text-xs h-9 hover:bg-rose-500/10 hover:text-rose-600 border border-transparent hover:border-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Reset to Default</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact and footer */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <PhoneCall className="h-4 w-4 text-gold" /> Contact & Footer Details
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Support Phone Number</Label>
              <Input
                value={data.contact_phone || ''}
                onChange={(e) => setData({ ...data, contact_phone: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input
                value={data.contact_email || ''}
                onChange={(e) => setData({ ...data, contact_email: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
          <div>
            <Label>Footer Copy text</Label>
            <Input
              value={data.footer_text || ''}
              onChange={(e) => setData({ ...data, footer_text: e.target.value })}
              className="mt-1.5 rounded-xl"
            />
          </div>
        </div>

        {/* Policies */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-gold" /> Legal & Cancellation Terms
          </h4>
          <div>
            <Label>Terms and Conditions Details</Label>
            <Textarea
              value={data.terms_text || ''}
              onChange={(e) => setData({ ...data, terms_text: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[120px]"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
