'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit2, Sparkles, Check, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Service } from '@/lib/types';

type RecRule = {
  id: string;
  category: string;
  subcategory: string;
  problems: string[];
  recommended_services: string[]; // service slugs
  priority: number;
  severity: string; // 'high' | 'medium' | 'low'
};

const DEFAULT_RECOMMENDATION_RULES: Omit<RecRule, 'id'>[] = [
  {
    category: 'finances',
    subcategory: 'Ancestral Money Patterns',
    problems: [],
    recommended_services: ['ancestral-healing', 'personal-healing-clarity'],
    priority: 1,
    severity: 'medium',
  },
  {
    category: 'relationships',
    subcategory: 'Family',
    problems: [],
    recommended_services: ['one-on-one-therapy', 'personal-healing-clarity'],
    priority: 1,
    severity: 'medium',
  },
  {
    category: 'relationships',
    subcategory: 'Partner / Marriage',
    problems: [],
    recommended_services: ['one-on-one-therapy', 'personal-healing-clarity'],
    priority: 1,
    severity: 'medium',
  }
];

export function AdminRecommendations() {
  const [rules, setRules] = useState<RecRule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Creation / Editing modes
  const [creating, setCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState('relationships');
  const [subcategory, setSubcategory] = useState('');
  const [problemsRaw, setProblemsRaw] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [priority, setPriority] = useState(1);
  const [severity, setSeverity] = useState('medium');

  const fetchRulesAndServices = async () => {
    try {
      const sSnap = await getDocs(collection(db, 'services'));
      const dbServices = sSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service);
      setServices(dbServices);

      const rSnap = await getDocs(collection(db, 'recommendation_rules'));
      let rulesList = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecRule);
      
      // If collection is empty, seed defaults
      if (rulesList.length === 0) {
        const toastId = toast.loading('Seeding default recommendation rules...');
        for (const item of DEFAULT_RECOMMENDATION_RULES) {
          const id = 'rule_' + Math.random().toString(36).substring(7).toUpperCase();
          await setDoc(doc(db, 'recommendation_rules', id), {
            id,
            ...item
          });
        }
        toast.success('Default rules loaded successfully!', { id: toastId });
        
        const freshSnap = await getDocs(collection(db, 'recommendation_rules'));
        rulesList = freshSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecRule);
      }

      setRules(rulesList);
    } catch (e: any) {
      toast.error('Failed to load rules: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesAndServices();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlugs.length === 0) {
      toast.error('Please assign at least one recommended service.');
      return;
    }

    const isEditing = !!editingRuleId;
    const toastId = toast.loading(isEditing ? 'Updating rule...' : 'Creating rule...');
    try {
      const id = isEditing ? editingRuleId : ('rule_' + Math.random().toString(36).substring(7).toUpperCase());
      const problems = problemsRaw ? problemsRaw.split(',').map(p => p.trim()).filter(Boolean) : [];

      await setDoc(doc(db, 'recommendation_rules', id), {
        id,
        category,
        subcategory,
        problems,
        recommended_services: selectedSlugs,
        priority,
        severity,
      }, { merge: true });

      toast.success(isEditing ? 'Rule updated successfully!' : 'Recommendation rule added successfully!', { id: toastId });
      
      // Reset form states
      setCreating(false);
      setEditingRuleId(null);
      setSubcategory('');
      setProblemsRaw('');
      setSelectedSlugs([]);
      setPriority(1);
      setSeverity('medium');
      fetchRulesAndServices();
    } catch (err: any) {
      toast.error('Failed to save rule: ' + err.message, { id: toastId });
    }
  };

  const handleEditClick = (rule: RecRule) => {
    setEditingRuleId(rule.id);
    setCategory(rule.category);
    setSubcategory(rule.subcategory || '');
    setProblemsRaw(rule.problems ? rule.problems.join(', ') : '');
    setSelectedSlugs(rule.recommended_services || []);
    setPriority(rule.priority || 1);
    setSeverity(rule.severity || 'medium');
    setCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await deleteDoc(doc(db, 'recommendation_rules', id));
      toast.success('Recommendation rule deleted.');
      fetchRulesAndServices();
    } catch (e) {
      toast.error('Failed to delete rule.');
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
          <h2 className="font-display text-lg font-medium text-foreground">Recommendation Mapping Rules</h2>
          <p className="text-xs text-muted-foreground">Map client questionnaires, concerns, and categories to recommended services.</p>
        </div>
        {!creating && (
          <Button onClick={() => {
            setEditingRuleId(null);
            setSubcategory('');
            setProblemsRaw('');
            setSelectedSlugs([]);
            setCreating(true);
          }} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-1">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreateOrUpdate} className="rounded-3xl border border-border bg-card p-6 space-y-4 text-left shadow-soft">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="font-display text-md font-semibold text-foreground">
              {editingRuleId ? 'Edit Recommendation Rule' : 'Add Recommendation Rule'}
            </h3>
            <Button size="sm" type="button" variant="ghost" onClick={() => {
              setCreating(false);
              setEditingRuleId(null);
            }} className="rounded-full">&times; Close</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="relationships">Relationships</option>
                <option value="health">Health & Vitality</option>
                <option value="finances">Finances & Abundance</option>
                <option value="general">General / Other</option>
              </select>
            </div>
            <div>
              <Label>Subcategory (Optional)</Label>
              <Input
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g. Family"
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label>Problem Tags (Optional - comma separated)</Label>
            <Input
              value={problemsRaw}
              onChange={(e) => setProblemsRaw(e.target.value)}
              placeholder="e.g. Setting boundaries, Carrier guilt"
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Priority Rank</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label>Severity Level</Label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="low">Low Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="high">High Severity</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Recommended Services (Choose one or more)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1.5">
              {services.map((s) => {
                const checked = selectedSlugs.includes(s.slug);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const nextSlugs = checked
                          ? selectedSlugs.filter((slug) => slug !== s.slug)
                          : [...selectedSlugs, s.slug];
                        setSelectedSlugs(nextSlugs);
                      }}
                      className="rounded border-border text-gold focus:ring-gold"
                    />
                    {s.title}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6">
              {editingRuleId ? 'Update Mapping Rule' : 'Save Mapping Rule'}
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              setCreating(false);
              setEditingRuleId(null);
            }} className="rounded-full px-6">
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rules.map((r) => (
          <div key={r.id} className="rounded-3xl border border-border bg-card p-5 text-left flex flex-col justify-between hover:border-gold/30 hover:shadow-soft transition-all duration-300">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gold shrink-0" />
                  <span className="font-semibold text-foreground text-sm capitalize">Rule: {r.category}</span>
                </div>
                <span className="rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  Severity: {r.severity}
                </span>
              </div>

              <ul className="space-y-1 text-xs text-muted-foreground">
                {r.subcategory && (
                  <li>
                    <span className="font-medium text-foreground">Area:</span> {r.subcategory}
                  </li>
                )}
                {r.problems && r.problems.length > 0 && (
                  <li>
                    <span className="font-medium text-foreground">Problems:</span> {r.problems.join(', ')}
                  </li>
                )}
                <li className="pt-2 border-t border-border/20 mt-2">
                  <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider block mb-1">Recommended Services</span>
                  <div className="flex flex-wrap gap-1">
                    {r.recommended_services.map((slug) => (
                      <span key={slug} className="bg-secondary/60 text-[9px] px-2.5 py-1 rounded-full font-medium text-foreground">
                        {slug}
                      </span>
                    ))}
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/20 mt-4">
              <Button size="sm" variant="ghost" onClick={() => handleEditClick(r)} className="rounded-full text-xs h-7 px-3 hover:text-gold hover:bg-gold/10">
                <Edit2 className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} className="rounded-full text-xs h-7 px-3 hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
