'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

type Comment = {
  id: string;
  name: string;
  body: string;
  created_at: string;
};

export function BlogComments({ postId, initial }: { postId: string; initial: Comment[] }) {
  const [comments, setComments] = useState(initial);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !body) {
      toast.error('Please add your name and a comment.');
      return;
    }
    setLoading(true);

    try {
      const docData = {
        post_id: postId,
        name,
        body,
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'blog_comments'), docData);

      setComments((c) => [{ id: docRef.id, ...docData }, ...c]);
      setName('');
      setBody('');
      toast.success('Thank you — your comment is live.');
    } catch (err) {
      console.error(err);
      toast.error('Could not post your comment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-display text-2xl font-medium text-foreground">Comments ({comments.length})</h3>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border/60 bg-card/50 p-6">
        <div>
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" required />
        </div>
        <div>
          <Label htmlFor="c-body">Comment</Label>
          <Textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1.5" required />
        </div>
        <Button type="submit" disabled={loading} className="rounded-full">
          {loading ? 'Posting…' : 'Post comment'}
        </Button>
      </form>

      <div className="mt-8 space-y-4">
        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
            Be the first to share a thought.
          </p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{c.name}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
