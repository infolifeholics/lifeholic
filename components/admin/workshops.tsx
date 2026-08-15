'use client';

import { useEffect, useState } from 'react';
import seedData from '@/lib/seed-data.json';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { 
  Loader2, Plus, Edit2, Trash2, Check, X, Calendar, Clock, MapPin, 
  Users, Ticket, Copy, Eye, FileSpreadsheet, Send, ShieldAlert, 
  Sparkles, CheckCircle2, DollarSign, Award, FileText, Image as ImageIcon, Star, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Workshop, Speaker, AgendaItem, WorkshopRegistration, WorkshopFeedback } from '@/lib/types';
import { ImageCropperModal } from './image-cropper-modal';

export function AdminWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [feedbacks, setFeedbacks] = useState<WorkshopFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [viewingRegs, setViewingRegs] = useState<string | null>(null);

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string>('');
  const [cropperTarget, setCropperTarget] = useState<'image' | 'thumbnail' | 'gallery' | 'resources' | 'videos'>('image');
  const [cropperAspect, setCropperAspect] = useState<number>(16/9);

  const handleFileSelect = (file: File, target: 'image' | 'thumbnail' | 'gallery' | 'resources' | 'videos') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      handleUploadFile(file, target);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropperSrc(reader.result as string);
      setCropperTarget(target);
      // Banner: 21:7 (wide cinematic), Thumbnail: 4:3, Gallery: free
      if (target === 'image') {
        setCropperAspect(21 / 7);
      } else if (target === 'thumbnail') {
        setCropperAspect(4 / 3);
      } else {
        setCropperAspect(NaN); // free aspect
      }
      setCropperOpen(true);
    });
    reader.readAsDataURL(file);
  };

  const handleMigrateWorkshops = async () => {
    if (migrating) return;
    setMigrating(true);
    const toastId = toast.loading('Migrating seed workshops to Firestore...');
    try {
      const defaults = (seedData as any).workshops || [];
      let migratedCount = 0;
      for (const item of defaults) {
        const exists = workshops.some((w) => w.id === item.id || w.slug === item.slug);
        if (!exists) {
          await setDoc(doc(db, 'workshops', item.id), {
            ...item,
            end_date: item.end_date || item.date || new Date().toISOString().split('T')[0],
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          migratedCount++;
        }
      }
      toast.success(`Successfully migrated ${migratedCount} workshops!`, { id: toastId });
    } catch (err: any) {
      toast.error('Migration failed: ' + err.message, { id: toastId });
    } finally {
      setMigrating(false);
    }
  };
  
  // Attendee view filters
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'excused'>('all');
  const [subView, setSubView] = useState<'attendees' | 'certificates'>('attendees');

  // Workshop Form States
  const [editingWs, setEditingWs] = useState<Partial<Workshop> | null>(null);

  // Sub-lists inputs helpers
  const [speakerForm, setSpeakerForm] = useState<Speaker>({ 
    name: '', role: '', bio: '', image: '', expertise: '',
    socials: { linkedin: '', instagram: '', facebook: '', twitter: '', website: '', youtube: '' } 
  });
  const [agendaForm, setAgendaForm] = useState<AgendaItem>({ time: '', title: '', description: '' });
  const [benefitInput, setBenefitInput] = useState('');
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [resourceForm, setResourceForm] = useState({ name: '', url: '', type: 'pdf' });
  const [galleryUrl, setGalleryUrl] = useState('');

  const fetchAllData = async () => {
    // Real-time listener for workshops
    const unsubWs = onSnapshot(collection(db, 'workshops'), (snap) => {
      setWorkshops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workshop));
    });

    // Real-time listener for registrations
    const unsubRegs = onSnapshot(collection(db, 'workshopRegistrations'), (snap) => {
      setRegistrations(snap.docs.map((d) => d.data() as WorkshopRegistration));
    });

    // Real-time listener for feedback reviews
    const unsubFeed = onSnapshot(collection(db, 'workshopFeedback'), (snap) => {
      setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkshopFeedback));
    });

    setLoading(false);
    return () => {
      unsubWs();
      unsubRegs();
      unsubFeed();
    };
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateNew = () => {
    setEditingWs({
      id: '',
      title: '',
      slug: '',
      short_description: '',
      description: '',
      category: 'Healing',
      tags: [],
      type: 'online',
      language: 'English',
      duration: '2 Hours',
      date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '12:00',
      timezone: 'Asia/Kolkata',
      venue_name: 'Online Zoom',
      address: '',
      google_maps_link: '',
      seats_total: 50,
      seats_booked: 0,
      registration_start: new Date().toISOString().split('T')[0],
      registration_end: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      price_inr: 999,
      price_usd: 19,
      early_bird_price_inr: 499,
      early_bird_price_usd: 9,
      offer_expiry: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      featured: false,
      image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
      thumbnail: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=600',
      gallery: [],
      videos: [],
      resources: [],
      speakers: [],
      agenda: [],
      benefits: [],
      faqs: [],
      meeting_link: '',
      publish_as_blog: false,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWs?.title || !editingWs?.description) {
      toast.error('Title and Description are required.');
      return;
    }

    const toastId = toast.loading('Saving workshop...');
    try {
      const slug = editingWs.slug || editingWs.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const id = editingWs.id || 'ws_' + Math.random().toString(36).substring(7).toUpperCase();

      const finalWs = {
        ...editingWs,
        id,
        slug,
        type: 'online',
      };

      const cleanedWs = JSON.parse(JSON.stringify(finalWs, (key, value) => {
        return value === undefined ? null : value;
      }));

      await setDoc(doc(db, 'workshops', id), cleanedWs, { merge: true });

      // Auto-sync blog
      if (editingWs.publish_as_blog) {
        const blogId = 'blog_ws_' + id;
        await setDoc(doc(db, 'blog_posts', blogId), {
          id: blogId,
          slug: slug,
          title: editingWs.title,
          excerpt: editingWs.short_description || '',
          body: editingWs.description,
          cover: editingWs.image || null,
          category: 'Workshops',
          published: editingWs.status === 'published',
          published_at: new Date().toISOString().split('T')[0],
          author: 'Anand Dev',
          reading_minutes: 5,
          tags: editingWs.tags || [],
        }, { merge: true });
      }

      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      toast.success('Workshop saved successfully!', { id: toastId });
      setEditingWs(null);
      fetchAllData();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message, { id: toastId });
    }
  };

  const handleDuplicate = async (w: Workshop) => {
    const toastId = toast.loading('Duplicating workshop...');
    try {
      const id = 'ws_' + Math.random().toString(36).substring(7).toUpperCase();
      const dup = {
        ...w,
        id,
        title: `${w.title} (Copy)`,
        slug: `${w.slug}-copy`,
        seats_booked: 0,
        status: 'draft',
      };
      await setDoc(doc(db, 'workshops', id), dup);
      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      toast.success('Workshop duplicated!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to duplicate: ' + err.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workshop and clean up all media permanently?')) return;
    const toastId = toast.loading('Deleting workshop and purging Cloudinary files...');
    try {
      const matchWs = workshops.find(w => w.id === id);
      if (matchWs) {
        // Delete cover image
        if (matchWs.image && matchWs.image.includes('cloudinary.com')) {
          await fetch('/api/upload/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: matchWs.image }) });
        }
        // Delete thumbnail
        if (matchWs.thumbnail && matchWs.thumbnail.includes('cloudinary.com')) {
          await fetch('/api/upload/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: matchWs.thumbnail }) });
        }
        // Delete gallery
        if (matchWs.gallery) {
          for (const item of matchWs.gallery) {
            const url = typeof item === 'string' ? item : (item as any).url;
            if (url && url.includes('cloudinary.com')) {
              await fetch('/api/upload/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            }
          }
        }
      }

      await deleteDoc(doc(db, 'workshops', id));
      await fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      toast.success('Workshop and associated media purged successfully!', { id: toastId });
    } catch (e) {
      toast.error('Failed to fully delete workshop and media.', { id: toastId });
    }
  };

  const handleExportCSV = (wsId: string) => {
    const list = registrations.filter(r => r.workshop_id === wsId);
    if (list.length === 0) {
      toast.error('No registrations to export.');
      return;
    }
    const headers = ['Booking ID', 'Name', 'Email', 'Phone', 'WhatsApp', 'City', 'Country', 'Payment', 'Status', 'Attendance', 'Date'];
    const rows = list.map(r => [
      r.id,
      r.client_name,
      r.client_email,
      `'${r.client_phone}`,
      `'${r.client_whatsapp}`,
      r.city,
      r.country,
      r.payment_status,
      r.status,
      r.attendance || 'absent',
      new Date(r.created_at).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registrations_${wsId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLS = (wsId: string) => {
    const list = registrations.filter(r => r.workshop_id === wsId);
    if (list.length === 0) {
      toast.error('No registrations to export.');
      return;
    }
    const headers = ['Booking ID', 'Name', 'Email', 'Phone', 'WhatsApp', 'City', 'Country', 'Payment', 'Status', 'Attendance', 'Date'];
    const rows = list.map(r => [
      r.id,
      r.client_name,
      r.client_email,
      r.client_phone,
      r.client_whatsapp,
      r.city,
      r.country,
      r.payment_status,
      r.status,
      r.attendance || 'absent',
      new Date(r.created_at).toLocaleDateString()
    ]);

    const tabDelimited = [headers.join('\t'), ...rows.map(e => e.join('\t'))].join('\n');
    const blob = new Blob([tabDelimited], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registrations_${wsId}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = (wsId: string) => {
    const list = registrations.filter(r => r.workshop_id === wsId);
    if (list.length === 0) {
      toast.error('No data to print.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Registrations Report - ${wsId}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; }
            h2 { color: #d4af37; }
          </style>
        </head>
        <body>
          <h2>Workshop Registrations Report - ${wsId}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(r => `
                <tr>
                  <td>${r.client_name}</td>
                  <td>${r.client_email}</td>
                  <td>${r.client_phone}</td>
                  <td>${r.payment_status}</td>
                  <td>${r.status}</td>
                  <td>${r.attendance || 'absent'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSendReminder = async (reg: WorkshopRegistration) => {
    const toastId = toast.loading(`Sending reminder notifications to ${reg.client_name}...`);
    try {
      const res = await fetch('/api/workshops/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: reg.id }),
      });
      if (!res.ok) throw new Error('Reminder failed');
      toast.success(`Reminder sent to ${reg.client_name}!`, { id: toastId });
    } catch {
      toast.error('Failed to send reminder.', { id: toastId });
    }
  };

  const handleToggleStatus = async (w: Workshop, nextStatus: any) => {
    try {
      await setDoc(doc(db, 'workshops', w.id), { status: nextStatus }, { merge: true });
      if (w.publish_as_blog) {
        const blogId = 'blog_ws_' + w.id;
        await setDoc(doc(db, 'blog_posts', blogId), { published: nextStatus === 'published' }, { merge: true });
      }
      toast.success(`Workshop status set to ${nextStatus}.`);
    } catch (e) {
      toast.error('Failed to update status.');
    }
  };

  const uploadToCloudinaryDirect = async (file: File, isVideoOrAudio: boolean) => {
    const signRes = await fetch('/api/upload/sign', { method: 'POST' });
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate upload signature');
    }
    const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json();

    const resourceType = isVideoOrAudio ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadRes = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Direct Cloudinary upload failed');
    }

    const data = await uploadRes.json();
    return {
      url: data.secure_url,
      public_id: data.public_id,
    };
  };

  const handleUploadFile = async (file: File, target: 'image' | 'thumbnail' | 'gallery' | 'resources' | 'videos') => {
    const toastId = toast.loading(`Uploading file to Cloudinary...`);
    try {
      const isVideo = file.type.startsWith('video/') || target === 'videos';
      const { url } = await uploadToCloudinaryDirect(file, isVideo);
      
      const meta = {
        secure_url: url,
        public_id: url.split('/').pop()?.split('.')[0] || 'id_' + Math.random().toString(36).substring(7),
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
      };

      const cacheBustedUrl = `${url}?v=${Date.now()}`;

      if (target === 'image') {
        setEditingWs((prev) => ({ ...prev, image: cacheBustedUrl }));
      } else if (target === 'thumbnail') {
        setEditingWs((prev) => ({ ...prev, thumbnail: cacheBustedUrl }));
      } else if (target === 'gallery') {
        const cur = editingWs?.gallery || [];
        const itemObj = { url: cacheBustedUrl, caption: '', alt: '', is_featured: false };
        setEditingWs((prev) => ({ ...prev, gallery: [...cur, itemObj as any] }));
      } else if (target === 'videos') {
        const cur = editingWs?.videos || [];
        setEditingWs((prev) => ({ ...prev, videos: [...cur, url] }));
      }
      toast.success('File uploaded successfully!', { id: toastId });
    } catch (e: any) {
      toast.error('Upload failed: ' + e.message, { id: toastId });
    }
  };

  // Feedback moderation helpers
  const handleApproveFeedback = async (f: WorkshopFeedback, approve: boolean) => {
    try {
      await setDoc(doc(db, 'workshopFeedback', f.id), { approved: approve }, { merge: true });
      toast.success(approve ? 'Feedback approved!' : 'Feedback hidden.');
    } catch {
      toast.error('Failed to moderate feedback.');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback review permanently?')) return;
    try {
      await deleteDoc(doc(db, 'workshopFeedback', id));
      toast.success('Feedback deleted.');
    } catch {
      toast.error('Failed to delete.');
    }
  };

  // Speakers Form Helpers
  const addSpeaker = () => {
    if (!speakerForm.name) return;
    const current = editingWs?.speakers || [];
    setEditingWs({ ...editingWs, speakers: [...current, speakerForm] });
    setSpeakerForm({ 
      name: '', role: '', bio: '', image: '', expertise: '',
      socials: { linkedin: '', instagram: '', facebook: '', twitter: '', website: '', youtube: '' }
    });
  };

  const addAgendaItem = () => {
    if (!agendaForm.title || !agendaForm.time) return;
    const current = editingWs?.agenda || [];
    setEditingWs({ ...editingWs, agenda: [...current, agendaForm] });
    setAgendaForm({ time: '', title: '', description: '' });
  };

  const addFaq = () => {
    if (!faqForm.question || !faqForm.answer) return;
    const current = editingWs?.faqs || [];
    setEditingWs({ ...editingWs, faqs: [...current, faqForm] });
    setFaqForm({ question: '', answer: '' });
  };

  const addResource = () => {
    if (!resourceForm.name || !resourceForm.url) return;
    const current = editingWs?.resources || [];
    setEditingWs({ ...editingWs, resources: [...current, resourceForm] });
    setResourceForm({ name: '', url: '', type: 'pdf' });
  };

  const handleCertificateUpload = async (reg: WorkshopRegistration, url: string) => {
    const toastId = toast.loading('Uploading certificate and notifying user...');
    try {
      const res = await fetch('/api/workshops/certificate-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: reg.id,
          certificate_url: url
        }),
      });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Certificate uploaded and notifications sent!', { id: toastId });
    } catch {
      toast.error('Failed to assign certificate.', { id: toastId });
    }
  };

  // Generate automated Certificate
  const handleGenerateCertificate = async (r: WorkshopRegistration) => {
    const toastId = toast.loading('Generating somatic certificate pass...');
    try {
      const res = await fetch('/api/workshops/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: r.id,
          force_regenerate: true
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      toast.success(`Certificate ${data.cert_number} created successfully and user notified!`, { id: toastId });
    } catch {
      toast.error('Failed to generate certificate.', { id: toastId });
    }
  };

  // Analytics calculator
  const totalRevenue = registrations.filter(r => r.payment_status === 'paid').reduce((acc, cur) => acc + cur.amount, 0);
  const seatsOccupied = registrations.filter(r => r.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      
      {/* 1. Analytics Cards */}
      {!editingWs && !viewingRegs && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Workshops</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{workshops.length}</h3>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed Attendees</p>
              <h3 className="text-2xl font-bold mt-1 text-gold flex items-center gap-1">
                <Users className="h-5 w-5" /> {seatsOccupied}
              </h3>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground flex items-center">
                <DollarSign className="h-5 w-5 text-success shrink-0" /> {totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Gatherings</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {workshops.filter(w => w.status === 'published').length}
              </h3>
            </div>
          </div>

          {/* Detailed Somatic Analytics dashboard row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft space-y-3">
              <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-gold" /> Somatic Gatherings Conversion Rates
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="block text-lg font-bold text-foreground">87.4%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cancellation Rate</span>
                  <span className="block text-lg font-bold text-destructive">2.1%</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft space-y-3">
              <h4 className="font-display text-sm font-semibold text-foreground">Monthly Occupancy Index</h4>
              <div className="flex items-end h-12 gap-2 pt-2">
                {[45, 60, 80, 95, 75, 90].map((v, i) => (
                  <div key={i} className="flex-1 bg-secondary rounded-t relative group" style={{ height: `${v}%` }}>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-[8px] rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{v}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Manage schedules, pricing, venues, speaker profiles, and agenda items.</p>
        </div>
        {!editingWs && !viewingRegs && (
          <div className="flex gap-2">
            {workshops.length === 0 && (
              <Button onClick={handleMigrateWorkshops} disabled={migrating} variant="outline" className="rounded-full gap-1 border-gold/30 text-gold hover:bg-gold/10">
                {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Migrate Seed Workshops
              </Button>
            )}
            <Button onClick={handleCreateNew} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1">
              <Plus className="h-4 w-4" /> Create Workshop
            </Button>
          </div>
        )}
      </div>

      {/* Workshop Editing Form */}
      {editingWs && (
        <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left shadow-soft">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="font-display text-lg font-medium text-foreground">
              {editingWs.id ? 'Edit Workshop' : 'Create New Workshop'}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setEditingWs(null)} className="rounded-full">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Workshop Title</Label>
              <Input
                value={editingWs.title || ''}
                onChange={(e) => setEditingWs({ ...editingWs, title: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Custom Slug</Label>
              <Input
                value={editingWs.slug || ''}
                onChange={(e) => setEditingWs({ ...editingWs, slug: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Category</Label>
              <Input
                value={editingWs.category || ''}
                onChange={(e) => setEditingWs({ ...editingWs, category: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value="online"
                disabled
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold cursor-not-allowed opacity-80"
              >
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <Label>Language</Label>
              <Input
                value={editingWs.language || 'English'}
                onChange={(e) => setEditingWs({ ...editingWs, language: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Input
                value={editingWs.duration || ''}
                onChange={(e) => setEditingWs({ ...editingWs, duration: e.target.value })}
                placeholder="e.g. 2 Hours, 2 Days"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Location / City (Display fallback)</Label>
              <Input
                value={editingWs.location || ''}
                onChange={(e) => setEditingWs({ ...editingWs, location: e.target.value })}
                placeholder="e.g. Online, Mumbai"
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          {/* Cloudinary media selection */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Cloudinary Media Assets &amp; Gallery
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Cover Banner File</Label>
                 <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'image')}
                  className="mt-1 file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
                />
                {editingWs.image && (
                  <div className="mt-2 space-y-1">
                    {/* Banner preview: 21:7 ratio */}
                    <div className="relative w-full aspect-[21/7] max-w-xs rounded-xl overflow-hidden border border-border bg-card">
                      <img src={editingWs.image} alt="Cover Preview" className="h-full w-full object-cover" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">Current: {editingWs.image}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Thumbnail File</Label>
                 <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'thumbnail')}
                  className="mt-1 file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
                />
                {editingWs.thumbnail && (
                  <div className="mt-2 space-y-1">
                    {/* Thumbnail preview: 4:3 ratio */}
                    <div className="relative w-32 aspect-[4/3] rounded-xl overflow-hidden border border-border bg-card">
                      <img src={editingWs.thumbnail} alt="Thumbnail Preview" className="h-full w-full object-cover" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">Current: {editingWs.thumbnail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Uploads */}
            <div>
              <Label>Upload to Gallery</Label>
               <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'gallery')}
                className="mt-1.5 file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
              />
              {editingWs.gallery && editingWs.gallery.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                  {editingWs.gallery.map((item, idx) => {
                    const url = typeof item === 'string' ? item : (item as any).url;
                    const caption = typeof item === 'string' ? '' : (item as any).caption || '';
                    const alt = typeof item === 'string' ? '' : (item as any).alt || '';
                    const isFeatured = typeof item === 'string' ? false : (item as any).is_featured || false;

                    const updateItem = (field: string, val: any) => {
                      const next = [...(editingWs.gallery || [])];
                      const curObj = typeof next[idx] === 'string' ? { url: next[idx] as string } : { ...(next[idx] as any) };
                      curObj[field] = val;
                      next[idx] = curObj as any;
                      setEditingWs({ ...editingWs, gallery: next });
                    };

                    const moveItem = (dir: 'up' | 'down') => {
                      const next = [...(editingWs.gallery || [])];
                      if (dir === 'up' && idx > 0) {
                        const temp = next[idx];
                        next[idx] = next[idx - 1];
                        next[idx - 1] = temp;
                      } else if (dir === 'down' && idx < next.length - 1) {
                        const temp = next[idx];
                        next[idx] = next[idx + 1];
                        next[idx + 1] = temp;
                      }
                      setEditingWs({ ...editingWs, gallery: next });
                    };

                    return (
                      <div key={idx} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 relative text-left">
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-border">
                          <img src={url} alt={alt || "Gallery Preview"} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(editingWs.gallery || [])];
                              next.splice(idx, 1);
                              setEditingWs({ ...editingWs, gallery: next });
                            }}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full h-5 w-5 text-xs flex items-center justify-center font-bold"
                          >
                            &times;
                          </button>
                        </div>
                        
                        <div className="space-y-1 text-[10px]">
                          <Input
                            placeholder="Caption"
                            value={caption}
                            onChange={(e) => updateItem('caption', e.target.value)}
                            className="h-6 text-[10px] rounded-lg"
                          />
                          <Input
                            placeholder="Alt text"
                            value={alt}
                            onChange={(e) => updateItem('alt', e.target.value)}
                            className="h-6 text-[10px] rounded-lg"
                          />
                          <div className="flex justify-between items-center pt-1">
                            <label className="flex items-center gap-1 cursor-pointer font-semibold text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={isFeatured}
                                onChange={(e) => updateItem('is_featured', e.target.checked)}
                                className="rounded border-border text-gold focus:ring-gold h-3 w-3"
                              />
                              Cover
                            </label>
                            <div className="flex gap-1">
                              {idx > 0 && <button type="button" onClick={() => moveItem('up')} className="px-1 bg-secondary rounded text-[9px]">▲</button>}
                              {idx < (editingWs.gallery?.length || 0) - 1 && <button type="button" onClick={() => moveItem('down')} className="px-1 bg-secondary rounded text-[9px]">▼</button>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Videos management */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider flex items-center gap-1.5">
              <Play className="h-4 w-4" /> Workshop Video Clips &amp; Promos
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Upload Video File (Cloudinary)</Label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0], 'videos')}
                  className="mt-1 file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
                />
              </div>
              <div>
                <Label>Add YouTube / Vimeo URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    placeholder="https://youtube.com/watch?v=..." 
                    id="youtube-url-input"
                    className="h-9 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('youtube-url-input') as HTMLInputElement;
                      if (el && el.value) {
                        const cur = editingWs.videos || [];
                        setEditingWs((prev) => ({ ...prev, videos: [...cur, el.value] }));
                        el.value = '';
                        toast.success('Video URL added.');
                      }
                    }}
                    className="rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground h-9"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {editingWs.videos && editingWs.videos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {editingWs.videos.map((url, idx) => (
                  <span key={idx} className="bg-secondary px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 max-w-full">
                    <span className="truncate">{url}</span>
                    <button type="button" onClick={() => {
                      const next = [...(editingWs.videos || [])];
                      next.splice(idx, 1);
                      setEditingWs({ ...editingWs, videos: next });
                    }} className="text-destructive font-bold">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Meeting Join Link (Online)</Label>
              <Input
                value={editingWs.meeting_link || ''}
                onChange={(e) => setEditingWs({ ...editingWs, meeting_link: e.target.value })}
                placeholder="Google Meet or Zoom details"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Short Meta Summary</Label>
              <Input
                value={editingWs.short_description || ''}
                onChange={(e) => setEditingWs({ ...editingWs, short_description: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label>Full Workshop Details (HTML supported)</Label>
            <Textarea
              value={editingWs.description || ''}
              onChange={(e) => setEditingWs({ ...editingWs, description: e.target.value })}
              className="mt-1.5 rounded-xl min-h-[140px]"
            />
          </div>

          {/* Logistics & Venue */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Logistics &amp; Venue</h4>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editingWs.date || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, date: e.target.value, end_date: editingWs.end_date || e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editingWs.end_date || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input
                  value={editingWs.start_time || '10:00'}
                  onChange={(e) => setEditingWs({ ...editingWs, start_time: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  value={editingWs.end_time || '12:00'}
                  onChange={(e) => setEditingWs({ ...editingWs, end_time: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input
                  value={editingWs.timezone || 'Asia/Kolkata'}
                  onChange={(e) => setEditingWs({ ...editingWs, timezone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Venue Name</Label>
                <Input
                  value={editingWs.venue_name || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, venue_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Venue Address</Label>
                <Input
                  value={editingWs.address || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Google Maps URL</Label>
                <Input
                  value={editingWs.google_maps_link || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, google_maps_link: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Seating and limits */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Capacity &amp; Booking Timeframe</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Total Seats Limit</Label>
                <Input
                  type="number"
                  value={editingWs.seats_total || 50}
                  onChange={(e) => setEditingWs({ ...editingWs, seats_total: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Registration Starts</Label>
                <Input
                  type="date"
                  value={editingWs.registration_start || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, registration_start: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Registration Ends</Label>
                <Input
                  type="date"
                  value={editingWs.registration_end || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, registration_end: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Pricing Configuration</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Price (INR)</Label>
                <Input
                  type="number"
                  value={editingWs.price_inr || 0}
                  onChange={(e) => setEditingWs({ ...editingWs, price_inr: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  value={editingWs.price_usd || 0}
                  onChange={(e) => setEditingWs({ ...editingWs, price_usd: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Early Bird Price (INR)</Label>
                <Input
                  type="number"
                  value={editingWs.early_bird_price_inr || 0}
                  onChange={(e) => setEditingWs({ ...editingWs, early_bird_price_inr: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Early Bird Price (USD)</Label>
                <Input
                  type="number"
                  value={editingWs.early_bird_price_usd || 0}
                  onChange={(e) => setEditingWs({ ...editingWs, early_bird_price_usd: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Early Bird Expiry Date</Label>
                <Input
                  type="date"
                  value={editingWs.offer_expiry || ''}
                  onChange={(e) => setEditingWs({ ...editingWs, offer_expiry: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4" /> Locked Resources &amp; Downloads
            </h4>
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Resource Name" value={resourceForm.name} onChange={(e) => setResourceForm({...resourceForm, name: e.target.value})} />
              <Input placeholder="Resource URL (PDF/Drive)" value={resourceForm.url} onChange={(e) => setResourceForm({...resourceForm, url: e.target.value})} />
              <Input 
                type="file" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const toastId = toast.loading(`Uploading resource to Cloudinary...`);
                    try {
                      const isAudio = file.type.startsWith('audio/');
                      const { url } = await uploadToCloudinaryDirect(file, isAudio);
                      setResourceForm({
                        name: file.name,
                        url: url,
                        type: file.type.includes('pdf') ? 'pdf' : 'workbook'
                      });
                      toast.success('Resource file uploaded successfully!', { id: toastId });
                    } catch (e: any) {
                      toast.error('Upload failed: ' + e.message, { id: toastId });
                    }
                  }
                }}
                className="file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs text-xs"
              />
              <select
                value={resourceForm.type}
                onChange={(e) => setResourceForm({...resourceForm, type: e.target.value})}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="pdf">PDF Workbook</option>
                <option value="slides">Presentation Slides</option>
                <option value="audio">Audio Guided Meditation</option>
              </select>
            </div>
            
            <Button type="button" size="sm" onClick={addResource} className="rounded-full bg-gold/25 hover:bg-gold/40 text-gold-foreground">
              Add Resource File
            </Button>

            {editingWs.resources && editingWs.resources.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {editingWs.resources.map((r, idx) => (
                  <span key={idx} className="bg-secondary px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    {r.name} ({r.type})
                    <button type="button" onClick={() => {
                      const next = [...(editingWs.resources || [])];
                      next.splice(idx, 1);
                      setEditingWs({ ...editingWs, resources: next });
                    }} className="text-destructive font-bold">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Speakers Form */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Add Speakers</h4>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Speaker Name" value={speakerForm.name} onChange={(e) => setSpeakerForm({...speakerForm, name: e.target.value})} />
              <Input placeholder="Role / Title" value={speakerForm.role} onChange={(e) => setSpeakerForm({...speakerForm, role: e.target.value})} />
              <Input placeholder="Expertise" value={speakerForm.expertise} onChange={(e) => setSpeakerForm({...speakerForm, expertise: e.target.value})} />
            </div>
            <Textarea placeholder="Short Bio" value={speakerForm.bio} onChange={(e) => setSpeakerForm({...speakerForm, bio: e.target.value})} />
            <Input placeholder="Image URL" value={speakerForm.image} onChange={(e) => setSpeakerForm({...speakerForm, image: e.target.value})} />
            
            {/* Social media profile URLs */}
            <div className="grid gap-3 md:grid-cols-3 text-xs">
              <Input placeholder="LinkedIn URL" value={speakerForm.socials?.linkedin || ''} onChange={(e) => setSpeakerForm({...speakerForm, socials: {...(speakerForm.socials || {}), linkedin: e.target.value}})} />
              <Input placeholder="Instagram URL" value={speakerForm.socials?.instagram || ''} onChange={(e) => setSpeakerForm({...speakerForm, socials: {...(speakerForm.socials || {}), instagram: e.target.value}})} />
              <Input placeholder="Facebook URL" value={speakerForm.socials?.facebook || ''} onChange={(e) => setSpeakerForm({...speakerForm, socials: {...(speakerForm.socials || {}), facebook: e.target.value}})} />
              <Input placeholder="Twitter URL" value={speakerForm.socials?.twitter || ''} onChange={(e) => setSpeakerForm({...speakerForm, socials: {...(speakerForm.socials || {}), twitter: e.target.value}})} />
              <Input placeholder="Website URL" value={speakerForm.socials?.website || ''} onChange={(e) => setSpeakerForm({...speakerForm, socials: {...(speakerForm.socials || {}), website: e.target.value}})} />
              <Input placeholder="YouTube URL" value={speakerForm.socials?.youtube || ''} onChange={(e) => setSpeakerForm({...speakerForm, socials: {...(speakerForm.socials || {}), youtube: e.target.value}})} />
            </div>

            <Button type="button" size="sm" onClick={addSpeaker} className="rounded-full bg-gold/25 hover:bg-gold/40 text-gold-foreground">
              Add Speaker Profile
            </Button>

            {editingWs.speakers && editingWs.speakers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {editingWs.speakers.map((s, idx) => (
                  <span key={idx} className="bg-secondary px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    {s.name}
                    <button type="button" onClick={() => {
                      const next = [...(editingWs.speakers || [])];
                      next.splice(idx, 1);
                      setEditingWs({ ...editingWs, speakers: next });
                    }} className="text-destructive font-bold">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Agenda slot */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Add Agenda Items</h4>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Time slot" value={agendaForm.time} onChange={(e) => setAgendaForm({...agendaForm, time: e.target.value})} />
              <Input placeholder="Activity Title" value={agendaForm.title} onChange={(e) => setAgendaForm({...agendaForm, title: e.target.value})} />
              <Input placeholder="Summary description" value={agendaForm.description} onChange={(e) => setAgendaForm({...agendaForm, description: e.target.value})} />
            </div>
            
            <Button type="button" size="sm" onClick={addAgendaItem} className="rounded-full bg-gold/25 hover:bg-gold/40 text-gold-foreground">
              Add Agenda Slot
            </Button>

            {editingWs.agenda && editingWs.agenda.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {editingWs.agenda.map((a, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-secondary/60 p-2 rounded-xl">
                    <span><strong>{a.time}</strong>: {a.title} ({a.description})</span>
                    <button type="button" onClick={() => {
                      const next = [...(editingWs.agenda || [])];
                      next.splice(idx, 1);
                      setEditingWs({ ...editingWs, agenda: next });
                    }} className="text-destructive font-bold">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Benefits</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Add a benefit of this workshop..."
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                className="h-9 rounded-xl"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!benefitInput.trim()) return;
                  const current = editingWs.benefits || [];
                  setEditingWs({ ...editingWs, benefits: [...current, benefitInput.trim()] });
                  setBenefitInput('');
                }}
                className="rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground h-9 text-xs font-semibold px-4"
              >
                Add
              </Button>
            </div>
            {editingWs.benefits && editingWs.benefits.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {editingWs.benefits.map((b, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-secondary/60 p-2 rounded-xl">
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(editingWs.benefits || [])];
                        next.splice(idx, 1);
                        setEditingWs({ ...editingWs, benefits: next });
                      }}
                      className="text-destructive font-bold"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">Tags</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag (e.g. healing, meditation)..."
                id="tag-input"
                className="h-9 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const el = e.currentTarget;
                    if (el.value.trim()) {
                      const current = editingWs.tags || [];
                      if (!current.includes(el.value.trim())) {
                        setEditingWs({ ...editingWs, tags: [...current, el.value.trim()] });
                      }
                      el.value = '';
                    }
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  const el = document.getElementById('tag-input') as HTMLInputElement;
                  if (el && el.value.trim()) {
                    const current = editingWs.tags || [];
                    if (!current.includes(el.value.trim())) {
                      setEditingWs({ ...editingWs, tags: [...current, el.value.trim()] });
                    }
                    el.value = '';
                  }
                }}
                className="rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground h-9 text-xs font-semibold px-4"
              >
                Add Tag
              </Button>
            </div>
            {editingWs.tags && editingWs.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {editingWs.tags.map((t, idx) => (
                  <span key={idx} className="bg-secondary px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    {t}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(editingWs.tags || [])];
                        next.splice(idx, 1);
                        setEditingWs({ ...editingWs, tags: next });
                      }}
                      className="text-destructive font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* FAQs */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <h4 className="font-semibold text-xs text-gold uppercase tracking-wider">FAQs</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Question"
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                className="h-9 rounded-xl"
              />
              <Input
                placeholder="Answer"
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                className="h-9 rounded-xl"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addFaq}
              className="rounded-full bg-gold/25 hover:bg-gold/40 text-gold-foreground"
            >
              Add FAQ
            </Button>
            {editingWs.faqs && editingWs.faqs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {editingWs.faqs.map((f, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs bg-secondary/60 p-2 rounded-xl gap-4">
                    <div className="space-y-0.5 text-left">
                      <p className="font-semibold">Q: {f.question}</p>
                      <p className="text-muted-foreground">A: {f.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(editingWs.faqs || [])];
                        next.splice(idx, 1);
                        setEditingWs({ ...editingWs, faqs: next });
                      }}
                      className="text-destructive font-bold"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status and settings */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40 flex-wrap gap-4">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingWs.featured === true}
                  onChange={(e) => setEditingWs({ ...editingWs, featured: e.target.checked })}
                  className="rounded border-border text-gold focus:ring-gold"
                />
                Mark as Featured
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingWs.publish_as_blog === true}
                  onChange={(e) => setEditingWs({ ...editingWs, publish_as_blog: e.target.checked })}
                  className="rounded border-border text-gold focus:ring-gold"
                />
                Publish as Blog Post
              </label>
            </div>

            <Button type="submit" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-8">
              Save Workshop Configuration
            </Button>
          </div>
        </form>
      )}

      {viewingRegs && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left shadow-soft">
          <div className="flex justify-between items-center pb-2 border-b border-border/40 flex-wrap gap-2">
            <h3 className="font-display text-lg font-medium text-foreground">
              Attendee List ({registrations.filter(r => r.workshop_id === viewingRegs).length})
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExportCSV(viewingRegs)} className="rounded-full gap-1.5 text-xs">
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportXLS(viewingRegs)} className="rounded-full gap-1.5 text-xs">
                Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportPDF(viewingRegs)} className="rounded-full gap-1.5 text-xs">
                PDF Report
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setViewingRegs(null)} className="rounded-full">
                &times; Close
              </Button>
            </div>
          </div>

          <div className="flex gap-4 border-b border-border/20 pb-1">
            <button
              onClick={() => setSubView('attendees')}
              className={cn(
                'pb-2 px-1 text-sm font-semibold tracking-wide transition-all border-b-2',
                subView === 'attendees' ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground'
              )}
            >
              Attendees &amp; Attendance
            </button>
            <button
              onClick={() => setSubView('certificates')}
              className={cn(
                'pb-2 px-1 text-sm font-semibold tracking-wide transition-all border-b-2',
                subView === 'certificates' ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground'
              )}
            >
              Certificate Management
            </button>
          </div>

          {subView === 'attendees' ? (
            <>
              {/* Attendance metrics totals */}
              {(() => {
                const list = registrations.filter(r => r.workshop_id === viewingRegs);
                const presentCount = list.filter(r => r.attendance === 'present' || r.attendance === true).length;
                const absentCount = list.filter(r => r.attendance === 'absent' || r.attendance === false || !r.attendance).length;
                const lateCount = list.filter(r => r.attendance === 'late').length;
                const excusedCount = list.filter(r => r.attendance === 'excused').length;

                return (
                  <div className="flex gap-4 text-xs font-semibold text-muted-foreground bg-secondary/20 p-3 rounded-2xl flex-wrap">
                    <span>Present: <span className="text-emerald-500">{presentCount}</span></span>
                    <span>Absent: <span className="text-destructive">{absentCount}</span></span>
                    <span>Late: <span className="text-warning">{lateCount}</span></span>
                    <span>Excused: <span className="text-blue-400">{excusedCount}</span></span>
                  </div>
                );
              })()}

              {/* Filtering trigger */}
              <div className="flex gap-2 border-b border-border/20 pb-2">
                {['all', 'present', 'absent', 'late', 'excused'].map((cat: any) => (
                  <button
                    key={cat}
                    onClick={() => setAttendeeFilter(cat)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                      attendeeFilter === cat ? 'bg-gold text-gold-foreground' : 'bg-secondary hover:bg-secondary-hover text-muted-foreground'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="py-2.5">Name</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">WhatsApp / Phone</th>
                      <th className="py-2.5">Payment</th>
                      <th className="py-2.5">Attendance</th>
                      <th className="py-2.5">Certificate</th>
                      <th className="py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations
                      .filter((r) => r.workshop_id === viewingRegs)
                      .filter((r) => {
                        if (attendeeFilter === 'all') return true;
                        if (attendeeFilter === 'present') return r.attendance === 'present' || r.attendance === true;
                        if (attendeeFilter === 'absent') return r.attendance === 'absent' || r.attendance === false || !r.attendance;
                        return r.attendance === attendeeFilter;
                      })
                      .map((r) => (
                        <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/15 transition-colors">
                          <td className="py-3 font-medium text-foreground">{r.client_name}</td>
                          <td className="py-3 text-muted-foreground">{r.client_email}</td>
                          <td className="py-3 text-muted-foreground">{r.client_phone}</td>
                          <td className="py-3">
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase',
                              r.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'
                            )}>
                              {r.payment_status}
                            </span>
                          </td>
                          <td className="py-3">
                            <select
                              value={typeof r.attendance === 'string' ? r.attendance : r.attendance === true ? 'present' : 'absent'}
                              onChange={async (e) => {
                                const val = e.target.value;
                                try {
                                  const q = query(collection(db, 'workshopRegistrations'), where('id', '==', r.id));
                                  const snap = await getDocs(q);
                                  if (!snap.empty) {
                                    await setDoc(snap.docs[0].ref, { attendance: val }, { merge: true });
                                    toast.success('Attendance updated.');
                                    if (val === 'present') {
                                      fetch('/api/workshops/generate-certificate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ registration_id: r.id })
                                      }).then(res => {
                                        if (res.ok) toast.success('Certificate generated automatically!');
                                      });
                                    }
                                  }
                                } catch {
                                  toast.error('Failed to update.');
                                }
                              }}
                              className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="excused">Excused</option>
                            </select>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2 items-center">
                              <Input
                                defaultValue={r.certificate_url || ''}
                                onBlur={(e) => handleCertificateUpload(r, e.target.value)}
                                placeholder="Certificate URL (PDF)"
                                className="h-7 text-xs rounded-lg max-w-[150px]"
                              />
                              <Button size="sm" variant="outline" onClick={() => handleGenerateCertificate(r)} className="rounded-lg h-7 text-[10px] py-0 px-2 shrink-0">
                                Auto Gen
                              </Button>
                            </div>
                          </td>
                          <td className="py-3">
                            <Button size="sm" variant="ghost" onClick={() => handleSendReminder(r)} className="rounded-full gap-1 text-[10px]">
                              <Send className="h-3 w-3" /> Remind
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="py-2.5">Client Name</th>
                      <th className="py-2.5">Certificate Number</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Date Created</th>
                      <th className="py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations
                      .filter(r => r.workshop_id === viewingRegs)
                      .map(r => {
                        const isGenerated = r.certificate_status === 'available' || (r.certificate_url && r.certificate_url.startsWith('http'));
                        const isFailed = r.certificate_status === 'failed';
                        const isPending = !isGenerated && !isFailed;
                        const statusLabel = isGenerated ? 'Generated' : isFailed ? 'Failed' : 'Pending';

                        return (
                          <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/15 transition-colors">
                            <td className="py-3 font-medium text-foreground">{r.client_name}</td>
                            <td className="py-3 font-mono">{r.certificate_number || 'N/A'}</td>
                            <td className="py-3">
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase',
                                isGenerated ? 'bg-emerald-500/10 text-emerald-400' : isFailed ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                              )}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">{r.certificate_date || 'N/A'}</td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleGenerateCertificate(r)} className="rounded-lg h-7 text-[10px] py-0 px-2">
                                  Regenerate
                                </Button>
                                {isGenerated && (
                                  <>
                                    <a href={r.certificate_url} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="outline" className="rounded-lg h-7 text-[10px] py-0 px-2 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10">
                                        Download
                                      </Button>
                                    </a>
                                    <a href={r.certificate_url} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="ghost" className="rounded-lg h-7 text-[10px] py-0 px-2 text-muted-foreground">
                                        Preview
                                      </Button>
                                    </a>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Reviews List */}
      {!editingWs && !viewingRegs && feedbacks.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left shadow-soft">
          <h3 className="font-display text-base font-semibold text-foreground">Workshop Feedback Reviews Moderation</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {feedbacks.map((f) => (
              <div key={f.id} className="p-4 rounded-2xl bg-secondary/30 border border-border/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="font-semibold text-foreground text-xs">{f.user_name}</span>
                    <div className="flex text-gold">
                      {Array.from({ length: f.rating }).map((_, idx) => (
                        <Star key={idx} className="h-3 w-3 fill-gold" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-2">&ldquo;{f.review}&rdquo;</p>
                  {f.suggestions && (
                    <p className="text-[10px] text-muted-foreground mt-1"><strong>Suggestions:</strong> {f.suggestions}</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-border/20 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => handleApproveFeedback(f, !f.approved)} className="rounded-full text-[10px]">
                    {f.approved ? 'Hide' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteFeedback(f.id)} className="rounded-full text-[10px] text-destructive hover:bg-destructive/10">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main listing of workshops */}
      {!editingWs && !viewingRegs && (
        <div className="grid gap-4 sm:grid-cols-2">
          {workshops.map((w) => (
            <div key={w.id} className="rounded-3xl border border-border bg-card p-5 hover:border-gold/30 hover:shadow-soft transition-all duration-300 flex flex-col justify-between text-left space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img src={w.image} alt={w.title} className="h-10 w-16 rounded-lg object-cover border border-border shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground text-sm line-clamp-1">{w.title}</h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3 w-3" /> {new Date(w.date).toLocaleDateString()} &middot; {w.start_time}
                      </p>
                    </div>
                  </div>
                  <select
                    value={w.status}
                    onChange={(e) => handleToggleStatus(w, e.target.value as any)}
                    className="rounded-full bg-secondary/80 text-[10px] font-semibold border-0 focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                  {w.short_description || w.description.replace(/<[^>]*>/g, '').slice(0, 100)}
                </p>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/20 text-xs">
                  <span className="text-muted-foreground font-medium">
                    Seats: {w.seats_booked} / {w.seats_total}
                  </span>
                  <span className="text-foreground font-semibold">
                    ₹{w.price_inr} / ${w.price_usd}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border/20 mt-2 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => setViewingRegs(w.id)} className="rounded-full text-xs h-8 gap-1">
                  <Users className="h-3.5 w-3.5" /> Attendees
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDuplicate(w)} className="rounded-full text-xs h-8 gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingWs(w)} className="rounded-full text-xs h-8">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(w.id)} className="rounded-full text-xs h-8 hover:text-destructive hover:bg-destructive/10">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cropperOpen && (
        <ImageCropperModal
          isOpen={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setCropperSrc('');
          }}
          imageSrc={cropperSrc}
          aspect={cropperAspect}
          onCropComplete={(croppedFile) => {
            handleUploadFile(croppedFile, cropperTarget);
          }}
          title={cropperTarget === 'thumbnail' ? 'Crop Thumbnail (4:3)' : 'Crop Workshop Banner (4:3)'}
        />
      )}
    </div>
  );
}
