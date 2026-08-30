'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, Check, X, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DAYS_OF_WEEK } from '@/lib/booking-utils';
import { auth } from '@/lib/firebase';
import { formatTimeTo12Hour } from '@/lib/format';

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  locked?: boolean;
};

type Holiday = {
  id: string;
  date: string;
  from_date?: string;
  to_date?: string;
  start_time: string | null;
  end_time: string | null;
  note: string;
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

  // Holiday States
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [note, setNote] = useState('');
  const [isSlotSpecific, setIsSlotSpecific] = useState(false);
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('11:00');
  const [addingHoliday, setAddingHoliday] = useState(false);

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

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/admin/holidays');
      const data = await res.json();
      if (res.ok) {
        setHolidays(data.holidays || []);
      } else {
        toast.error(data.error || 'Failed to load holidays.');
      }
    } catch {
      toast.error('Network error loading holidays.');
    } finally {
      setHolidaysLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchHolidays();
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

  const handleToggleLock = async (slot: Slot) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const nextLocked = !slot.locked;
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'edit',
          id: slot.id,
          slot: { locked: nextLocked }
        })
      });
      if (res.ok) {
        toast.success(`Slot ${nextLocked ? 'locked' : 'unlocked'}.`);
        setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, locked: nextLocked } : s));
      } else {
        toast.error('Failed to update slot lock.');
      }
    } catch {
      toast.error('Network error updating slot lock.');
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
    if (!await (window as any).customConfirm('Are you sure you want to delete this slot?')) return;
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

  // Holiday Functions
  const handleAddHoliday = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both start and end dates.');
      return;
    }
    if (!note.trim()) {
      toast.error('Holiday message is required.');
      return;
    }
    if (toDate < fromDate) {
      toast.error('End date cannot be before start date.');
      return;
    }
    setAddingHoliday(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'add',
          holiday: {
            from_date: fromDate,
            to_date: toDate,
            note: note.trim(),
            start_time: isSlotSpecific ? startTime : null,
            end_time: isSlotSpecific ? endTime : null,
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Holiday added successfully.');
        setFromDate('');
        setToDate('');
        setNote('');
        setIsSlotSpecific(false);
        fetchHolidays();
      } else {
        toast.error(data.error || 'Failed to add holiday.');
      }
    } catch {
      toast.error('Network error adding holiday.');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!await (window as any).customConfirm('Are you sure you want to remove this holiday?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/holidays', {
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
        toast.success('Holiday removed.');
        setHolidays(prev => prev.filter(h => h.id !== id));
      } else {
        toast.error('Failed to remove holiday.');
      }
    } catch {
      toast.error('Network error removing holiday.');
    }
  };

  const filteredSlots = slots.filter(s => s.day_of_week === selectedDay);

  return (
    <div className="space-y-8">
      {/* 1. Session Slots Panel */}
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
                          <div className="flex items-center gap-1.5">
                            {s.locked && (
                              <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                                Locked
                              </span>
                            )}
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
                        </div>

                        <div className="flex justify-end items-center gap-2 mt-4 pt-2 border-t border-border/20">
                          <button
                            onClick={() => handleToggleLock(s)}
                            className="text-[10px] font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-auto"
                            title={s.locked ? "Unlock Slot" : "Lock Slot"}
                          >
                            {s.locked ? '🔓 Unlock Slot' : '🔒 Lock Slot'}
                          </button>
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

      {/* 2. Integrated Holiday Management Section */}
      <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">Holiday &amp; Off-days</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Declare session closures or block specific hours/days for holidays.</p>
        </div>

        {/* Add Holiday Form */}
        <div className="mt-6 p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h3 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Holiday closure
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="holiday-from-date" className="text-xs">From Date</Label>
              <Input
                id="holiday-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (!toDate) setToDate(e.target.value);
                }}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="holiday-to-date" className="text-xs">To Date</Label>
              <Input
                id="holiday-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="holiday-label" className="text-xs">Holiday Message / Reason *</Label>
              <Input
                id="holiday-label"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Our team is on leave due to festival."
                className="mt-1 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Slot Specific Toggles */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="slot-specific-checkbox"
              type="checkbox"
              checked={isSlotSpecific}
              onChange={(e) => setIsSlotSpecific(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
            />
            <Label htmlFor="slot-specific-checkbox" className="text-xs select-none">
              Block a specific time slot only (e.g. half-day holiday)
            </Label>
          </div>

          {isSlotSpecific && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-card/50 border border-border/20 rounded-xl animate-fade-in">
              <div>
                <Label htmlFor="holiday-start-time" className="text-[10px]">Start Time (24h)</Label>
                <Input
                  id="holiday-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="holiday-end-time" className="text-[10px]">End Time (24h)</Label>
                <Input
                  id="holiday-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
          )}

          <Button onClick={handleAddHoliday} disabled={addingHoliday} className="rounded-full w-full">
            {addingHoliday ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Declare Holiday'}
          </Button>
        </div>

        {/* Holiday list */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-4">Scheduled Holidays / Off-days</h3>

          {holidaysLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : holidays.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-2xl">
              No holidays declared.
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => {
                const start = h.from_date || h.date;
                const end = h.to_date || h.date;
                const todayStr = new Date().toLocaleDateString('en-CA');
                const isExpired = end < todayStr;

                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:border-gold/30 transition-all animate-fade-in"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4 text-gold shrink-0" />
                        <span className="font-semibold text-foreground">
                          {start === end ? start : `${start} to ${end}`}
                        </span>
                        {h.start_time ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" /> {h.start_time} – {h.end_time}
                          </span>
                        ) : (
                          <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            All Day
                          </span>
                        )}
                        <span className={cn(
                          "text-[10px] px-2.5 py-0.5 rounded-full font-medium border",
                          isExpired 
                            ? "bg-secondary/40 text-muted-foreground border-border" 
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        )}>
                          {isExpired ? "Expired" : "Active"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{h.note}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-rose-400 transition-colors"
                      title="Remove holiday"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
