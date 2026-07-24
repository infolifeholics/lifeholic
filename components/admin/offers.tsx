'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, UploadCloud, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export function AdminOffers() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [active, setActive] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    fetchOfferSettings();
  }, []);

  const fetchOfferSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'offers');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActive(data.active || false);
        setShowPopup(data.showPopup || false);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setDiscountText(data.discountText || '');
        setImageUrl(data.imageUrl || '');
        setLinkUrl(data.linkUrl || '');
      }
    } catch (err) {
      toast.error('Failed to load offer settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'offers'), {
        active,
        showPopup,
        title,
        description,
        discountText,
        imageUrl,
        linkUrl,
        updated_at: new Date().toISOString(),
      });
      toast.success('Offer settings saved.');
    } catch (err) {
      toast.error('Could not save offer settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading('Uploading offer image...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload error.');
      const data = await res.json();
      setImageUrl(data.url);
      toast.success('Image uploaded successfully.', { id: toastId });
    } catch (err) {
      toast.error('Image upload failed.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading offers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <h2 className="font-display text-xl font-medium text-foreground">Promotions & Offers Settings</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Control landing page banners and offer overlays.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-full gap-2 px-6">
            <Save className="h-4 w-4" /> Save Configuration
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Toggles & Text inputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <div>
                <Label htmlFor="active-toggle" className="font-semibold text-foreground">Activate Promotion Banner</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Show this offer in the landing page banner.</p>
              </div>
              <Switch id="active-toggle" checked={active} onCheckedChange={setActive} />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/30">
              <div>
                <Label htmlFor="popup-toggle" className="font-semibold text-foreground">Enable Offer Popup Overlay</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Display a popup window when visiting the page.</p>
              </div>
              <Switch id="popup-toggle" checked={showPopup} onCheckedChange={setShowPopup} />
            </div>

            <div>
              <Label htmlFor="o-title">Offer Title</Label>
              <Input id="o-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Special Festive Healing Offer" />
            </div>

            <div>
              <Label htmlFor="o-disc">Discount / Subtitle Text</Label>
              <Input id="o-disc" value={discountText} onChange={(e) => setDiscountText(e.target.value)} className="mt-1.5" placeholder="e.g. GET 20% OFF ON ALL MEDITATIONS" />
            </div>

            <div>
              <Label htmlFor="o-desc">Detailed Description</Label>
              <Textarea id="o-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="Write offer details..." />
            </div>

            <div>
              <Label htmlFor="o-link">Promo Redirect URL</Label>
              <Input id="o-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-1.5" placeholder="e.g. /shop or /booking" />
            </div>
          </div>

          {/* Image & Preview */}
          <div className="space-y-4">
            <div>
              <Label>Offer Banner Image</Label>
              <div className="mt-2 border-2 border-dashed border-border/60 rounded-2xl p-6 flex flex-col items-center justify-center bg-secondary/20">
                {imageUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/40 mb-4 bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Promo" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                )}
                
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all">
                    Choose Image File
                  </span>
                  <input type="file" accept="image/*" disabled={uploading} onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-2">Live Preview (Inline Home Banner)</span>
              {active ? (
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  {imageUrl && (
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{discountText || 'PROMOTION'}</span>
                    <h4 className="font-display font-medium text-foreground text-base mt-0.5">{title || 'Offer Title'}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
                  </div>
                  <Button size="sm" className="rounded-full shrink-0">Claim Offer</Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">Promo banner is currently deactivated.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
