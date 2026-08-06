'use client';

import { useEffect, useState } from 'react';
import { Check, Inbox, Loader2, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  body: string;
  handled: boolean;
  created_at: string;
};

export function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = query(collection(db, 'messages'), orderBy('created_at', 'desc'), limit(50));
    getDocs(q)
      .then((snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message);
        setMessages(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching messages:', err);
        setLoading(false);
      });
  };
  useEffect(load, []);

  const markHandled = async (id: string) => {
    try {
      await setDoc(doc(db, 'messages', id), { handled: true }, { merge: true });
      load();
    } catch (error) {
      toast.error('Could not update.');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'messages', id));
      toast.success('Message deleted successfully.');
      load();
    } catch (error) {
      toast.error('Could not delete message.');
    }
  };

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…</p>;
  if (messages.length === 0)
    return (
      <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-display text-xl text-foreground">No messages yet</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:border-primary/20 hover:shadow-soft transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {m.handled ? (
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">Handled</span>
              ) : (
                <button onClick={() => markHandled(m.id)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-all">
                  <Check className="h-3 w-3" /> Mark handled
                </button>
              )}
              <button
                onClick={() => deleteMessage(m.id)}
                className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                title="Delete message"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {m.subject && <p className="mt-3 font-semibold text-foreground text-sm">{m.subject}</p>}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.body}</p>
          <p className="mt-3 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
