'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, Check, X, Clock, Copy, Layers, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DAYS_OF_WEEK, DEFAULT_WEEKLY_SLOTS } from '@/lib/booking-utils';
import { auth } from '@/lib/firebase';
import { formatTimeTo12Hour } from '@/lib/format';

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

export function AdminSlotsManagement() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1); // default Monday

  // Add slot form state
  const [newStart, setNewStart] = useState('10:30');
  const [newEnd, setNewEnd] = useState('11:00');
  const [adding, setAdding] = useState(false);

  // Edit slot state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Copy / Duplicate / Bulk Create state
  const [copyTargetDay, setCopyTargetDay] = useState<number>(2);
  const [selectedDuplicateDays, setSelectedDuplicateDays] = useState<number[]>([]);
  const [selectedBulkDays, setSelectedBulkDays] = useState<number[]>([1, 2, 3, 4, 5]); // default Mon-Fri
  
  const [copying, setCopying] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/admin/slots');
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      } else {
        toast.error(data.error || 'Failed to load slots.');
      }
    } catch {
      toast.error('Network error loading slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleAddSlot = async () => {
    if (!newStart || !newEnd) {
      toast.error('Please specify start and end times.');
      return;
    }
    setAdding(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'add',
          slot: {
            day_of_week: selectedDay,
            start_time: newStart,
            end_time: newEnd,
            active: true
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Session slot added.');
        fetchSlots();
      } else {
        toast.error(data.error || 'Failed to add slot.');
      }
    } catch {
      toast.error('Network error adding slot.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (slot: Slot) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'edit',
          id: slot.id,
          slot: { active: !slot.active }
        })
      });
      if (res.ok) {
        toast.success(`Slot ${!slot.active ? 'enabled' : 'disabled'}.`);
        setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, active: !s.active } : s));
      } else {
        toast.error('Failed to update slot.');
      }
    } catch {
      toast.error('Network error updating slot.');
    }
  };

  const handleStartEdit = (slot: Slot) => {
    setEditingId(slot.id);
    setEditStart(slot.start_time);
    setEditEnd(slot.end_time);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editStart || !editEnd) {
      toast.error('Please specify both times.');
      return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'edit',
          id,
          slot: {
            start_time: editStart,
            end_time: editEnd
          }
        })
      });
      if (res.ok) {
        toast.success('Session slot updated.');
        setEditingId(null);
        fetchSlots();
      } else {
        toast.error('Failed to update slot.');
      }
    } catch {
      toast.error('Network error updating slot.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });
      if (res.ok) {
        toast.success('Session slot deleted.');
        setSlots(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error('Failed to delete slot.');
      }
    } catch {
      toast.error('Network error deleting slot.');
    }
  };

  const handleCopyDay = async () => {
    if (selectedDay === copyTargetDay) {
      toast.error('Source and destination days must be different.');
      return;
    }
    setCopying(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'copy_day',
          from_day: selectedDay,
          to_day: copyTargetDay
        })
      });
      if (res.ok) {
        toast.success(`Copied schedule to ${DAYS_OF_WEEK.find(d => d.value === copyTargetDay)?.name}`);
        fetchSlots();
      } else {
        toast.error('Failed to copy schedule.');
      }
    } catch {
      toast.error('Network error copying schedule.');
    } finally {
      setCopying(false);
    }
  };

  const handleDuplicateDay = async () => {
    if (selectedDuplicateDays.length === 0) {
      toast.error('Please select at least one day to duplicate to.');
      return;
    }
    setDuplicating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'duplicate',
          from_day: selectedDay,
          to_days: selectedDuplicateDays
        })
      });
      if (res.ok) {
        toast.success('Schedule duplicated successfully.');
        setSelectedDuplicateDays([]);
        fetchSlots();
      } else {
        toast.error('Failed to duplicate schedule.');
      }
    } catch {
      toast.error('Network error duplicating schedule.');
    } finally {
      setDuplicating(false);
    }
  };

  const handleBulkCreate = async () => {
    if (selectedBulkDays.length === 0) {
      toast.error('Please select at least one day for bulk creation.');
      return;
    }
    if (!confirm('This will delete all existing slots on the selected days and replace them with default slots. Proceed?')) return;
    setBulkCreating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'bulk_create',
          days: selectedBulkDays,
          slots: DEFAULT_WEEKLY_SLOTS
        })
      });
      if (res.ok) {
        toast.success('Default schedule created successfully.');
        fetchSlots();
      } else {
        toast.error('Failed to bulk create schedule.');
      }
    } catch {
      toast.error('Network error bulk creating.');
    } finally {
      setBulkCreating(false);
    }
  };

  const filteredSlots = slots.filter(s => s.day_of_week === selectedDay);

  const toggleDuplicateDay = (val: number) => {
    if (selectedDuplicateDays.includes(val)) {
      setSelectedDuplicateDays(prev => prev.filter(d => d !== val));
    } else {
      setSelectedDuplicateDays(prev => [...prev, val]);
    }
  };

  const toggleBulkDay = (val: number) => {
    if (selectedBulkDays.includes(val)) {
      setSelectedBulkDays(prev => prev.filter(d => d !== val));
    } else {
      setSelectedBulkDays(prev => [...prev, val]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">Session Slot Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Define weekly operational session slots for the booking calendar.</p>
        </div>

        {/* Weekday Selection Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 pb-4 border-b border-border/40">
          {DAYS_OF_WEEK.map((d) => (
            <button
              key={d.value}
              onClick={() => {
                setSelectedDay(d.value);
                setEditingId(null);
              }}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all',
                selectedDay === d.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Add Slot Panel */}
        <div className="mt-6 p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h3 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Slot for {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="slot-start-time" className="text-xs">Start Time (24h)</Label>
              <Input
                id="slot-start-time"
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="slot-end-time" className="text-xs">End Time (24h)</Label>
              <Input
                id="slot-end-time"
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
            <Button onClick={handleAddSlot} disabled={adding} className="rounded-full w-full">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Slot'}
            </Button>
          </div>
        </div>

        {/* Slots List */}
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold text-gold uppercase tracking-wider">Configured Slots</h3>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-2xl">
              No slots configured for this day.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSlots.map((s) => {
                const isEditing = editingId === s.id;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'flex flex-col justify-between p-4 rounded-2xl border transition-all',
                      s.active
                        ? 'bg-card border-border/60 hover:border-gold/30'
                        : 'bg-secondary/20 border-border/30 opacity-70'
                    )}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Start</Label>
                            <Input
                              type="time"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className="h-8 rounded-lg mt-0.5 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">End</Label>
                            <Input
                              type="time"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className="h-8 rounded-lg mt-0.5 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => handleSaveEdit(s.id)}
                            disabled={saving}
                            size="sm"
                            className="h-7 px-2.5 rounded-full text-xs"
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2.5 rounded-full text-xs"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gold shrink-0" />
                            <span className="font-semibold text-foreground">
                              {formatTimeTo12Hour(s.start_time)} – {formatTimeTo12Hour(s.end_time)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleActive(s)}
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border transition-colors',
                              s.active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            )}
                          >
                            {s.active ? 'Active' : 'Inactive'}
                          </button>
                        </div>

                        <div className="flex justify-end gap-1.5 mt-4 pt-2 border-t border-border/20">
                          <button
                            onClick={() => handleStartEdit(s)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Edit slot"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(s.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-rose-400 transition-colors"
                            title="Delete slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Duplication, Copy and Bulk Actions Dashboard */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Copy Schedule */}
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-1.5">
            <Copy className="h-4.5 w-4.5 text-gold" /> Copy Schedule
          </h3>
          <p className="text-xs text-muted-foreground">Copy all slots from the currently active day ({DAYS_OF_WEEK.find(d => d.value === selectedDay)?.name}) to a selected day.</p>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <Label className="text-xs">Destination Day</Label>
              <select
                value={copyTargetDay}
                onChange={(e) => setCopyTargetDay(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>{d.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleCopyDay} disabled={copying} className="rounded-full w-full">
              {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Copy Schedule'}
            </Button>
          </div>
        </div>

        {/* Duplicate Schedule */}
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-1.5">
            <Layers className="h-4.5 w-4.5 text-gold" /> Duplicate Schedule
          </h3>
          <p className="text-xs text-muted-foreground">Duplicate current schedule of {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.name} to multiple weekdays.</p>
          
          <div className="flex flex-wrap gap-2 py-2">
            {DAYS_OF_WEEK.map((d) => (
              <label
                key={d.value}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer select-none transition-colors",
                  selectedDuplicateDays.includes(d.value)
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedDuplicateDays.includes(d.value)}
                  onChange={() => toggleDuplicateDay(d.value)}
                  className="hidden"
                />
                {d.name.slice(0, 3)}
              </label>
            ))}
          </div>

          <Button onClick={handleDuplicateDay} disabled={duplicating} className="rounded-full w-full">
            {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Duplicate Day schedule'}
          </Button>
        </div>

        {/* Bulk Create Weekly Schedules */}
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4 md:col-span-2">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-1.5">
            <RotateCcw className="h-4.5 w-4.5 text-gold" /> Bulk Create Default Schedules
          </h3>
          <p className="text-xs text-muted-foreground">Select days to reset to default operational weekly schedule (7 slots daily, Monday to Friday defaults).</p>
          
          <div className="flex flex-wrap gap-2 py-2">
            {DAYS_OF_WEEK.map((d) => (
              <label
                key={d.value}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer select-none transition-colors",
                  selectedBulkDays.includes(d.value)
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedBulkDays.includes(d.value)}
                  onChange={() => toggleBulkDay(d.value)}
                  className="hidden"
                />
                {d.name}
              </label>
            ))}
          </div>

          <Button onClick={handleBulkCreate} disabled={bulkCreating} className="rounded-full w-full bg-gold hover:bg-gold-hover text-gold-foreground">
            {bulkCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Selected Days to Default Schedule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
