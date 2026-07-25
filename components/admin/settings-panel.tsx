'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Save, Key, Mail, MessageSquare, Shield, Globe, Award, Image as ImageIcon, Sparkles, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AdminSettings = {
  id: string;
  business_name?: string;
  currency?: string;
  timezone?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  meeting_provider?: string;
  reminder_hours_before?: number;
  google_meet_link?: string;
};

type CertificateSettings = {
  template_url: string;
  template_public_id?: string;
  logo_url: string;
  logo_public_id?: string;
  founder_name: string;
  founder_designation: string;
  founder_signature_url: string;
  founder_signature_public_id?: string;
  director_name: string;
  director_designation: string;
  director_signature_url: string;
  director_signature_public_id?: string;
  
  show_founder_signature: boolean;
  show_director_signature: boolean;
  show_logo: boolean;
  show_qr_code: boolean;
  show_cert_number: boolean;
  show_completion_date: boolean;
  show_workshop_name: boolean;
  show_user_name: boolean;
  show_instructor_name: boolean;

  user_name_font_size: number;
  user_name_color: string;
  workshop_name_font_size: number;
  workshop_name_color: string;
  cert_number_font_size: number;
  cert_number_color: string;
  date_font_size: number;
  date_color: string;

  user_name_x: number;
  user_name_y: number;
  workshop_name_x: number;
  workshop_name_y: number;
  cert_number_x: number;
  cert_number_y: number;
  date_x: number;
  date_y: number;
  qr_code_x: number;
  qr_code_y: number;
  founder_sig_x: number;
  founder_sig_y: number;
  director_sig_x: number;
  director_sig_y: number;
  logo_x: number;
  logo_y: number;
};

const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  template_url: '/certificates/template.png',
  template_public_id: '',
  logo_url: '',
  logo_public_id: '',
  founder_name: 'Sumit G.',
  founder_designation: 'Founder, LifeHolics',
  founder_signature_url: '',
  founder_signature_public_id: '',
  director_name: 'LifeHolics Somatics',
  director_designation: 'Director',
  director_signature_url: '',
  director_signature_public_id: '',
  
  show_founder_signature: true,
  show_director_signature: true,
  show_logo: false,
  show_qr_code: true,
  show_cert_number: true,
  show_completion_date: true,
  show_workshop_name: true,
  show_user_name: true,
  show_instructor_name: true,

  user_name_font_size: 36,
  user_name_color: '#1f1f1f',
  workshop_name_font_size: 26,
  workshop_name_color: '#b7943c',
  cert_number_font_size: 14,
  cert_number_color: '#333333',
  date_font_size: 14,
  date_color: '#333333',

  user_name_x: 500,
  user_name_y: 560,
  workshop_name_x: 500,
  workshop_name_y: 712,
  cert_number_x: 420,
  cert_number_y: 405,
  date_x: 230,
  date_y: 405,
  qr_code_x: 690,
  qr_code_y: 390,
  founder_sig_x: 280,
  founder_sig_y: 215,
  director_sig_x: 600,
  director_sig_y: 215,
  logo_x: 500,
  logo_y: 800
};

export type SomaticPlanSettings = {
  essential_title: string;
  essential_price_inr: number;
  essential_short: string;
  essential_benefits: string;
  
  premium_title: string;
  premium_price_inr: number;
  premium_short: string;
  premium_benefits: string;
  
  elite_title: string;
  elite_price_inr: number;
  elite_short: string;
  elite_benefits: string;
};

const DEFAULT_SOMATIC_PLAN_SETTINGS: SomaticPlanSettings = {
  essential_title: 'Plan A · Essential',
  essential_price_inr: 4444,
  essential_short: 'Great for tight budgets with solid healing basics.',
  essential_benefits: "1 targeted somatic clarity session (30m)\nCustomized diagnostic profiling\nActionable home practices guide\nEmail-only support channel",
  
  premium_title: 'Plan B · Premium',
  premium_price_inr: 11000,
  premium_short: 'Our most popular plan with comprehensive somatic care.',
  premium_benefits: "4 private somatic therapy sessions (60m)\nCustom daily somatic practices outline\nDirect WhatsApp guidance support\nWeekly progress check-in chats\nFree access to mindfulness archives",
  
  elite_title: 'Plan C · Elite',
  elite_price_inr: 21000,
  elite_short: 'Top-tier deep customization for ancestral healing.',
  elite_benefits: "8 deep ancestral lineage release sessions\nCustomized lineage release mapping chart\n24/7 dedicated text/call support line\nBi-weekly virtual progress reviews\nGuaranteed instant priority calendar booking"
};

export function AdminSettingsPanel() {
  const [activeTab, setActiveTab] = useState<'global' | 'certificate' | 'somatic'>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [somaticSettings, setSomaticSettings] = useState<SomaticPlanSettings>(DEFAULT_SOMATIC_PLAN_SETTINGS);

  // Form states
  const [globalSettings, setGlobalSettings] = useState<AdminSettings>({
    id: 'global',
    business_name: 'TheLifeHolics',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    razorpay_key_id: '',
    razorpay_key_secret: '',
    meeting_provider: 'gmeet',
    reminder_hours_before: 24,
    google_meet_link: '',
  });

  const [certSettings, setCertSettings] = useState<CertificateSettings>(DEFAULT_CERTIFICATE_SETTINGS);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      // Global
      const globalSnap = await getDocs(collection(db, 'settings'));
      const globalDoc = globalSnap.docs.find((d) => d.id === 'global');
      if (globalDoc) {
        setGlobalSettings({ id: 'global', ...globalDoc.data() } as AdminSettings);
      }
      
      // Certificate
      const certDocRef = doc(db, 'settings', 'certificate');
      const certSnap = await getDoc(certDocRef);
      if (certSnap.exists()) {
        setCertSettings({ ...DEFAULT_CERTIFICATE_SETTINGS, ...certSnap.data() } as CertificateSettings);
      }

      // Somatic Plans
      const somaticDocRef = doc(db, 'settings', 'somatic_plans');
      const somaticSnap = await getDoc(somaticDocRef);
      if (somaticSnap.exists()) {
        const data = somaticSnap.data();
        setSomaticSettings({
          essential_title: data.essential_title || DEFAULT_SOMATIC_PLAN_SETTINGS.essential_title,
          essential_price_inr: data.essential_price_inr ?? DEFAULT_SOMATIC_PLAN_SETTINGS.essential_price_inr,
          essential_short: data.essential_short || DEFAULT_SOMATIC_PLAN_SETTINGS.essential_short,
          essential_benefits: Array.isArray(data.essential_benefits) ? data.essential_benefits.join('\n') : (data.essential_benefits || DEFAULT_SOMATIC_PLAN_SETTINGS.essential_benefits),
          
          premium_title: data.premium_title || DEFAULT_SOMATIC_PLAN_SETTINGS.premium_title,
          premium_price_inr: data.premium_price_inr ?? DEFAULT_SOMATIC_PLAN_SETTINGS.premium_price_inr,
          premium_short: data.premium_short || DEFAULT_SOMATIC_PLAN_SETTINGS.premium_short,
          premium_benefits: Array.isArray(data.premium_benefits) ? data.premium_benefits.join('\n') : (data.premium_benefits || DEFAULT_SOMATIC_PLAN_SETTINGS.premium_benefits),
          
          elite_title: data.elite_title || DEFAULT_SOMATIC_PLAN_SETTINGS.elite_title,
          elite_price_inr: data.elite_price_inr ?? DEFAULT_SOMATIC_PLAN_SETTINGS.elite_price_inr,
          elite_short: data.elite_short || DEFAULT_SOMATIC_PLAN_SETTINGS.elite_short,
          elite_benefits: Array.isArray(data.elite_benefits) ? data.elite_benefits.join('\n') : (data.elite_benefits || DEFAULT_SOMATIC_PLAN_SETTINGS.elite_benefits),
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving global configurations...');
    try {
      await setDoc(doc(db, 'settings', 'global'), globalSettings, { merge: true });
      toast.success('Global settings saved successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCertSettings = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving certificate parameters...');
    try {
      await setDoc(doc(db, 'settings', 'certificate'), certSettings, { merge: true });
      toast.success('Certificate settings saved successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save certificate configurations: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSomaticSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving Somatic plans...');
    try {
      const finalObj = {
        essential_title: somaticSettings.essential_title,
        essential_price_inr: Number(somaticSettings.essential_price_inr || 0),
        essential_short: somaticSettings.essential_short,
        essential_benefits: somaticSettings.essential_benefits.split('\n').map(b => b.trim()).filter(Boolean),
        
        premium_title: somaticSettings.premium_title,
        premium_price_inr: Number(somaticSettings.premium_price_inr || 0),
        premium_short: somaticSettings.premium_short,
        premium_benefits: somaticSettings.premium_benefits.split('\n').map(b => b.trim()).filter(Boolean),
        
        elite_title: somaticSettings.elite_title,
        elite_price_inr: Number(somaticSettings.elite_price_inr || 0),
        elite_short: somaticSettings.elite_short,
        elite_benefits: somaticSettings.elite_benefits.split('\n').map(b => b.trim()).filter(Boolean),
      };
      await setDoc(doc(db, 'settings', 'somatic_plans'), finalObj, { merge: true });
      toast.success('Somatic plans settings saved successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save plans: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = async (file: File, field: 'template_url' | 'logo_url' | 'founder_signature_url' | 'director_signature_url') => {
    // Validate format & size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size limit is 5MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image assets (PNG, JPG, JPEG) are supported.');
      return;
    }

    setUploadingField(field);
    const toastId = toast.loading(`Uploading asset for ${field.replace('_url', '')}...`);
    try {
      // Automatic cleanup if old asset existed
      const oldPublicId = (certSettings as any)[field.replace('_url', '_public_id')];
      if (oldPublicId) {
        console.log(`Scheduling purge for old asset: ${oldPublicId}`);
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload server failed');
      const { url } = await res.json();
      
      const newPublicId = url.split('/').pop()?.split('.')[0] || 'id_' + Math.random().toString(36).substring(7);

      setCertSettings(prev => ({
        ...prev,
        [field]: url,
        [field.replace('_url', '_public_id')]: newPublicId
      }));

      toast.success('Asset uploaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingField(null);
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
      {/* Sub Tabs Navigation */}
      <div className="flex gap-4 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab('global')}
          className={cn(
            'pb-2 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all',
            activeTab === 'global' ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground'
          )}
        >
          Global Settings
        </button>
        <button
          onClick={() => setActiveTab('certificate')}
          className={cn(
            'pb-2 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all',
            activeTab === 'certificate' ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground'
          )}
        >
          Certificate Configurator
        </button>
        <button
          onClick={() => setActiveTab('somatic')}
          className={cn(
            'pb-2 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all',
            activeTab === 'somatic' ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground'
          )}
        >
          Somatic Plans Editor
        </button>
      </div>

      {activeTab === 'global' ? (
        <form onSubmit={handleSaveGlobal} className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
          <div className="flex justify-between items-center pb-3 border-b border-border/40">
            <div>
              <h3 className="font-display text-lg font-medium text-foreground">Global Settings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Control business configurations, payment keys, SMTP, and APIs.</p>
            </div>
            <Button type="submit" disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 px-6">
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          </div>

          <div className="space-y-4">
            {/* Business Settings */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-gold" /> Business Information
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Business Brand Name</Label>
                  <Input
                    value={globalSettings.business_name || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, business_name: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Booking rules */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-gold" /> Somatic Session Booking Rules
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Meeting Provider</Label>
                  <select
                    value={globalSettings.meeting_provider || 'gmeet'}
                    onChange={(e: any) => setGlobalSettings({ ...globalSettings, meeting_provider: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="gmeet">Google Meet</option>
                    <option value="zoom">Zoom Video</option>
                  </select>
                </div>
                {globalSettings.meeting_provider === 'gmeet' && (
                  <div>
                    <Label>Google Meet Link</Label>
                    <Input
                      type="url"
                      value={globalSettings.google_meet_link || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, google_meet_link: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                )}
                <div>
                  <Label>Automatic Session Reminder (Hours Before)</Label>
                  <Input
                    type="number"
                    value={globalSettings.reminder_hours_before || 24}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, reminder_hours_before: parseInt(e.target.value) || 24 })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : activeTab === 'certificate' ? (
        <div className="grid gap-6 lg:grid-cols-12 text-left">
          {/* Certificate Editor Panels */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-soft">
              <div className="flex justify-between items-center pb-3 border-b border-border/40">
                <div>
                  <h3 className="font-display text-lg font-medium text-foreground">Somatic Certificate Canvas Config</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Customize layouts, coordinate positioning, font styling, and logo uploads.</p>
                </div>
                <Button onClick={handleSaveCertSettings} disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 px-6">
                  <Save className="h-4 w-4" /> Save Canvas
                </Button>
              </div>

              {/* Template & Logo uploads */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
                  <ImageIcon className="h-4 w-4 text-gold" /> Template Assets
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Template Frame File (PNG/JPG)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0], 'template_url')}
                      className="mt-1.5 file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">Current URL: {certSettings.template_url}</p>
                  </div>
                  <div>
                    <Label>LifeHolics Logo File</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0], 'logo_url')}
                      className="mt-1.5 file:bg-gold/15 file:text-gold file:border-0 file:rounded-full file:px-3 file:py-1 file:text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">Current URL: {certSettings.logo_url || 'None'}</p>
                  </div>
                </div>
              </div>

              {/* Signees */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
                  <Award className="h-4 w-4 text-gold" /> Founder &amp; Director Signees
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Founder */}
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-3">
                    <h5 className="font-bold text-xs text-foreground uppercase tracking-wide">Founder</h5>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={certSettings.founder_name}
                        onChange={(e) => setCertSettings({ ...certSettings, founder_name: e.target.value })}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label>Designation</Label>
                      <Input
                        value={certSettings.founder_designation}
                        onChange={(e) => setCertSettings({ ...certSettings, founder_designation: e.target.value })}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label>Signature File</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0], 'founder_signature_url')}
                        className="mt-1 h-8 file:bg-gold/15 file:text-gold file:border-0 file:rounded-lg file:px-2 file:py-0.5 file:text-[10px]"
                      />
                    </div>
                  </div>
                  {/* Director */}
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-3">
                    <h5 className="font-bold text-xs text-foreground uppercase tracking-wide">Director</h5>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={certSettings.director_name}
                        onChange={(e) => setCertSettings({ ...certSettings, director_name: e.target.value })}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label>Designation</Label>
                      <Input
                        value={certSettings.director_designation}
                        onChange={(e) => setCertSettings({ ...certSettings, director_designation: e.target.value })}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label>Signature File</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0], 'director_signature_url')}
                        className="mt-1 h-8 file:bg-gold/15 file:text-gold file:border-0 file:rounded-lg file:px-2 file:py-0.5 file:text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Elements Toggles & Styling */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
                  <Sparkles className="h-4 w-4 text-gold" /> Toggles &amp; Styles
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Toggles */}
                  <div className="space-y-2.5">
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase">Element Visibility</h5>
                    <div className="grid gap-2">
                      {[
                        { key: 'show_user_name', label: '✓ User Name' },
                        { key: 'show_workshop_name', label: '✓ Workshop Name' },
                        { key: 'show_cert_number', label: '✓ Certificate Number' },
                        { key: 'show_completion_date', label: '✓ Date' },
                        { key: 'show_qr_code', label: '✓ QR Code' },
                        { key: 'show_founder_signature', label: '✓ Founder Signature' },
                        { key: 'show_director_signature', label: '✓ Director Signature' },
                        { key: 'show_logo', label: '✓ Logo' },
                      ].map((el) => (
                        <label key={el.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(certSettings as any)[el.key]}
                            onChange={(e) => setCertSettings({ ...certSettings, [el.key]: e.target.checked })}
                            className="rounded border-border text-gold focus:ring-gold"
                          />
                          <span>{el.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Font Styling */}
                  <div className="space-y-3">
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase">Text Styling</h5>
                    <div className="space-y-2 text-xs">
                      <div>
                        <Label className="text-[10px]">User Name Font Size / Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            value={certSettings.user_name_font_size}
                            onChange={(e) => setCertSettings({ ...certSettings, user_name_font_size: parseInt(e.target.value) || 36 })}
                            className="h-8 rounded-lg text-xs"
                          />
                          <Input
                            type="color"
                            value={certSettings.user_name_color}
                            onChange={(e) => setCertSettings({ ...certSettings, user_name_color: e.target.value })}
                            className="h-8 w-12 rounded-lg p-0.5 border cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px]">Workshop Name Size / Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            value={certSettings.workshop_name_font_size}
                            onChange={(e) => setCertSettings({ ...certSettings, workshop_name_font_size: parseInt(e.target.value) || 26 })}
                            className="h-8 rounded-lg text-xs"
                          />
                          <Input
                            type="color"
                            value={certSettings.workshop_name_color}
                            onChange={(e) => setCertSettings({ ...certSettings, workshop_name_color: e.target.value })}
                            className="h-8 w-12 rounded-lg p-0.5 border cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Positions Coordinate mapping (0 to 1000 pixels units) */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b border-border/20 pb-2">
                  <Sliders className="h-4 w-4 text-gold" /> Coordinate Positions (0 - 1000 units)
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  {[
                    { key: 'user_name', label: 'User Name' },
                    { key: 'workshop_name', label: 'Workshop Name' },
                    { key: 'cert_number', label: 'Cert Number' },
                    { key: 'date', label: 'Completion Date' },
                    { key: 'qr_code', label: 'QR Code' },
                    { key: 'founder_sig', label: 'Founder Signature' },
                    { key: 'director_sig', label: 'Director Signature' },
                    { key: 'logo', label: 'Logo' },
                  ].map((el) => (
                    <div key={el.key} className="p-2 bg-secondary/15 border border-border/20 rounded-xl space-y-1.5">
                      <Label className="text-[10px] font-bold">{el.label} Coordinates</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={(certSettings as any)[`${el.key}_x`]}
                          onChange={(e) => setCertSettings({ ...certSettings, [`${el.key}_x`]: parseInt(e.target.value) || 0 })}
                          placeholder="X"
                          className="h-7 text-[10px] rounded-lg"
                        />
                        <Input
                          type="number"
                          value={(certSettings as any)[`${el.key}_y`]}
                          onChange={(e) => setCertSettings({ ...certSettings, [`${el.key}_y`]: parseInt(e.target.value) || 0 })}
                          placeholder="Y"
                          className="h-7 text-[10px] rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Panel */}
          <div className="lg:col-span-5 space-y-4 sticky top-6">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-1.5">
              Canvas Live Preview
            </h3>
            <div className="aspect-square w-full relative rounded-2xl overflow-hidden border border-border bg-black/40 shadow-soft">
              {/* Background Image Template */}
              <img
                src={certSettings.template_url}
                alt="Template Frame Preview"
                className="w-full h-full object-cover select-none"
              />

              {/* Dynamic Overlays */}
              {certSettings.show_logo && certSettings.logo_url && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.logo_x / 1000) * 100}%`,
                    bottom: `${(certSettings.logo_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                  }}
                >
                  <img src={certSettings.logo_url} alt="Logo" className="h-10 object-contain" />
                </div>
              )}

              {certSettings.show_user_name && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.user_name_x / 1000) * 100}%`,
                    bottom: `${(certSettings.user_name_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    fontSize: `${(certSettings.user_name_font_size / 1000) * 450}px`,
                    color: certSettings.user_name_color,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  John Doe
                </div>
              )}

              {certSettings.show_workshop_name && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.workshop_name_x / 1000) * 100}%`,
                    bottom: `${(certSettings.workshop_name_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    fontSize: `${(certSettings.workshop_name_font_size / 1000) * 450}px`,
                    color: certSettings.workshop_name_color,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Healing Workshop
                </div>
              )}

              {certSettings.show_completion_date && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.date_x / 1000) * 100}%`,
                    bottom: `${(certSettings.date_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    fontSize: `${(certSettings.date_font_size / 1000) * 450}px`,
                    color: certSettings.date_color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  25 July 2026
                </div>
              )}

              {certSettings.show_cert_number && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.cert_number_x / 1000) * 100}%`,
                    bottom: `${(certSettings.cert_number_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    fontSize: `${(certSettings.cert_number_font_size / 1000) * 450}px`,
                    color: certSettings.cert_number_color,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  CERT-2026-000001
                </div>
              )}

              {certSettings.show_qr_code && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.qr_code_x / 1000) * 100}%`,
                    bottom: `${(certSettings.qr_code_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    width: '9%',
                    height: '9%',
                    border: '1px dashed #666',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '6px',
                    color: '#111',
                    fontWeight: 'bold',
                  }}
                >
                  QR Code
                </div>
              )}

              {certSettings.show_founder_signature && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.founder_sig_x / 1000) * 100}%`,
                    bottom: `${(certSettings.founder_sig_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {certSettings.founder_signature_url ? (
                    <img src={certSettings.founder_signature_url} alt="Sig" className="h-6 object-contain" />
                  ) : (
                    <span className="text-[6px] text-muted-foreground italic">(Sign)</span>
                  )}
                  <span style={{ fontSize: '5px', fontWeight: 'bold', color: '#111' }}>{certSettings.founder_name}</span>
                </div>
              )}

              {certSettings.show_director_signature && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(certSettings.director_sig_x / 1000) * 100}%`,
                    bottom: `${(certSettings.director_sig_y / 1000) * 100}%`,
                    transform: 'translate(-50%, 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {certSettings.director_signature_url ? (
                    <img src={certSettings.director_signature_url} alt="Sig" className="h-6 object-contain" />
                  ) : (
                    <span className="text-[6px] text-muted-foreground italic">(Sign)</span>
                  )}
                  <span style={{ fontSize: '5px', fontWeight: 'bold', color: '#111' }}>{certSettings.director_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveSomaticSettings} className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
          <div className="flex justify-between items-center pb-3 border-b border-border/40">
            <div>
              <h3 className="font-display text-lg font-medium text-foreground">Somatic Plans Configurator</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Edit titles, prices, descriptions, and feature checklists for Somatic Search Plans.</p>
            </div>
            <Button type="submit" disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1.5 px-6">
              <Save className="h-4 w-4" /> Save Somatic Plans
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* PLAN A */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
              <h4 className="font-semibold text-sm text-foreground border-b border-border/20 pb-2">Plan A (Essential)</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={somaticSettings.essential_title}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, essential_title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Price (INR)</Label>
                  <Input
                    type="number"
                    value={somaticSettings.essential_price_inr}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, essential_price_inr: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Short Description</Label>
                  <Input
                    value={somaticSettings.essential_short}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, essential_short: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Plan Features (One per line)</Label>
                  <textarea
                    value={somaticSettings.essential_benefits}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, essential_benefits: e.target.value })}
                    rows={6}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
            </div>

            {/* PLAN B */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
              <h4 className="font-semibold text-sm text-foreground border-b border-border/20 pb-2">Plan B (Premium)</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={somaticSettings.premium_title}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, premium_title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Price (INR)</Label>
                  <Input
                    type="number"
                    value={somaticSettings.premium_price_inr}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, premium_price_inr: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Short Description</Label>
                  <Input
                    value={somaticSettings.premium_short}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, premium_short: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Plan Features (One per line)</Label>
                  <textarea
                    value={somaticSettings.premium_benefits}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, premium_benefits: e.target.value })}
                    rows={6}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
            </div>

            {/* PLAN C */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4">
              <h4 className="font-semibold text-sm text-foreground border-b border-border/20 pb-2">Plan C (Elite)</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={somaticSettings.elite_title}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, elite_title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Price (INR)</Label>
                  <Input
                    type="number"
                    value={somaticSettings.elite_price_inr}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, elite_price_inr: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Short Description</Label>
                  <Input
                    value={somaticSettings.elite_short}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, elite_short: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Plan Features (One per line)</Label>
                  <textarea
                    value={somaticSettings.elite_benefits}
                    onChange={(e) => setSomaticSettings({ ...somaticSettings, elite_benefits: e.target.value })}
                    rows={6}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
