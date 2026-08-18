'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Check, X, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { BlogPost } from '@/lib/types';

export function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchPosts = async () => {
    try {
      const snap = await getDocs(collection(db, 'blog_posts'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
      list.sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime());
      setPosts(list);
    } catch (e: any) {
      toast.error('Failed to load posts: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreateNew = () => {
    setEditingPost({
      id: '',
      title: '',
      slug: '',
      body: '',
      excerpt: '',
      author: 'Anand Dev',
      category: 'Somatic Healing',
      cover: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
      published: false,
      published_at: new Date().toISOString().split('T')[0],
      reading_minutes: 5,
      tags: [],
    } as any);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading('Uploading image...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload error');
      const { url } = await res.json();
      setEditingPost((prev) => (prev ? { ...prev, cover: url } : null));
      toast.success('Image uploaded!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost?.title || !editingPost?.body) {
      toast.error('Title and Content are required.');
      return;
    }

    const toastId = toast.loading('Saving article...');
    try {
      const slug = editingPost.slug || editingPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const id = editingPost.id || slug;

      await setDoc(doc(db, 'blog_posts', id), {
        ...editingPost,
        id,
        slug,
      }, { merge: true });

      toast.success('Article saved successfully!', { id: toastId });
      setEditingPost(null);
      fetchPosts();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!await (window as any).customConfirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', id));
      toast.success('Article deleted.');
      fetchPosts();
    } catch (e) {
      toast.error('Failed to delete article.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Publish wisdom, research, and holistic insights to your readers.</p>
        </div>
        <Button onClick={handleCreateNew} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1">
          <Plus className="h-4 w-4" /> New Article
        </Button>
      </div>

      {editingPost ? (
        <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="font-display text-lg font-medium text-foreground">
              {editingPost.id ? 'Edit Article' : 'New Article Draft'}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setEditingPost(null)} className="rounded-full">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Article Title</Label>
              <Input
                value={editingPost.title || ''}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="e.g. Unpacking Family epigenetics"
              />
            </div>
            <div>
              <Label>Custom Slug</Label>
              <Input
                value={editingPost.slug || ''}
                onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                className="mt-1.5 rounded-xl"
                placeholder="Auto-generated if left empty"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Author Name</Label>
              <Input
                value={editingPost.author || ''}
                onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={editingPost.category || ''}
                onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Publish Date</Label>
              <Input
                type="date"
                value={editingPost.published_at || ''}
                onChange={(e) => setEditingPost({ ...editingPost, published_at: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label>Featured Image URL</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {editingPost.cover && (
                <img src={editingPost.cover} alt="Preview" className="h-12 w-20 rounded-lg object-cover border border-border" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="rounded-xl file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
              />
            </div>
          </div>

          <div>
            <Label>Excerpt / Summary</Label>
            <Textarea
              value={editingPost.excerpt || ''}
              onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[60px]"
              placeholder="Short SEO summary meta snippet..."
            />
          </div>

          <div>
            <Label>Body Content (HTML & Text)</Label>
            <Textarea
              value={editingPost.body || ''}
              onChange={(e) => setEditingPost({ ...editingPost, body: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[220px] font-mono text-xs"
              placeholder="Write your article in text or raw HTML here..."
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={editingPost.published === true}
                onChange={(e) => setEditingPost({ ...editingPost, published: e.target.checked })}
                className="rounded border-border text-gold focus:ring-gold"
              />
              Publish Article Immediately
            </label>
            <Button type="submit" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-8">
              Save Post
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <div key={p.id} className="rounded-3xl border border-border bg-card p-5 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between text-left space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {p.cover && (
                      <img src={p.cover} alt={p.title} className="h-10 w-16 rounded-lg object-cover border border-border shrink-0" />
                    )}
                    <div>
                      <h4 className="font-semibold text-foreground text-sm line-clamp-1">{p.title}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Category: {p.category} &middot; By {p.author}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase',
                    p.published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-warning/10 text-warning border border-warning/20'
                  )}>
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                  {p.body ? p.body.replace(/<[^>]*>/g, '').slice(0, 100) : ''}...
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border/20 mt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingPost(p)} className="rounded-full text-xs h-7 px-3">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="rounded-full text-xs h-7 px-3 hover:text-destructive hover:bg-destructive/10">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
