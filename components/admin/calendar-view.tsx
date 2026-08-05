'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { formatInTz } from '@/lib/format';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  start_time: string;
  end_time: string;
  mode: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  service_title: string;
};

interface CalendarViewProps {
  onSelectBooking: (booking: any) => void;
}

export function AdminCalendarView({ onSelectBooking }: CalendarViewProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('start_time', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking));
    });
    return () => unsubscribe();
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = direction === 'next' ? 1 : -1;
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === 'month') {
        next.setMonth(next.getMonth() + amount);
      } else if (view === 'week') {
        next.setDate(next.getDate() + amount * 7);
      } else {
        next.setDate(next.getDate() + amount);
      }
      return next;
    });
  };

  // Helper calculation for month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { startDay, totalDays };
  };

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20';
      case 'completed':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'cancelled':
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20';
      default:
        return 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80';
    }
  };

  // Month View Render
  const renderMonth = () => {
    const { startDay, totalDays } = getDaysInMonth(currentDate);
    const days = [];
    const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

    // Fill preceding month's days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i) });
    }

    // Fill current month's days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i) });
    }

    return (
      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
        ))}
        {days.map((item, idx) => {
          const dayBookings = bookings.filter((b) => isSameDay(new Date(b.start_time), item.date));
          return (
            <div
              key={idx}
              className={cn(
                "min-h-[110px] p-2 border border-border/30 rounded-2xl bg-card/40 flex flex-col justify-between transition-colors",
                !item.currentMonth && "opacity-30"
              )}
            >
              <div className="flex justify-between items-center">
                <span className={cn("text-xs font-semibold", isSameDay(item.date, new Date()) ? "text-gold bg-gold/10 px-2 py-0.5 rounded-full" : "text-muted-foreground")}>
                  {item.day}
                </span>
                {dayBookings.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">{dayBookings.length} slot{dayBookings.length !== 1 && 's'}</span>
                )}
              </div>
              <div className="space-y-1 mt-1.5 flex-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                {dayBookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className={cn("w-full text-left text-[9px] px-1.5 py-0.5 rounded border capitalize truncate transition-colors", getStatusColor(b.status))}
                  >
                    {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.client_name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Week View Render
  const renderWeek = () => {
    const days = getWeekDays(currentDate);
    return (
      <div className="grid grid-cols-7 gap-3 mt-6">
        {days.map((day, idx) => {
          const dayBookings = bookings.filter((b) => isSameDay(new Date(b.start_time), day));
          return (
            <div key={idx} className="space-y-4">
              <div className="text-center pb-3 border-b border-border/40">
                <p className="text-xs text-muted-foreground font-semibold uppercase">{day.toLocaleDateString([], { weekday: 'short' })}</p>
                <p className={cn("text-lg font-bold font-display mt-0.5", isSameDay(day, new Date()) ? "text-gold" : "text-foreground")}>
                  {day.getDate()}
                </p>
              </div>
              <div className="space-y-2 min-h-[300px] bg-secondary/10 border border-dashed border-border/40 rounded-3xl p-2.5">
                {dayBookings.length === 0 ? (
                  <p className="text-[10px] text-center text-muted-foreground py-10">Free</p>
                ) : (
                  dayBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className={cn("p-2 rounded-2xl border text-left cursor-pointer transition-all space-y-1", getStatusColor(b.status))}
                    >
                      <p className="text-[10px] font-bold truncate">{b.service_title}</p>
                      <div className="flex items-center gap-1 text-[9px] opacity-80">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[9px] font-medium truncate">{b.client_name}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Day View Render
  const renderDay = () => {
    const dayBookings = bookings.filter((b) => isSameDay(new Date(b.start_time), currentDate));
    return (
      <div className="max-w-2xl mx-auto mt-6 bg-card/40 border border-border/60 rounded-3xl p-6 shadow-soft">
        <div className="flex justify-between items-center pb-4 border-b border-border/40 mb-6">
          <div>
            <h4 className="font-display text-lg font-medium text-foreground">{currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{dayBookings.length} session{dayBookings.length !== 1 && 's'} scheduled</p>
          </div>
        </div>
        <div className="space-y-3">
          {dayBookings.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">No sessions scheduled for today.</div>
          ) : (
            dayBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectBooking(b)}
                className={cn("p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors", getStatusColor(b.status))}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono font-semibold py-1 px-2.5 rounded-full bg-black/10">
                    {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{b.service_title}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">Client: {b.client_name} &middot; Mode: {b.mode === 'offline' ? 'online' : b.mode}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card/60 border border-border/60 rounded-3xl p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <ChevronLeft onClick={() => navigateDate('prev')} className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors" />
          <h3 className="font-display text-lg font-medium text-foreground min-w-[140px] text-center">
            {view === 'month' && currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            {view === 'week' && `Week of ${getWeekDays(currentDate)[0].getDate()} ${getWeekDays(currentDate)[0].toLocaleDateString([], { month: 'short' })}`}
            {view === 'day' && currentDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <ChevronRight onClick={() => navigateDate('next')} className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors" />
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="rounded-full text-xs">Today</Button>
        </div>

        {/* View Switchers */}
        <div className="flex rounded-full bg-secondary/80 p-1">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grid rendering */}
      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}
    </div>
  );
}
