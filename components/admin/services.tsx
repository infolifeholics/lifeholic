'use client';

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, UploadCloud, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Service } from '@/lib/types';
import { ImageCropperModal } from './image-cropper-modal';

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
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

  const fetchServices = async () => {
    try {
      const colRef = collection(db, 'services');
      const snap = await getDocs(colRef);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service);
      // Sort by sort_order
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setServices(list);
    } catch (err: any) {
      toast.error('Failed to load services: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreateNew = () => {
    const nextOrder = services.length > 0 ? Math.max(...services.map((s) => s.sort_order || 0)) + 1 : 1;
    setEditingService({
      id: '',
      title: '',
      slug: '',
      short: '',
      description: '',
      who_for: '',
      benefits: [''],
      process: [''],
      duration_minutes: 60,
      price_inr: 2000,
      price_usd: 30,
      mode: 'online',
      image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
      category: 'Therapy',
      featured: true,
      sort_order: nextOrder,
      active: true,
    } as any);
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
    const toastId = toast.loading('Uploading image to Cloudinary...');
    try {
      const { url } = await uploadToCloudinaryDirect(file, false);
      setEditingService((prev) => (prev ? { ...prev, image: url } : null));
      toast.success('Image uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.title || !editingService?.short || !editingService?.description) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const toastId = toast.loading('Saving service...');
    try {
      const id = editingService.id || editingService.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const slug = editingService.slug || id;

      const finalServiceObj = {
        ...editingService,
        id,
        slug,
        mode: 'online',
        benefits: editingService.benefits?.filter(Boolean) || [],
        process: editingService.process?.filter(Boolean) || [],
        active: editingService.active !== false,
      };

      await setDoc(doc(db, 'services', id), finalServiceObj, { merge: true });
      toast.success('Service saved successfully!', { id: toastId });
      setEditingService(null);
      fetchServices();
    } catch (err: any) {
      toast.error('Failed to save service: ' + err.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    const toastId = toast.loading('Deleting service...');
    try {
      await deleteDoc(doc(db, 'services', id));
      toast.success('Service deleted successfully.', { id: toastId });
      fetchServices();
    } catch (err: any) {
      toast.error('Failed to delete service: ' + err.message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading services configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editingService ? (
        <form onSubmit={handleSave} className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <h2 className="font-display text-xl font-medium text-foreground">
              {editingService.id ? 'Edit Service' : 'Add New Service'}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingService(null)} className="rounded-full">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-title">Service Title *</Label>
              <Input
                id="s-title"
                value={editingService.title || ''}
                onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="s-slug">Slug (Auto-generated if empty)</Label>
              <Input
                id="s-slug"
                value={editingService.slug || ''}
                onChange={(e) => setEditingService({ ...editingService, slug: e.target.value })}
                placeholder="e.g. personal-healing-session"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="s-duration">Duration (Minutes) *</Label>
              <Input
                id="s-duration"
                type="number"
                value={editingService.duration_minutes || ''}
                onChange={(e) => setEditingService({ ...editingService, duration_minutes: Number(e.target.value) })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="s-category">Category</Label>
              <Input
                id="s-category"
                value={editingService.category || ''}
                onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                placeholder="e.g. Therapy, Healing, Program"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="s-price-inr">Price (INR) *</Label>
              <Input
                id="s-price-inr"
                type="number"
                value={editingService.price_inr || ''}
                onChange={(e) => setEditingService({ ...editingService, price_inr: Number(e.target.value) })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="s-price-usd">Price (USD) *</Label>
              <Input
                id="s-price-usd"
                type="number"
                value={editingService.price_usd || ''}
                onChange={(e) => setEditingService({ ...editingService, price_usd: Number(e.target.value) })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="s-mode">Delivery Mode</Label>
              <select
                id="s-mode"
                value="online"
                disabled
                className="mt-1.5 block w-full rounded-2xl border border-input bg-background/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-not-allowed opacity-80"
              >
                <option value="online">Online Only</option>
              </select>
            </div>
            <div>
              <Label htmlFor="s-order">Display Order (Order Number)</Label>
              <Input
                id="s-order"
                type="number"
                value={editingService.sort_order || 0}
                onChange={(e) => setEditingService({ ...editingService, sort_order: Number(e.target.value) })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="s-short">Short Description *</Label>
            <Input
              id="s-short"
              value={editingService.short || ''}
              onChange={(e) => setEditingService({ ...editingService, short: e.target.value })}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="s-desc">Full Description *</Label>
            <Textarea
              id="s-desc"
              rows={4}
              value={editingService.description || ''}
              onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="s-who">Who is this for? (optional)</Label>
            <Input
              id="s-who"
              value={editingService.who_for || ''}
              onChange={(e) => setEditingService({ ...editingService, who_for: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {/* Image Upload Option */}
          <div className="space-y-3">
            <Label>Service Image</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-28 overflow-hidden rounded-xl border border-border bg-background-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={editingService.image || 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=700'} 
                  alt="Service Preview" 
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
                  className="rounded-full gap-2 h-10 px-4"
                >
                  <UploadCloud className="h-4 w-4" /> Upload Image
                </Button>
              </div>
            </div>
          </div>

          {/* Features / Benefits Points */}
          <div className="space-y-3">
            <Label>Benefits / Features Points</Label>
            <div className="space-y-2">
              {(editingService.benefits || []).map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={point}
                    onChange={(e) => {
                      const copy = [...(editingService.benefits || [])];
                      copy[index] = e.target.value;
                      setEditingService({ ...editingService, benefits: copy });
                    }}
                    placeholder={`Benefit Point #${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const copy = (editingService.benefits || []).filter((_, idx) => idx !== index);
                      setEditingService({ ...editingService, benefits: copy });
                    }}
                    className="rounded-full text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingService({
                    ...editingService,
                    benefits: [...(editingService.benefits || []), ''],
                  });
                }}
                className="rounded-full mt-1"
              >
                + Add Benefit Point
              </Button>
            </div>
          </div>

          {/* Process / Session Flow Points */}
          <div className="space-y-3">
            <Label>How a Session Flows (Steps)</Label>
            <div className="space-y-2">
              {(editingService.process || []).map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={step}
                    onChange={(e) => {
                      const copy = [...(editingService.process || [])];
                      copy[index] = e.target.value;
                      setEditingService({ ...editingService, process: copy });
                    }}
                    placeholder={`Flow Step #${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const copy = (editingService.process || []).filter((_, idx) => idx !== index);
                      setEditingService({ ...editingService, process: copy });
                    }}
                    className="rounded-full text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingService({
                    ...editingService,
                    process: [...(editingService.process || []), ''],
                  });
                }}
                className="rounded-full mt-1"
              >
                + Add Flow Step
              </Button>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="s-active"
                checked={editingService.active !== false}
                onCheckedChange={(checked) => setEditingService({ ...editingService, active: checked })}
              />
              <Label htmlFor="s-active">Active (Visible on Website)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="s-featured"
                checked={editingService.featured === true}
                onCheckedChange={(checked) => setEditingService({ ...editingService, featured: checked })}
              />
              <Label htmlFor="s-featured">Featured Offering</Label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-border/60">
            <Button type="submit" disabled={uploading} className="rounded-full">
              Save Service
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingService(null)} className="rounded-full">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">Services Offered</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage details, pricing, availability, and layout order of therapy services.</p>
            </div>
            <Button onClick={handleCreateNew} className="rounded-full flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Image</th>
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Duration</th>
                  <th className="pb-3 pr-4">Price (INR)</th>
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-secondary/10">
                    <td className="py-4 pr-4">
                      <div className="h-10 w-16 overflow-hidden rounded-lg border border-border/60 bg-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.short}</p>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground capitalize">{s.category}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{s.duration_minutes} mins</td>
                    <td className="py-4 pr-4 text-muted-foreground">₹{s.price_inr.toLocaleString('en-IN')}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{s.sort_order}</td>
                    <td className="py-4 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${s.active !== false ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                        {s.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingService(s)}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id)}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          aspect={16 / 11} // 16:11 ratio for services
          onCropComplete={(croppedFile) => {
            handleImageUpload(croppedFile);
          }}
          title="Crop Service Image (16:11)"
        />
      )}
    </div>
  );
}
