'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit2, Check, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SubCategory = {
  name: string;
  problems: string[];
};

type Category = {
  id: string;
  label: string;
  subs: SubCategory[];
};

type SomaticPlanSettings = {
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
  essential_title: 'Somatic Essential',
  essential_price_inr: 2500,
  essential_short: 'A starting point for somatic exploration and short release sessions.',
  essential_benefits: '1 targeted somatic clarity session (30m)\nCustomized diagnostic profiling\nActionable home practices guide\nEmail-only support channel',

  premium_title: 'Somatic Premium',
  premium_price_inr: 8500,
  premium_short: 'Our most popular plan with comprehensive somatic care.',
  premium_benefits: '4 private somatic therapy sessions (60m)\nCustom daily somatic practices outline\nDirect WhatsApp guidance support\nWeekly progress check-in chats\nFree access to mindfulness archives',

  elite_title: 'Somatic Elite',
  elite_price_inr: 15000,
  elite_short: 'Premium high-touch support for total somatic transformation.',
  elite_benefits: '8 private somatic therapy sessions (60m)\n24/7 priority messaging with head healer\nPersonalized lifestyle & posture coaching\nBi-weekly home visits (selected locations)\nSomatic program certificate upon completion',
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'relationships',
    label: 'Relationships',
    subs: [
      {
        name: 'Family',
        problems: [
          'Constant arguments or misunderstandings',
          'Lack of emotional support',
          'Feeling unheard or unappreciated',
          'In-law conflicts',
          'Parent-child relationship challenges',
          'Sibling conflicts',
          'Family interference in personal decisions',
          'Feeling emotionally distant from family',
          'Setting healthy boundaries',
          'Carrying guilt, resentment, or past hurt',
          'Caregiving stress (aging parents or family responsibilities)',
          'Family expectations and pressure',
        ]
      },
      {
        name: 'Friends',
        problems: [
          'Trust issues',
          'Feeling left out or disconnected',
          'Friendship breakups',
          'Jealousy or comparison',
          'Miscommunication',
          'One-sided friendships',
          'Difficulty making genuine friends',
          'People-pleasing',
          'Betrayal or gossip',
          'Struggling to set boundaries',
          'Loneliness despite having friends',
        ]
      },
      {
        name: 'Partner / Marriage',
        problems: [
          'Frequent fights and misunderstandings',
          'Poor communication',
          'Trust issues',
          'Emotional distance',
          'Lack of intimacy or affection',
          'Feeling unloved or unappreciated',
          'Infidelity or betrayal',
          'Controlling or toxic relationship',
          'Financial conflicts',
          'Parenting disagreements',
          'Difficulty expressing emotions',
          'Separation, breakup, or divorce',
          'Commitment issues',
          'Constant criticism or blame',
        ]
      }
    ]
  },
  {
    id: 'health',
    label: 'Health & Well Being',
    subs: [
      {
        name: 'Mental & Emotional Health',
        problems: [
          'Constant overthinking.',
          'Feeling anxious or worried most of the time.',
          'Frequent mood swings.',
          'Feeling emotionally overwhelmed.',
          'Difficulty sleeping or restless sleep.',
          'Feeling low, unmotivated, or emotionally drained.',
          'Loss of interest in things you once enjoyed.',
          'Feeling disconnected from yourself or others.',
          'Constant fear or insecurity.',
          'Difficulty concentrating or making decisions.',
          'Feeling mentally exhausted without a clear reason.',
          'Frequent negative thoughts or self-doubt.',
          'Feeling emotionally stuck.',
          'Struggling to let go of past experiences.',
          'Feeling like you’re carrying an emotional burden all the time.',
        ]
      },
      {
        name: 'Physical Health',
        problems: [
          'Frequent body aches or pain.',
          'Low energy or constant fatigue.',
          'Recurring health issues.',
          'Slow recovery from illness.',
          'Poor sleep or waking up feeling tired.',
          'Frequent headaches or migraines.',
          'Digestive issues.',
          'Hormonal imbalances.',
          'Unexplained physical discomfort despite normal medical reports.',
          'Feeling heavy or drained throughout the day.',
          'Frequent tension in the neck, shoulders, or back.',
          'Weakened immunity or falling sick often.',
          'Feeling physically exhausted even after adequate rest.',
          'A general feeling that your body is not functioning at its best.',
        ]
      }
    ]
  },
  {
    id: 'finances',
    label: 'Finances & Career',
    subs: [
      {
        name: 'Sudden Financial Setbacks',
        problems: [
          'Your finances suddenly started declining without a clear reason.',
          'Unexpected expenses keep arising one after another.',
          'Money comes in but leaves just as quickly.',
          'Business or career growth has suddenly slowed down.',
          'Payments are getting delayed or opportunities are falling through.',
          'You feel financially stuck despite putting in your best efforts.',
          'New financial problems keep appearing unexpectedly.',
          'You have recently started feeling blocked around money, even though things were going well before.',
          'You constantly feel anxious or fearful about your finances.',
          'Opportunities that once came easily now seem to disappear.',
          'You feel as if something is stopping your financial growth, even though you’re taking the right actions.',
          'You feel unusually drained, overwhelmed, or energetically heavy when it comes to money or work.',
        ]
      },
      {
        name: 'Ancestral Money Patterns',
        problems: [
          'Despite working hard, money doesn’t seem to stay.',
          'Income remains stuck at the same level for years.',
          'Financial growth feels blocked, even when opportunities arise.',
          'The same money struggles keep repeating across generations.',
          'There is a constant fear of not having enough.',
          'Success feels difficult to sustain.',
          'Unexpected financial setbacks happen repeatedly.',
          'A pattern of debt or financial instability keeps returning.',
          'Feeling guilty or uncomfortable about earning or receiving more.',
          'Self-sabotaging opportunities for growth without understanding why.',
          'Feeling that no matter how much effort is made, there is little progress.',
          'Family beliefs such as “Money is hard to earn,” “Rich people are not good,” or “People like us can’t become wealth” continue to influence decisions.',
          'Feeling emotionally burdened whenever money is discussed.',
          'Difficulty receiving abundance despite sincere effort.',
        ]
      }
    ]
  }
];

export function AdminSearchOptions() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [somaticSettings, setSomaticSettings] = useState<SomaticPlanSettings>(DEFAULT_SOMATIC_PLAN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selections
  const [selectedCatIdx, setSelectedCatIdx] = useState<number>(0);
  const [selectedSubIdx, setSelectedSubIdx] = useState<number>(0);

  // Editing names states
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editCatVal, setEditCatVal] = useState('');

  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);
  const [editSubVal, setEditSubVal] = useState('');

  const [editingProbIdx, setEditingProbIdx] = useState<number | null>(null);
  const [editProbVal, setEditProbVal] = useState('');

  // Add inputs
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newProblem, setNewProblem] = useState('');

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Fetch Somatic Search Categories & Checklists
        const docRef = doc(db, 'settings', 'search_options');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setCategories(snap.data().categories || DEFAULT_CATEGORIES);
        } else {
          await setDoc(docRef, { categories: DEFAULT_CATEGORIES });
          setCategories(DEFAULT_CATEGORIES);
        }

        // Fetch Somatic Plans/Prices settings
        const somaticDocRef = doc(db, 'settings', 'somatic_plans');
        const somaticSnap = await getDoc(somaticDocRef);
        if (somaticSnap.exists()) {
          const data = somaticSnap.data();
          setSomaticSettings({
            essential_title: data.essential_title || DEFAULT_SOMATIC_PLAN_SETTINGS.essential_title,
            essential_price_inr: data.essential_price_inr ?? DEFAULT_SOMATIC_PLAN_SETTINGS.essential_price_inr,
            essential_short: data.essential_short || DEFAULT_SOMATIC_PLAN_SETTINGS.essential_short,
            essential_benefits: Array.isArray(data.essential_benefits) 
              ? data.essential_benefits.join('\n') 
              : (data.essential_benefits || DEFAULT_SOMATIC_PLAN_SETTINGS.essential_benefits),
            premium_title: data.premium_title || DEFAULT_SOMATIC_PLAN_SETTINGS.premium_title,
            premium_price_inr: data.premium_price_inr ?? DEFAULT_SOMATIC_PLAN_SETTINGS.premium_price_inr,
            premium_short: data.premium_short || DEFAULT_SOMATIC_PLAN_SETTINGS.premium_short,
            premium_benefits: Array.isArray(data.premium_benefits) 
              ? data.premium_benefits.join('\n') 
              : (data.premium_benefits || DEFAULT_SOMATIC_PLAN_SETTINGS.premium_benefits),
            elite_title: data.elite_title || DEFAULT_SOMATIC_PLAN_SETTINGS.elite_title,
            elite_price_inr: data.elite_price_inr ?? DEFAULT_SOMATIC_PLAN_SETTINGS.elite_price_inr,
            elite_short: data.elite_short || DEFAULT_SOMATIC_PLAN_SETTINGS.elite_short,
            elite_benefits: Array.isArray(data.elite_benefits) 
              ? data.elite_benefits.join('\n') 
              : (data.elite_benefits || DEFAULT_SOMATIC_PLAN_SETTINGS.elite_benefits),
          });
        }
      } catch (err: any) {
        toast.error('Failed to load settings: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving configurations...');
    try {
      // 1. Save Somatic Search Categories & Options
      await setDoc(doc(db, 'settings', 'search_options'), { categories });

      // 2. Save Somatic Plans Configuration
      const finalSomaticPlans = {
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
      await setDoc(doc(db, 'settings', 'somatic_plans'), finalSomaticPlans, { merge: true });

      toast.success('All configurations saved successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to save configurations: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // CATEGORY OPERATIONS
  const addCategory = () => {
    if (!newCatLabel.trim()) return;
    const id = newCatLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCat: Category = {
      id,
      label: newCatLabel.trim(),
      subs: []
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatLabel('');
    setSelectedCatIdx(categories.length);
    setSelectedSubIdx(0);
    toast.success('Category added.');
  };

  const deleteCategory = (idx: number) => {
    if (!confirm('Are you sure you want to delete this entire category and its subcategories?')) return;
    setCategories((prev) => prev.filter((_, i) => i !== idx));
    setSelectedCatIdx(0);
    setSelectedSubIdx(0);
  };

  // SUBCATEGORY OPERATIONS
  const addSubcategory = () => {
    if (categories.length === 0) return;
    if (!newSubName.trim()) return;
    const updated = [...categories];
    const newSub: SubCategory = {
      name: newSubName.trim(),
      problems: []
    };
    updated[selectedCatIdx].subs.push(newSub);
    setCategories(updated);
    setNewSubName('');
    setSelectedSubIdx(updated[selectedCatIdx].subs.length - 1);
    toast.success('Subcategory added.');
  };

  const deleteSubcategory = (subIdx: number) => {
    if (!confirm('Are you sure you want to delete this subcategory and all its checklist problems?')) return;
    const updated = [...categories];
    updated[selectedCatIdx].subs = updated[selectedCatIdx].subs.filter((_, i) => i !== subIdx);
    setCategories(updated);
    setSelectedSubIdx(0);
  };

  // PROBLEM OPERATIONS
  const addProblem = () => {
    if (categories.length === 0 || categories[selectedCatIdx]?.subs.length === 0) return;
    if (!newProblem.trim()) return;
    const updated = [...categories];
    updated[selectedCatIdx].subs[selectedSubIdx].problems.push(newProblem.trim());
    setCategories(updated);
    setNewProblem('');
    toast.success('Checklist problem point added.');
  };

  const deleteProblem = (probIdx: number) => {
    const updated = [...categories];
    updated[selectedCatIdx].subs[selectedSubIdx].problems = updated[selectedCatIdx].subs[selectedSubIdx].problems.filter((_, i) => i !== probIdx);
    setCategories(updated);
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const activeCategory = categories[selectedCatIdx];
  const activeSubcategory = activeCategory?.subs?.[selectedSubIdx];

  return (
    <div className="space-y-8">
      {/* 1. Header with Save Changes */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">Somatic Search &amp; Package Editor</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Customize somatic search categories, helper checklists, and package plans/pricing.</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving} className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground flex items-center gap-1.5 shadow-md">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All Changes
        </Button>
      </div>

      {/* 2. Somatic Search Configurator Column Cards */}
      <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Somatic Helper Search Config</h3>
          <p className="text-xs text-muted-foreground">Manage selection tabs and questions displayed on the landing page.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* COLUMN 1: CATEGORIES */}
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold">1. Main Categories</h4>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {categories.map((cat, idx) => {
                const isEditing = editingCatIdx === idx;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      if (!isEditing) {
                        setSelectedCatIdx(idx);
                        setSelectedSubIdx(0);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all",
                      selectedCatIdx === idx 
                        ? "bg-primary/10 border-primary text-foreground" 
                        : "bg-secondary/40 border-border/30 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editCatVal}
                          onChange={(e) => setEditCatVal(e.target.value)}
                          className="h-8 text-xs rounded-xl"
                        />
                        <Button
                          size="sm"
                          className="h-8 px-2 rounded-xl"
                          onClick={() => {
                            const updated = [...categories];
                            updated[idx].label = editCatVal;
                            setCategories(updated);
                            setEditingCatIdx(null);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 rounded-xl"
                          onClick={() => setEditingCatIdx(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span>{cat.label}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCatIdx(idx);
                              setEditCatVal(cat.label);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCategory(idx);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-rose-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/40 space-y-2">
              <Label className="text-[10px] text-muted-foreground">Add New Category</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Mindset"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
                <Button onClick={addCategory} size="sm" className="h-8 px-3 rounded-full">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* COLUMN 2: SUBCATEGORIES */}
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold">2. Subcategories</h4>

            {activeCategory ? (
              <>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {activeCategory.subs.map((sub, idx) => {
                    const isEditing = editingSubIdx === idx;
                    return (
                      <div
                        key={sub.name}
                        onClick={() => {
                          if (!isEditing) setSelectedSubIdx(idx);
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all",
                          selectedSubIdx === idx 
                            ? "bg-primary/10 border-primary text-foreground" 
                            : "bg-secondary/40 border-border/30 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        )}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editSubVal}
                              onChange={(e) => setEditSubVal(e.target.value)}
                              className="h-8 text-xs rounded-xl"
                            />
                            <Button
                              size="sm"
                              className="h-8 px-2 rounded-xl"
                              onClick={() => {
                                const updated = [...categories];
                                updated[selectedCatIdx].subs[idx].name = editSubVal;
                                setCategories(updated);
                                setEditingSubIdx(null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 rounded-xl"
                              onClick={() => setEditingSubIdx(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span>{sub.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSubIdx(idx);
                                  setEditSubVal(sub.name);
                                }}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSubcategory(idx);
                                }}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-rose-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  <Label className="text-[10px] text-muted-foreground">Add Subcategory to {activeCategory.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Workplace Stress"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                    <Button onClick={addSubcategory} size="sm" className="h-8 px-3 rounded-full">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-12 text-center">Select a Category first.</p>
            )}
          </div>

          {/* COLUMN 3: PROBLEMS / CHECKLIST POINTS */}
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold">3. Checklist Problems</h4>

            {activeSubcategory ? (
              <>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {activeSubcategory.problems.map((prob, idx) => {
                    const isEditing = editingProbIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl border bg-secondary/20 border-border/30 text-xs font-medium text-foreground"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <Input
                              value={editProbVal}
                              onChange={(e) => setEditProbVal(e.target.value)}
                              className="h-8 text-xs rounded-xl"
                            />
                            <Button
                              size="sm"
                              className="h-8 px-2 rounded-xl"
                              onClick={() => {
                                const updated = [...categories];
                                updated[selectedCatIdx].subs[selectedSubIdx].problems[idx] = editProbVal;
                                setCategories(updated);
                                setEditingProbIdx(null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 rounded-xl"
                              onClick={() => setEditingProbIdx(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 pr-2 leading-relaxed">{prob}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingProbIdx(idx);
                                  setEditProbVal(prob);
                                }}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => deleteProblem(idx)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-rose-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  <Label className="text-[10px] text-muted-foreground">Add Checklist Point to {activeSubcategory.name}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Constant feeling of being burnt out"
                      value={newProblem}
                      onChange={(e) => setNewProblem(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                    <Button onClick={addProblem} size="sm" className="h-8 px-3 rounded-full">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-12 text-center">Select a Subcategory first.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Somatic Plans Configurator */}
      <div className="rounded-3xl border border-border bg-card p-6 space-y-6 text-left shadow-soft">
        <div>
          <h3 className="font-display text-lg font-medium text-foreground">Somatic Plans Configurator</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Edit titles, prices, descriptions, and feature checklists for Somatic Search Plans.</p>
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
      </div>
    </div>
  );
}
