'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Calendar, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';

type Holiday = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  note: string;
};

export function AdminHolidayManagement() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isSlotSpecific, setIsSlotSpecific] = useState(false);
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('11:00');
  const [adding, setAdding] = useState(false);

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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async () => {
    if (!date) {
      toast.error('Please select a date.');
      return;
    }
    setAdding(true);
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
            date,
            note: note || 'Holiday',
            start_time: isSlotSpecific ? startTime : null,
            end_time: isSlotSpecific ? endTime : null,
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Holiday added successfully.');
        setDate('');
        setNote('');
        setIsSlotSpecific(false);
        fetchHolidays();
      } else {
        toast.error(data.error || 'Failed to add holiday.');
      }
    } catch {
      toast.error('Network error adding holiday.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
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

  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
      <div>
        <h2 className="font-display text-xl font-medium text-foreground">Holiday Management</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Declare clinic closures or block specific hours for holidays.</p>
      </div>

      {/* Add Holiday Form */}
      <div className="mt-6 p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
        <h3 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Holiday closure
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="holiday-date" className="text-xs">Date</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="holiday-label" className="text-xs">Reason/Label</Label>
            <Input
              id="holiday-label"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Independence Day / System Maintenance"
              className="mt-1 rounded-xl"
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

        <Button onClick={handleAddHoliday} disabled={adding} className="rounded-full w-full">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Declare Holiday'}
        </Button>
      </div>

      {/* Holiday list */}
      <div className="mt-8">
        <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-4">Scheduled Holidays / Off-days</h3>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-2xl">
            No holidays declared.
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card hover:border-gold/30 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold shrink-0" />
                    <span className="font-semibold text-foreground">{h.date}</span>
                    {h.start_time ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" /> {h.start_time} – {h.end_time}
                      </span>
                    ) : (
                      <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                        All Day
                      </span>
                    )}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
