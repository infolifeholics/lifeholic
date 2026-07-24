'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Save, FileText, HelpCircle, PhoneCall, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CMSSection = {
  id: string;
  quote?: string;
  hero_title?: string;
  hero_subtitle?: string;
  about_text?: string;
  terms_text?: string;
  contact_phone?: string;
  contact_email?: string;
  footer_text?: string;
};

export function AdminCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CMSSection>({
    id: 'global',
    quote: 'Your quote here...',
    hero_title: 'Somatic Healing & Inner Transformation',
    hero_subtitle: 'A space for deep emotional release, integration, and conscious becoming.',
    about_text: 'Spiritual psychology and holistic healing.',
    terms_text: 'Terms and conditions...',
    contact_phone: '+91 98765 43210',
    contact_email: 'info@thelifeholics.com',
    footer_text: '© 2026 TheLifeHolics. All rights reserved.',
  });

  const fetchCMS = async () => {
    try {
      const snap = await getDocs(collection(db, 'cms'));
      const globalDoc = snap.docs.find((d) => d.id === 'global');
      if (globalDoc) {
        setData({ id: 'global', ...globalDoc.data() } as CMSSection);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCMS();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving CMS content...');
    try {
      await setDoc(doc(db, 'cms', 'global'), data, { merge: true });
      toast.success('CMS content saved successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save CMS: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
      <div className="flex justify-between items-center pb-3 border-b border-border/40">
        <div>
          <h3 className="font-display text-lg font-medium text-foreground">Content Management System (CMS)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Edit copy and contact details visible across the website dynamically.</p>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 px-6">
          <Save className="h-4 w-4" /> Save Content
        </Button>
      </div>

      <div className="space-y-4">
        {/* Hero Copy */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4 text-gold" /> Hero Copy Details
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Hero Main Title</Label>
              <Input
                value={data.hero_title || ''}
                onChange={(e) => setData({ ...data, hero_title: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Hero Subtitle</Label>
              <Input
                value={data.hero_subtitle || ''}
                onChange={(e) => setData({ ...data, hero_subtitle: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Quotes & About */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-gold" /> Page Copy (Quote & About)
          </h4>
          <div>
            <Label>Daily Quote Banner</Label>
            <Textarea
              value={data.quote || ''}
              onChange={(e) => setData({ ...data, quote: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[60px]"
            />
          </div>
          <div>
            <Label>About Us Copy</Label>
            <Textarea
              value={data.about_text || ''}
              onChange={(e) => setData({ ...data, about_text: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[100px]"
            />
          </div>
        </div>

        {/* Contact and footer */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <PhoneCall className="h-4 w-4 text-gold" /> Contact & Footer Details
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Support Phone Number</Label>
              <Input
                value={data.contact_phone || ''}
                onChange={(e) => setData({ ...data, contact_phone: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input
                value={data.contact_email || ''}
                onChange={(e) => setData({ ...data, contact_email: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
          <div>
            <Label>Footer Copy text</Label>
            <Input
              value={data.footer_text || ''}
              onChange={(e) => setData({ ...data, footer_text: e.target.value })}
              className="mt-1.5 rounded-xl"
            />
          </div>
        </div>

        {/* Policies */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-gold" /> Legal & Cancellation Terms
          </h4>
          <div>
            <Label>Terms and Conditions Details</Label>
            <Textarea
              value={data.terms_text || ''}
              onChange={(e) => setData({ ...data, terms_text: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[120px]"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
