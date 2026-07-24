'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Tag, Calendar, ShieldCheck, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Coupon = {
  id: string; // uppercase code
  code: string;
  type: 'flat' | 'percent';
  value: number;
  min_amount: number;
  max_discount: number;
  usage_limit: number;
  usage_count: number;
  expiry_date: string;
  active: boolean;
};

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'flat' | 'percent'>('percent');
  const [value, setValue] = useState(10);
  const [minAmount, setMinAmount] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(100);
  const [expiryDate, setExpiryDate] = useState('');

  const fetchCoupons = async () => {
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon));
    } catch (e: any) {
      toast.error('Failed to load coupons: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast.error('Please enter a coupon code.');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const toastId = toast.loading('Creating coupon...');
    try {
      await setDoc(doc(db, 'coupons', cleanCode), {
        id: cleanCode,
        code: cleanCode,
        type,
        value,
        min_amount: minAmount,
        max_discount: maxDiscount,
        usage_limit: usageLimit,
        usage_count: 0,
        expiry_date: expiryDate,
        active: true,
      });

      toast.success('Coupon created successfully!', { id: toastId });
      setCode('');
      setCreating(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error('Failed to save coupon: ' + err.message, { id: toastId });
    }
  };

  const toggleCouponState = async (c: Coupon, state: boolean) => {
    try {
      await setDoc(doc(db, 'coupons', c.id), { active: state }, { merge: true });
      toast.success(`Coupon ${state ? 'activated' : 'deactivated'}.`);
      fetchCoupons();
    } catch (e: any) {
      toast.error('Failed to update state.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      toast.success('Coupon deleted.');
      fetchCoupons();
    } catch (e) {
      toast.error('Failed to delete coupon.');
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
          <p className="text-xs text-muted-foreground">Manage promo codes and checkout discounts.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1">
            <Plus className="h-4 w-4" /> Create Coupon
          </Button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="font-display text-lg font-medium text-foreground">Create Promo Coupon</h3>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="rounded-full">&times; Close</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Promo Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SPIRIT50"
                className="mt-1.5 rounded-xl uppercase font-semibold"
              />
            </div>
            <div>
              <Label>Discount Type</Label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (Currency)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Discount Value</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Min Order Value</Label>
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(parseFloat(e.target.value) || 0)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Max Discount Limit</Label>
              <Input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                className="mt-1.5 rounded-xl"
                placeholder="0 for unlimited"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Usage Limit Count</Label>
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(parseInt(e.target.value) || 100)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <Button type="submit" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6 mt-2">
            Generate Code
          </Button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {coupons.map((c) => (
          <div key={c.id} className="rounded-3xl border border-border bg-card p-5 text-left flex flex-col justify-between hover:border-gold/30 hover:shadow-soft transition-all duration-300">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-gold shrink-0" />
                  <span className="font-mono font-bold text-foreground text-base tracking-wider">{c.code}</span>
                </div>
                <Switch
                  checked={c.active}
                  onCheckedChange={(checked) => toggleCouponState(c, checked)}
                />
              </div>

              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-semibold text-foreground capitalize">{c.type}</span>
                </li>
                <li className="flex justify-between">
                  <span>Value:</span>
                  <span className="font-semibold text-foreground">{c.value}{c.type === 'percent' ? '%' : ''}</span>
                </li>
                <li className="flex justify-between">
                  <span>Usage:</span>
                  <span className="font-semibold text-foreground">{c.usage_count || 0} / {c.usage_limit}</span>
                </li>
                {c.expiry_date && (
                  <li className="flex justify-between">
                    <span>Expiry:</span>
                    <span className="font-semibold text-foreground">{new Date(c.expiry_date).toLocaleDateString()}</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/20 mt-4">
              <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="rounded-full text-xs hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
