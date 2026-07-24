'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Check, X, Calendar, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';

type Healer = {
  id: string;
  name: string;
  photo_url: string;
  bio: string;
  expertise: string[];
  services: string[]; // service ids
  working_days: string[]; // e.g. ["Monday", "Tuesday", ...]
  working_hours: { start: string; end: string }; // e.g. { start: "09:00", end: "17:00" }
  break_time: { start: string; end: string }; // e.g. { start: "13:00", end: "14:00" }
  leaves: string[]; // e.g. ["2026-08-15"]
  max_daily_sessions: number;
  active: boolean;
};

export function AdminHealers() {
  const [healers, setHealers] = useState<Healer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHealer, setEditingHealer] = useState<Partial<Healer> | null>(null);
  const [newExp, setNewExp] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchHealersAndServices = async () => {
    try {
      const hSnap = await getDocs(collection(db, 'healers'));
      setHealers(hSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Healer));

      const sSnap = await getDocs(collection(db, 'services'));
      setServices(sSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service));
    } catch (e: any) {
      toast.error('Failed to load data: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealersAndServices();
  }, []);

  const handleCreateNew = () => {
    setEditingHealer({
      id: '',
      name: '',
      photo_url: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
      bio: '',
      expertise: [],
      services: [],
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      working_hours: { start: '09:00', end: '18:00' },
      break_time: { start: '13:00', end: '14:00' },
      leaves: [],
      max_daily_sessions: 6,
      active: true,
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading('Uploading healer photo...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload error');
      const { url } = await res.json();
      setEditingHealer((prev) => (prev ? { ...prev, photo_url: url } : null));
      toast.success('Photo uploaded!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHealer?.name || !editingHealer?.bio) {
      toast.error('Please fill in name and bio.');
      return;
    }

    const toastId = toast.loading('Saving healer profile...');
    try {
      const id = editingHealer.id || editingHealer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await setDoc(doc(db, 'healers', id), {
        ...editingHealer,
        id,
      }, { merge: true });

      toast.success('Healer profile saved successfully!', { id: toastId });
      setEditingHealer(null);
      fetchHealersAndServices();
    } catch (err: any) {
      toast.error('Failed to save healer: ' + err.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this healer?')) return;
    const toastId = toast.loading('Removing healer...');
    try {
      await deleteDoc(doc(db, 'healers', id));
      toast.success('Healer profile removed.', { id: toastId });
      fetchHealersAndServices();
    } catch (e: any) {
      toast.error('Failed to delete healer: ' + e.message, { id: toastId });
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
          <p className="text-xs text-muted-foreground">Configure expert practitioners and their slot rules.</p>
        </div>
        <Button onClick={handleCreateNew} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1">
          <Plus className="h-4 w-4" /> Add Healer
        </Button>
      </div>

      {editingHealer ? (
        <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="font-display text-lg font-medium text-foreground">
              {editingHealer.id ? 'Edit Healer Profile' : 'New Healer Profile'}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setEditingHealer(null)} className="rounded-full">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Full Name</Label>
              <Input
                value={editingHealer.name || ''}
                onChange={(e) => setEditingHealer({ ...editingHealer, name: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="e.g. Anand Dev"
              />
            </div>
            <div>
              <Label>Photo Upload</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {editingHealer.photo_url && (
                  <img src={editingHealer.photo_url} alt="Preview" className="h-10 w-10 rounded-full object-cover border border-border" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  className="rounded-xl file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Bio / Philosophy</Label>
            <Textarea
              value={editingHealer.bio || ''}
              onChange={(e) => setEditingHealer({ ...editingHealer, bio: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[80px]"
              placeholder="Tell clients about their approach..."
            />
          </div>

          <div>
            <Label>Expertise Tags</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {(editingHealer.expertise || []).map((exp) => (
                <span key={exp} className="bg-secondary text-foreground text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  {exp}
                  <button
                    type="button"
                    onClick={() => setEditingHealer({
                      ...editingHealer,
                      expertise: (editingHealer.expertise || []).filter((x) => x !== exp),
                    })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={newExp}
                onChange={(e) => setNewExp(e.target.value)}
                placeholder="Add expertise tag..."
                className="rounded-xl h-8 text-xs"
              />
              <Button
                type="button"
                onClick={() => {
                  if (newExp.trim()) {
                    setEditingHealer({
                      ...editingHealer,
                      expertise: [...(editingHealer.expertise || []), newExp.trim()],
                    });
                    setNewExp('');
                  }
                }}
                className="rounded-xl h-8 px-3 text-xs bg-gold hover:bg-gold-hover text-gold-foreground"
              >
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label>Assign Services</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1.5">
              {services.map((s) => {
                const checked = (editingHealer.services || []).includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const nextServices = checked
                          ? (editingHealer.services || []).filter((id) => id !== s.id)
                          : [...(editingHealer.services || []), s.id];
                        setEditingHealer({ ...editingHealer, services: nextServices });
                      }}
                      className="rounded border-border text-gold focus:ring-gold"
                    />
                    {s.title}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Availability schedule */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gold" /> Healer Availability Rules
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Working Days</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const checked = (editingHealer.working_days || []).includes(day);
                    return (
                      <label key={day} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const nextDays = checked
                              ? (editingHealer.working_days || []).filter((d) => d !== day)
                              : [...(editingHealer.working_days || []), day];
                            setEditingHealer({ ...editingHealer, working_days: nextDays });
                          }}
                          className="rounded border-border text-gold focus:ring-gold"
                        />
                        {day.slice(0, 3)}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Working Start</Label>
                    <Input
                      type="time"
                      value={editingHealer.working_hours?.start || '09:00'}
                      onChange={(e) => setEditingHealer({
                        ...editingHealer,
                        working_hours: { ...(editingHealer.working_hours || { start: '', end: '' }), start: e.target.value }
                      })}
                      className="rounded-xl mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Working End</Label>
                    <Input
                      type="time"
                      value={editingHealer.working_hours?.end || '18:00'}
                      onChange={(e) => setEditingHealer({
                        ...editingHealer,
                        working_hours: { ...(editingHealer.working_hours || { start: '', end: '' }), end: e.target.value }
                      })}
                      className="rounded-xl mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Break Start</Label>
                    <Input
                      type="time"
                      value={editingHealer.break_time?.start || '13:00'}
                      onChange={(e) => setEditingHealer({
                        ...editingHealer,
                        break_time: { ...(editingHealer.break_time || { start: '', end: '' }), start: e.target.value }
                      })}
                      className="rounded-xl mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Break End</Label>
                    <Input
                      type="time"
                      value={editingHealer.break_time?.end || '14:00'}
                      onChange={(e) => setEditingHealer({
                        ...editingHealer,
                        break_time: { ...(editingHealer.break_time || { start: '', end: '' }), end: e.target.value }
                      })}
                      className="rounded-xl mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/20">
              <div>
                <Label>Max Sessions / Day</Label>
                <Input
                  type="number"
                  value={editingHealer.max_daily_sessions || 6}
                  onChange={(e) => setEditingHealer({ ...editingHealer, max_daily_sessions: parseInt(e.target.value) || 6 })}
                  className="rounded-xl mt-1.5 h-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Allow Booking</Label>
                <Switch
                  checked={editingHealer.active !== false}
                  onCheckedChange={(checked) => setEditingHealer({ ...editingHealer, active: checked })}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-8">
              Save Healer
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {healers.map((h) => (
            <div key={h.id} className="rounded-3xl border border-border bg-card p-5 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between text-left space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img src={h.photo_url} alt={h.name} className="h-10 w-10 rounded-full object-cover border border-border" />
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{h.name}</h4>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {h.working_days.length} Working Days &middot; {h.working_hours?.start}–{h.working_hours?.end}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase',
                    h.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
                  )}>
                    {h.active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{h.bio}</p>
                <div className="mt-2.5 flex gap-1 flex-wrap">
                  {(h.expertise || []).map((exp) => (
                    <span key={exp} className="bg-secondary/60 text-muted-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
                <Button size="sm" variant="ghost" onClick={() => setEditingHealer(h)} className="rounded-full text-xs h-7 px-3">
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id)} className="rounded-full text-xs h-7 px-3 hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
