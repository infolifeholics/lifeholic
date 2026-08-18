'use client';

import { useEffect, useState } from 'react';
import { Check, Inbox, Loader2, Trash2, Calendar, Mail, Phone, User, Eye, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

type CommunityApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  created_at: string;
  createdAt?: string;
  updatedAt?: string;
};

export function AdminCommunityApplications() {
  const [applications, setApplications] = useState<CommunityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<CommunityApplication | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'community_applications'), orderBy('created_at', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CommunityApplication);
      setApplications(list);
      setLoading(false);

      // Keep selectedApp details synchronized if it exists in the updated list
      setSelectedApp((prev) => {
        if (!prev) return null;
        const current = list.find((app) => app.id === prev.id);
        return current || null;
      });
    }, (err) => {
      console.error('Error listening to community applications:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: CommunityApplication['status']) => {
    try {
      await setDoc(doc(db, 'community_applications', id), { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success(`Application status updated to ${newStatus}.`);
    } catch (error) {
      toast.error('Could not update status.');
    }
  };

  const deleteApplication = async (id: string) => {
    if (!await (window as any).customConfirm('Are you sure you want to permanently delete this application?')) return;
    try {
      await deleteDoc(doc(db, 'community_applications', id));
      toast.success('Application deleted successfully.');
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp(null);
      }
    } catch (error) {
      toast.error('Could not delete application.');
    }
  };

  const getStatusColor = (status: CommunityApplication['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'reviewed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'accepted': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…</p>;
  if (applications.length === 0)
    return (
      <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-display text-xl text-foreground">No applications yet</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Applications List */}
        <div className="md:col-span-2 space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`rounded-2xl border p-5 cursor-pointer hover:border-primary/20 hover:shadow-soft transition-all duration-300 text-left ${
                selectedApp?.id === app.id
                  ? 'border-gold bg-gold/5 shadow-soft'
                  : 'border-border/60 bg-card/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{app.name}</p>
                  <p className="text-xs text-muted-foreground">{app.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">{app.message}</p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{new Date(app.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 text-gold">
                  <Eye className="h-3 w-3" /> View details
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Application Detail Panel */}
        <div className="rounded-3xl border border-border/60 bg-card/50 p-6 space-y-6 sticky top-8 h-fit text-left">
          {selectedApp ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{selectedApp.name}</h3>
                  <span className={`inline-block mt-2 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(selectedApp.status)}`}>
                    {selectedApp.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 border-y border-border/60 py-5">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <a href={`mailto:${selectedApp.email}`} className="hover:underline hover:text-foreground break-all">{selectedApp.email}</a>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <a href={`tel:${selectedApp.phone}`} className="hover:underline hover:text-foreground">{selectedApp.phone}</a>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <span>Submitted on {new Date(selectedApp.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Application Message</h4>
                <div className="bg-secondary/40 rounded-2xl p-4 border border-border/40 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {selectedApp.message}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Update Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'reviewed')}
                    className="px-3 py-2 text-xs font-medium border border-border rounded-xl hover:bg-secondary transition-colors"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'accepted')}
                    className="px-3 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'rejected')}
                    className="px-3 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'pending')}
                    className="px-3 py-2 text-xs font-medium border border-border rounded-xl hover:bg-secondary transition-colors"
                  >
                    Set Pending
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 flex justify-end">
                <button
                  onClick={() => deleteApplication(selectedApp.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Delete Application
                </button>
              </div>
            </>
          ) : (
            <div className="h-full py-20 text-center flex flex-col items-center justify-center text-muted-foreground">
              <User className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm">Select an application to view full details and take actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
