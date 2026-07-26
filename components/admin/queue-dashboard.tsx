'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, orderBy, limit, getDocs,
  where, startAfter, QueryDocumentSnapshot, DocumentData
} from 'firebase/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  Search, Trash2, RotateCcw, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Zap, BarChart3, FileWarning, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatInTz } from '@/lib/format';

type LogEntry = {
  id: string;
  jobId: string;
  notificationType: string;
  channel: string;
  provider: string;
  recipient: string;
  deliveryStatus: 'pending' | 'processing' | 'delivered' | 'failed';
  retryCount: number;
  createdAt: string;
  completedAt?: string;
  processingMs?: number;
  errorMessage?: string;
  userId?: string;
  bookingId?: string;
};

type DLQEntry = {
  id: string;
  jobId: string;
  notificationType: string;
  channel: string;
  failureReason: string;
  retryCount: number;
  failedAt: string;
  payload: any;
};

type HealthData = {
  queueStatus: string;
  workerStatus: string;
  stats: { delivered: number; failed: number; pending: number; dlqCount: number };
  performance: { avgProcessingMs: number; lastSuccessAt: string | null; sampleSize: number };
};

const STATUS_COLORS: Record<string, string> = {
  delivered: 'text-emerald-400 bg-emerald-400/10',
  failed: 'text-red-400 bg-red-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
};

const PAGE_SIZE = 25;

export function AdminQueueDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'logs' | 'dlq' | 'health'>('health');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<'all' | 'delivered' | 'failed' | 'pending'>('all');
  const [logsSearch, setLogsSearch] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [logPage, setLogPage] = useState(1);

  // DLQ state
  const [dlqEntries, setDlqEntries] = useState<DLQEntry[]>([]);
  const [dlqLoading, setDlqLoading] = useState(false);
  const [dlqSearch, setDlqSearch] = useState('');
  const [expandedDLQ, setExpandedDLQ] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getAuthHeader = useCallback(async () => {
    const token = await user?.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  // ── Health ────────────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/queue/health', { headers });
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      toast.error('Failed to load queue health');
    } finally {
      setHealthLoading(false);
    }
  }, [getAuthHeader]);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (afterDoc?: QueryDocumentSnapshot<DocumentData> | null) => {
    setLogsLoading(true);
    try {
      let q = query(collection(db, 'notification_logs'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      if (logsFilter !== 'all') {
        q = query(collection(db, 'notification_logs'), where('deliveryStatus', '==', logsFilter), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      }
      if (afterDoc) q = query(q, startAfter(afterDoc));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry));
      setLogs(items);
      setLastDoc(snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      toast.error('Failed to load notification logs');
    } finally {
      setLogsLoading(false);
    }
  }, [logsFilter]);

  // ── DLQ ──────────────────────────────────────────────────────────────────
  const fetchDLQ = useCallback(async () => {
    setDlqLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'failed_notifications'), orderBy('failedAt', 'desc'), limit(100)));
      setDlqEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DLQEntry)));
    } catch (e) {
      toast.error('Failed to load DLQ entries');
    } finally {
      setDlqLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(); }, [activeTab, logsFilter, fetchLogs]);
  useEffect(() => { if (activeTab === 'dlq') fetchDLQ(); }, [activeTab, fetchDLQ]);

  // ── DLQ Actions ──────────────────────────────────────────────────────────
  const handleRetry = async (dlqId: string) => {
    setRetryingId(dlqId);
    try {
      const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/queue/retry', { method: 'POST', headers, body: JSON.stringify({ dlqId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Job re-queued successfully!');
      fetchDLQ();
      fetchHealth();
    } catch (e: any) {
      toast.error(e.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (dlqId: string) => {
    setDeletingId(dlqId);
    try {
      const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/queue/delete', { method: 'DELETE', headers, body: JSON.stringify({ dlqId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('DLQ entry deleted.');
      setDlqEntries((prev) => prev.filter((e) => e.id !== dlqId));
      fetchHealth();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredLogs = logs.filter((l) =>
    !logsSearch || l.recipient?.includes(logsSearch) || l.notificationType?.includes(logsSearch) || l.jobId?.includes(logsSearch)
  );
  const filteredDLQ = dlqEntries.filter((e) =>
    !dlqSearch || e.jobId?.includes(dlqSearch) || e.notificationType?.includes(dlqSearch) || e.failureReason?.includes(dlqSearch)
  );

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex gap-4 border-b border-border/40 pb-2">
        {([
          { key: 'health', label: 'Queue Health', icon: Activity },
          { key: 'logs', label: 'Notification Logs', icon: BarChart3 },
          { key: 'dlq', label: `Dead Letter Queue${health?.stats?.dlqCount ? ` (${health.stats.dlqCount})` : ''}`, icon: FileWarning },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 pb-2 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all',
              activeTab === key ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <button
          onClick={() => { fetchHealth(); if (activeTab === 'logs') fetchLogs(); if (activeTab === 'dlq') fetchDLQ(); }}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* ── HEALTH TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          {/* Status Banner */}
          <div className={cn(
            'flex items-center gap-3 rounded-2xl border px-5 py-3',
            health?.queueStatus === 'connected'
              ? 'border-emerald-500/30 bg-emerald-950/20'
              : 'border-amber-500/30 bg-amber-950/20'
          )}>
            {health?.queueStatus === 'connected'
              ? <Wifi className="h-5 w-5 text-emerald-400" />
              : <WifiOff className="h-5 w-5 text-amber-400" />}
            <div>
              <p className="text-sm font-semibold text-foreground">
                Queue: {health?.queueStatus === 'connected' ? 'Upstash QStash — Connected' : 'Inline Fallback Mode (QStash not configured)'}
              </p>
              <p className="text-xs text-muted-foreground">Worker: {health?.workerStatus || 'Loading...'}</p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Delivered', value: health?.stats?.delivered ?? '—', icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Failed (logged)', value: health?.stats?.failed ?? '—', icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Pending', value: health?.stats?.pending ?? '—', icon: Clock, color: 'text-amber-400' },
              { label: 'Dead Letter Queue', value: health?.stats?.dlqCount ?? '—', icon: FileWarning, color: 'text-rose-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-border/40 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <p className="text-2xl font-bold text-foreground">{healthLoading ? '...' : value}</p>
              </div>
            ))}
          </div>

          {/* Performance */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-soft">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Zap className="h-4 w-4 text-gold" /> Performance Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Avg Processing Time</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {healthLoading ? '—' : health?.performance?.avgProcessingMs ? `${health.performance.avgProcessingMs}ms` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Successful Delivery</p>
                <p className="font-semibold text-foreground mt-0.5 text-xs">
                  {healthLoading ? '—' : health?.performance?.lastSuccessAt
                    ? new Date(health.performance.lastSuccessAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    : 'None yet'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sample Size</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {healthLoading ? '—' : `${health?.performance?.sampleSize ?? 0} jobs`}
                </p>
              </div>
            </div>
          </div>

          {/* Setup guide if not connected */}
          {!healthLoading && health?.queueStatus !== 'connected' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-400">⚡ To enable Upstash QStash (Production Queue)</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <strong>console.upstash.com</strong> → Create a QStash account</li>
                <li>Copy <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">QSTASH_TOKEN</code>, <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">QSTASH_CURRENT_SIGNING_KEY</code>, and <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">QSTASH_NEXT_SIGNING_KEY</code></li>
                <li>Set <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">QSTASH_WORKER_URL=https://yourdomain.com/api/queue/worker</code></li>
                <li>Add all variables to your <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">.env</code> file and Vercel dashboard</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── LOGS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search recipient, type, job ID..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="pl-9 text-xs h-8"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(['all', 'delivered', 'failed', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setLogsFilter(f); setLogPage(1); setLastDoc(null); }}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium capitalize transition-all',
                    logsFilter === f ? 'bg-gold text-gold-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/40">
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Channel</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Recipient</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Retries</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Processing</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {logsLoading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading logs...</td></tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No notification logs found.</td></tr>
                  ) : filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 capitalize font-medium">{log.notificationType?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{log.channel}</td>
                      <td className="px-4 py-2.5 text-muted-foreground truncate max-w-32">{log.recipient}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize', STATUS_COLORS[log.deliveryStatus])}>
                          {log.deliveryStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">{log.retryCount ?? 0}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{log.processingMs ? `${log.processingMs}ms` : '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-secondary/20">
              <p className="text-[10px] text-muted-foreground">Page {logPage} · Showing {filteredLogs.length} entries</p>
              <div className="flex gap-2">
                <button
                  disabled={logPage <= 1}
                  onClick={() => { setLogPage((p) => p - 1); fetchLogs(); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => { setLogPage((p) => p + 1); fetchLogs(lastDoc); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DLQ TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'dlq' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search job ID, type, error..."
                value={dlqSearch}
                onChange={(e) => setDlqSearch(e.target.value)}
                className="pl-9 text-xs h-8"
              />
            </div>
            <Button onClick={fetchDLQ} variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>

          {dlqLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading dead letter queue...</div>
          ) : filteredDLQ.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Dead Letter Queue is empty</p>
              <p className="text-xs text-muted-foreground mt-1">All notification jobs are processing normally.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDLQ.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-red-500/20 bg-card shadow-soft overflow-hidden">
                  <div
                    className="flex items-start justify-between gap-4 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setExpandedDLQ(expandedDLQ === entry.id ? null : entry.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold capitalize text-foreground">
                          {entry.notificationType?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">
                          {entry.channel} · {entry.retryCount} retries
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Job: {entry.jobId}
                      </p>
                      <p className="text-[10px] text-red-400 mt-0.5 truncate">
                        Error: {entry.failureReason}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleRetry(entry.id); }}
                        disabled={retryingId === entry.id}
                        className="h-7 px-3 text-[10px] rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        {retryingId === entry.id ? 'Retrying...' : 'Retry'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                        disabled={deletingId === entry.id}
                        className="h-7 px-3 text-[10px] rounded-full border-red-500/40 text-red-400 hover:bg-red-950/30 gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                  {expandedDLQ === entry.id && (
                    <div className="border-t border-border/30 px-4 pb-3 pt-2 bg-secondary/10">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Full Payload</p>
                      <pre className="text-[10px] text-foreground/80 bg-card rounded-xl p-3 overflow-x-auto border border-border/30 max-h-48">
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Failed at: {entry.failedAt ? new Date(entry.failedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
