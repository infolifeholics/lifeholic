'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Trash2, AlertTriangle, RefreshCw, Clock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type ErrorLog = {
  id: string;
  message: string;
  category: 'API' | 'Queue' | 'Worker' | 'Email' | 'WhatsApp' | 'Booking';
  stack?: string;
  userId?: string | null;
  bookingId?: string | null;
  timestamp: string;
  metadata?: any;
};

const CATEGORY_COLORS: Record<string, string> = {
  API: 'text-red-400 bg-red-400/10 border-red-500/20',
  Queue: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
  Worker: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
  Email: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20',
  WhatsApp: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
  Booking: 'text-rose-400 bg-rose-400/10 border-rose-500/20',
};

export function AdminErrorLogsViewer() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'error_logs'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ErrorLog)));
    } catch (e) {
      toast.error('Failed to load error logs');
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'error_logs', id));
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success('Error log deleted.');
    } catch {
      toast.error('Failed to delete error log');
    }
  };

  const clearAllLogs = async () => {
    if (!confirm('Are you sure you want to purge all error logs?')) return;
    const toastId = toast.loading('Clearing error logs...');
    try {
      const snap = await getDocs(collection(db, 'error_logs'));
      const batchPromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchPromises);
      setLogs([]);
      toast.success('All error logs cleared.', { id: toastId });
    } catch {
      toast.error('Purge failed.', { id: toastId });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) =>
    !search ||
    l.message?.toLowerCase().includes(search.toLowerCase()) ||
    l.category?.toLowerCase().includes(search.toLowerCase()) ||
    l.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search error messages or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 w-full bg-secondary/30 border border-border/40 rounded-full text-xs text-foreground placeholder-muted-foreground outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-1 rounded-full h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {logs.length > 0 && (
            <Button onClick={clearAllLogs} variant="outline" size="sm" className="gap-1 rounded-full h-8 text-xs border-red-500/40 text-red-400 hover:bg-red-950/20">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Loading error logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card/50 py-10 text-center text-xs text-muted-foreground">
          No error logs reported. System is healthy.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-soft">
              <div
                className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[log.category] || 'text-muted-foreground'}`}>
                      {log.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground mt-1 truncate">
                    {log.message}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                    className="h-7 w-7 p-0 rounded-full border-red-500/30 text-red-400 hover:bg-red-950/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {expandedId === log.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expandedId === log.id && (
                <div className="border-t border-border/30 px-4 py-3 bg-secondary/15 space-y-3">
                  {log.stack && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Stack Trace</p>
                      <pre className="text-[10px] text-red-400 bg-black/40 rounded-xl p-3 border border-border/20 overflow-x-auto max-h-48 font-mono">
                        {log.stack}
                      </pre>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground font-bold">Metadata</p>
                      <pre className="mt-1 bg-black/20 p-2 rounded border border-border/20 max-h-24 overflow-y-auto">
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-bold">Associations</p>
                      <p className="text-foreground"><span className="text-muted-foreground">User ID:</span> {log.userId || 'None'}</p>
                      <p className="text-foreground"><span className="text-muted-foreground">Booking ID:</span> {log.bookingId || 'None'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
