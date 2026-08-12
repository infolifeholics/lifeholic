'use client';

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Check, X, Star, Pin, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Testimonial } from '@/lib/types';
import { ImageCropperModal } from './image-cropper-modal';

export function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTestimonial, setEditingTestimonial] = useState<Partial<Testimonial> | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string>('');

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropperSrc(reader.result as string);
      setCropperOpen(true);
    });
    reader.readAsDataURL(file);
  };

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

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading('Uploading avatar to Cloudinary...');
    try {
      const { url } = await uploadToCloudinaryDirect(file, false);
      setEditingTestimonial((prev) => (prev ? { ...prev, image: url } : null));
      toast.success('Avatar uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const snap = await getDocs(collection(db, 'testimonials'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Testimonial);
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setTestimonials(list);
    } catch (e: any) {
      toast.error('Failed to load testimonials: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleCreateNew = () => {
    const nextOrder = testimonials.length > 0 ? Math.max(...testimonials.map((t) => t.sort_order || 0)) + 1 : 1;
    setEditingTestimonial({
      id: '',
      name: '',
      role: 'Client',
      image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
      quote: '',
      rating: 5,
      featured: true,
      pinned: false,
      sort_order: nextOrder,
      location: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestimonial?.name || !editingTestimonial?.quote) {
      toast.error('Name and Quote are required fields.');
      return;
    }

    const toastId = toast.loading('Saving testimonial...');
    try {
      const id = editingTestimonial.id || editingTestimonial.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await setDoc(doc(db, 'testimonials', id), {
        ...editingTestimonial,
        id,
      }, { merge: true });
      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});

      toast.success('Testimonial saved successfully!', { id: toastId });
      setEditingTestimonial(null);
      fetchTestimonials();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message, { id: toastId });
    }
  };

  const togglePin = async (t: Testimonial) => {
    try {
      await setDoc(doc(db, 'testimonials', t.id), { pinned: !t.pinned }, { merge: true });
      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      toast.success(t.pinned ? 'Testimonial unpinned.' : 'Testimonial pinned to top!');
      fetchTestimonials();
    } catch (e) {
      toast.error('Failed to toggle pin state.');
    }
  };

  const toggleFeatured = async (t: Testimonial) => {
    try {
      await setDoc(doc(db, 'testimonials', t.id), { featured: !t.featured }, { merge: true });
      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      toast.success(t.featured ? 'Testimonial hidden.' : 'Testimonial set to active!');
      fetchTestimonials();
    } catch (e) {
      toast.error('Failed to toggle active state.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial permanently?')) return;
    try {
      await deleteDoc(doc(db, 'testimonials', id));
      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      toast.success('Testimonial deleted successfully.');
      fetchTestimonials();
    } catch (e) {
      toast.error('Failed to delete.');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Manage client reviews, pin key feedback, and toggle display states.</p>
        </div>
        <Button onClick={handleCreateNew} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1">
          <Plus className="h-4 w-4" /> Add Testimonial
        </Button>
      </div>

      {editingTestimonial ? (
        <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="font-display text-lg font-medium text-foreground">
              {editingTestimonial.id ? 'Edit Testimonial' : 'New Testimonial'}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setEditingTestimonial(null)} className="rounded-full">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Client Name</Label>
              <Input
                value={editingTestimonial.name || ''}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="e.g. Rachel Green"
              />
            </div>
            <div>
              <Label>Designation / Role</Label>
              <Input
                value={editingTestimonial.role || ''}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="e.g. Entrepreneur"
              />
            </div>
            <div>
              <Label>Rating stars</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={editingTestimonial.rating || 5}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, rating: parseInt(e.target.value) || 5 })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Client Avatar Image</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-background-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={editingTestimonial.image || 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=150'} 
                  alt="Avatar Preview" 
                  className="h-full w-full object-cover" 
                />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full gap-2 h-10 px-4 text-xs"
                >
                  <UploadCloud className="h-4 w-4" /> Upload Avatar (4:3)
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Or Avatar Image URL</Label>
            <Input
              value={editingTestimonial.image || ''}
              onChange={(e) => setEditingTestimonial({ ...editingTestimonial, image: e.target.value })}
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label>Review Content</Label>
            <Textarea
              value={editingTestimonial.quote || ''}
              onChange={(e) => setEditingTestimonial({ ...editingTestimonial, quote: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[100px]"
              placeholder="What did the client say about their transformation..."
            />
          </div>

          <div className="flex gap-6 items-center pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={editingTestimonial.pinned === true}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, pinned: e.target.checked })}
                className="rounded border-border text-gold focus:ring-gold"
              />
              Pin to Top
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={editingTestimonial.featured !== false}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, featured: e.target.checked })}
                className="rounded border-border text-gold focus:ring-gold"
              />
              Show Testimonial (Active)
            </label>
          </div>

          <Button type="submit" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6 mt-2">
            Save Testimonial
          </Button>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-3xl border border-border bg-card p-5 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between text-left space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    {t.image && (
                      <img src={t.image} alt={t.name} className="h-9 w-9 rounded-full object-cover border border-border" />
                    )}
                    <div>
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {t.name}
                        {t.pinned && <Pin className="h-3 w-3 text-gold fill-gold" />}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gold">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-gold" />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground italic">&ldquo;{t.quote}&rdquo;</p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border/20 mt-2">
                <Button size="sm" variant="ghost" onClick={() => togglePin(t)} className="rounded-full text-xs h-7 px-3">
                  {t.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleFeatured(t)} className="rounded-full text-xs h-7 px-3">
                  {t.featured ? 'Hide' : 'Show'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTestimonial(t)} className="rounded-full text-xs h-7 px-3">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} className="rounded-full text-xs h-7 px-3 hover:text-destructive hover:bg-destructive/10">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cropperOpen && (
        <ImageCropperModal
          isOpen={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setCropperSrc('');
          }}
          imageSrc={cropperSrc}
          aspect={4 / 3} // Enforce 4:3 crop aspect ratio for testimonials
          onCropComplete={(croppedFile) => {
            handleImageUpload(croppedFile);
          }}
          title="Crop Testimonial Avatar (4:3)"
        />
      )}
    </div>
  );
}
