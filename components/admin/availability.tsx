'use client';

import { useEffect, useState } from 'react';
import { CalendarX, Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  kind: 'weekly' | 'blocked' | 'holiday';
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  specific_date: string | null;
  note: string | null;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AdminAvailability() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'weekly' | 'blocked' | 'holiday'>('weekly');

  const [weekly, setWeekly] = useState({ weekday: '1', start: '09:00', end: '18:00', note: '' });
  const [blocked, setBlocked] = useState({ date: '', start: '10:00', end: '12:00', note: '' });
  const [holiday, setHoliday] = useState({ date: '', note: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('availability').select('*').order('kind, weekday, specific_date');
    setLoading(false);
    setRows((data as Row[]) || []);
  };
  useEffect(() => { load(); }, []);

  const addWeekly = async () => {
    const { error } = await supabase.from('availability').insert({
      kind: 'weekly',
      weekday: Number(weekly.weekday),
      start_time: weekly.start,
      end_time: weekly.end,
      note: weekly.note || DAYS[Number(weekly.weekday)],
    });
    if (error) return toast.error(error.message);
    toast.success('Weekly window added.');
    load();
  };
  const addBlocked = async () => {
    if (!blocked.date) return toast.error('Pick a date.');
    const { error } = await supabase.from('availability').insert({
      kind: 'blocked',
      specific_date: blocked.date,
      start_time: blocked.start,
      end_time: blocked.end,
      note: blocked.note || 'Blocked slot',
    });
    if (error) return toast.error(error.message);
    toast.success('Slot blocked.');
    load();
  };
  const addHoliday = async () => {
    if (!holiday.date) return toast.error('Pick a date.');
    const { error } = await supabase.from('availability').insert({
      kind: 'holiday',
      specific_date: holiday.date,
      note: holiday.note || 'Holiday',
    });
    if (error) return toast.error(error.message);
    toast.success('Holiday added.');
    load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('availability').delete().eq('id', id);
    if (error) return toast.error('Could not remove.');
    load();
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
      <div className="flex flex-wrap gap-2">
        {(['weekly', 'blocked', 'holiday'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'weekly' && <Clock className="mr-1.5 inline h-4 w-4" />}
            {t === 'blocked' && <CalendarX className="mr-1.5 inline h-4 w-4" />}
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'weekly' && (
          <div className="grid gap-3 sm:grid-cols-5">
            <div><Label>Day</Label>
              <select value={weekly.weekday} onChange={(e) => setWeekly({ ...weekly, weekday: e.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div><Label>Start</Label><Input type="time" value={weekly.start} onChange={(e) => setWeekly({ ...weekly, start: e.target.value })} className="mt-1.5" /></div>
            <div><Label>End</Label><Input type="time" value={weekly.end} onChange={(e) => setWeekly({ ...weekly, end: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Note</Label><Input value={weekly.note} onChange={(e) => setWeekly({ ...weekly, note: e.target.value })} className="mt-1.5" placeholder="e.g. Afternoons" /></div>
            <div className="flex items-end"><Button onClick={addWeekly} className="w-full rounded-full"><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
          </div>
        )}
        {tab === 'blocked' && (
          <div className="grid gap-3 sm:grid-cols-5">
            <div><Label>Date</Label><Input type="date" value={blocked.date} onChange={(e) => setBlocked({ ...blocked, date: e.target.value })} className="mt-1.5" /></div>
            <div><Label>From</Label><Input type="time" value={blocked.start} onChange={(e) => setBlocked({ ...blocked, start: e.target.value })} className="mt-1.5" /></div>
            <div><Label>To</Label><Input type="time" value={blocked.end} onChange={(e) => setBlocked({ ...blocked, end: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Reason</Label><Input value={blocked.note} onChange={(e) => setBlocked({ ...blocked, note: e.target.value })} className="mt-1.5" /></div>
            <div className="flex items-end"><Button onClick={addBlocked} className="w-full rounded-full"><Plus className="mr-1 h-4 w-4" /> Block</Button></div>
          </div>
        )}
        {tab === 'holiday' && (
          <div className="grid gap-3 sm:grid-cols-4">
            <div><Label>Date</Label><Input type="date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} className="mt-1.5" /></div>
            <div className="sm:col-span-2"><Label>Label</Label><Input value={holiday.note} onChange={(e) => setHoliday({ ...holiday, note: e.target.value })} className="mt-1.5" placeholder="e.g. Independence Day" /></div>
            <div className="flex items-end"><Button onClick={addHoliday} className="w-full rounded-full"><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="font-display text-lg font-medium text-foreground">Current rules</h3>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No rules yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {r.kind === 'weekly' ? DAYS[r.weekday ?? 0] : r.specific_date}
                    {r.kind !== 'holiday' && r.start_time && ` · ${r.start_time}–${r.end_time}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.note} · <span className="capitalize">{r.kind}</span></p>
                </div>
                <button onClick={() => remove(r.id)} aria-label="Remove" className="rounded-full p-2 text-muted-foreground hover:bg-card hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
