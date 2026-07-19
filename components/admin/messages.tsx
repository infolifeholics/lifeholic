'use client';

import { useEffect, useState } from 'react';
import { Check, Inbox, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
    supabase
      .from('messages')
      .select('id, name, email, subject, body, handled, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setMessages((data as Message[]) || []);
        setLoading(false);
      });
  };
  useEffect(load, []);

  const markHandled = async (id: string) => {
    const { error } = await supabase.from('messages').update({ handled: true }).eq('id', id);
    if (error) return toast.error('Could not update.');
    load();
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
        <div key={m.id} className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {m.handled ? (
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Handled</span>
              ) : (
                <button onClick={() => markHandled(m.id)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted">
                  <Check className="h-3 w-3" /> Mark handled
                </button>
              )}
            </div>
          </div>
          {m.subject && <p className="mt-3 font-medium text-foreground">{m.subject}</p>}
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
          <p className="mt-3 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
