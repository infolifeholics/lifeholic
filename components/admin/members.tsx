'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Phone, Mail, MessageSquare, ExternalLink, Calendar, Package, ArrowLeft, User, Activity, Trash2, Key } from 'lucide-react';
import { formatPrice, formatInTz } from '@/lib/format';
import { toast } from 'sonner';

type Member = {
  id: string;
  member_id?: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  bio?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  timezone?: string | null;
};

type Order = {
  id: string;
  number: string;
  total: number;
  currency: string;
  created_at: string;
  status: string;
  items: Array<{ name: string; quantity: number }>;
};

type Booking = {
  id: string;
  start_time: string;
  status: string;
  mode: string;
  service_title?: string;
  session_number?: number | null;
  is_somatic_plan?: boolean | null;
  admin_notes?: string | null;
};

export function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedMemberOrders, setSelectedMemberOrders] = useState<Order[]>([]);
  const [selectedMemberBookings, setSelectedMemberBookings] = useState<Booking[]>([]);
  const [selectedMemberPackages, setSelectedMemberPackages] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingPass, setSendingPass] = useState(false);
  const [sentPass, setSentPass] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    } catch (err: any) {
      toast.error('Failed to load members: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberDetails = async (member: Member) => {
    setSelectedMember(member);
    setLoadingDetails(true);
    setSentPass(false);
    try {
      // Fetch Orders for user
      const qOrders = query(collection(db, 'orders'), where('user_id', '==', member.id));
      const snapOrders = await getDocs(qOrders);
      setSelectedMemberOrders(snapOrders.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));

      // Fetch Bookings for user
      const qBookings = query(collection(db, 'bookings'), where('user_id', '==', member.id));
      const snapBookings = await getDocs(qBookings);
      // Sort bookings chronologically (oldest first) to assign correct history sequence indices
      const sortedBookings = snapBookings.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Booking)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      
      setSelectedMemberBookings(sortedBookings);

      // Fetch user packages
      const { query: queryPkg, collection: colPkg, where: wherePkg, getDocs: getDocsPkg } = await import('firebase/firestore');
      const qPackages = queryPkg(colPkg(db, 'somatic_packages'), wherePkg('user_id', '==', member.id));
      const snapPackages = await getDocsPkg(qPackages);
      setSelectedMemberPackages(snapPackages.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Could not load member details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const term = search.toLowerCase();
    return (
      m.id.toLowerCase().includes(term) ||
      (m.member_id || '').toLowerCase().includes(term) ||
      (m.email || '').toLowerCase().includes(term) ||
      (m.full_name || '').toLowerCase().includes(term)
    );
  });

  const sendWhatsApp = (phone: string, name: string) => {
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello ${name}, warm greetings from TheLifeHolics!`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  if (selectedMember) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedMember(null)} className="rounded-full gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to members list
        </Button>

        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          {/* Left: Member Card */}
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full overflow-hidden border border-border/40 bg-secondary flex items-center justify-center mb-4">
                {selectedMember.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedMember.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-display text-xl font-medium text-foreground">{selectedMember.full_name || 'No Name'}</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-1">{selectedMember.member_id || 'No Member ID'}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Bio</span>
                <p className="text-foreground mt-0.5 whitespace-pre-line">{selectedMember.bio || 'No bio added.'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Email</span>
                <p className="text-foreground mt-0.5">{selectedMember.email || 'No email'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Phone</span>
                <p className="text-foreground mt-0.5">{selectedMember.phone || 'No phone'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Shipping Address</span>
                <p className="text-foreground mt-0.5 whitespace-pre-line">{selectedMember.address || 'No address added.'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 flex flex-col gap-2">
              {selectedMember.phone && (
                <Button onClick={() => sendWhatsApp(selectedMember.phone!, selectedMember.full_name || '')} className="rounded-full w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageSquare className="h-4 w-4" /> Message WhatsApp
                </Button>
              )}
              {selectedMember.email && (
                <Button asChild variant="outline" className="rounded-full w-full gap-2">
                  <a href={`mailto:${selectedMember.email}`}>
                    <Mail className="h-4 w-4" /> Email Member
                  </a>
                </Button>
              )}
              {selectedMember.email && (
                <Button
                  onClick={async () => {
                    setSendingPass(true);
                    try {
                      await sendPasswordResetEmail(auth, selectedMember.email!);
                      setSentPass(true);
                      toast.success('Password reset email sent.');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to send reset email.');
                    } finally {
                      setSendingPass(false);
                    }
                  }}
                  disabled={sendingPass || sentPass}
                  variant="outline"
                  className="rounded-full w-full gap-2 border-amber-200/50 hover:bg-amber-500/5"
                >
                  {sendingPass ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 text-amber-500" />
                  )}
                  <span>{sentPass ? 'Sent to mail' : sendingPass ? 'Sending...' : 'Email Pass'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Right: History tabs */}
          <div className="space-y-6">
            {loadingDetails ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading records...
              </div>
            ) : (
              <>
                {/* Orders List */}
                <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
                  <h3 className="font-display text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> Orders History ({selectedMemberOrders.length})
                  </h3>
                  {selectedMemberOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No orders placed by this member.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedMemberOrders.map((o) => (
                        <div key={o.id} className="p-4 border border-border/40 rounded-xl bg-background/50 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-medium text-foreground">{o.number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">{formatPrice(o.total, o.currency as 'INR' | 'USD')}</p>
                            <span className="text-xs text-muted-foreground capitalize">{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Program & Service Packages Info */}
                {selectedMemberPackages.map((pkg) => {
                  const isSomatic = pkg.package_type === 'somatic_plan' || !pkg.package_type;
                  const totalSess = pkg.total_sessions || 4;
                  const completedSess = pkg.completed_sessions || 0;
                  const remainingSess = pkg.remaining_sessions || 0;
                  const sessionArray = Array.from({ length: totalSess }, (_, i) => i + 1);

                  return (
                    <div key={pkg.id} className="rounded-3xl border border-gold/30 bg-gradient-to-r from-card to-secondary/30 p-6 shadow-glow mb-4 text-left">
                      <h3 className="font-display text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-gold" /> {pkg.package_name || (isSomatic ? 'Active Somatic Package' : 'Active Service Package')}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                        <div>
                          <p className="text-muted-foreground">Purchase Date</p>
                          <p className="font-semibold text-foreground">{new Date(pkg.purchase_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expiry Date (31 days)</p>
                          <p className="font-semibold text-foreground">{new Date(pkg.expiry_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sessions Progress</p>
                          <p className="font-semibold text-foreground">
                            {completedSess} Completed · {remainingSess} Remaining
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Package Status</p>
                          <p className="font-semibold text-gold uppercase tracking-wider">{pkg.status}</p>
                        </div>
                      </div>

                      {/* Sessions Checklist */}
                      <div className="pt-3 border-t border-border/20 space-y-1.5 text-xs">
                        <p className="font-semibold text-muted-foreground">Sessions Checklist:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {sessionArray.map((num) => {
                            const linkedBookingId = pkg.booking_ids?.[num - 1];
                            let statusText = 'Available';
                            let icon = '○';
                            
                            if (linkedBookingId) {
                              const b = selectedMemberBookings.find(item => item.id === linkedBookingId);
                              if (b) {
                                if (b.status === 'completed') {
                                  statusText = 'Completed';
                                  icon = '✓';
                                } else if (b.status === 'cancelled' || b.status === 'rejected') {
                                  statusText = 'Available';
                                  icon = '○';
                                } else {
                                  statusText = 'Booked';
                                  icon = '●';
                                }
                              } else {
                                statusText = 'Booked';
                                icon = '●';
                              }
                            } else {
                              if (num > 1) {
                                const prevBookingId = pkg.booking_ids?.[num - 2];
                                const prevB = prevBookingId ? selectedMemberBookings.find(item => item.id === prevBookingId) : null;
                                if (!prevB || prevB.status !== 'completed') {
                                  statusText = 'Locked';
                                  icon = '🔒';
                                }
                              }
                            }

                            return (
                              <div key={num} className="flex items-center gap-1.5 py-0.5">
                                <span className="font-semibold text-gold">{icon}</span>
                                <span className="font-medium text-foreground">Session {num}</span>
                                <span className="text-[10px] text-muted-foreground">({statusText})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bookings/Sessions List */}
                <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
                  <h3 className="font-display text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Booked Sessions ({selectedMemberBookings.length})
                  </h3>
                  {selectedMemberBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No sessions booked by this member.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedMemberBookings.map((b, index) => {
                        const sessionCountText = `${index + 1}${
                          index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'
                        } Session`;

                        return (
                          <div key={b.id} className="p-5 border border-border/40 rounded-2xl bg-background/50 space-y-4">
                            <div className="flex justify-between items-start text-sm gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                                    {sessionCountText}
                                  </span>
                                  <p className="font-medium text-foreground">{b.service_title || `${b.mode === 'offline' ? 'online' : b.mode} Session`}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">{formatInTz(b.start_time, 'Asia/Kolkata', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 bg-secondary border border-border/40 rounded-full capitalize shrink-0">{b.status}</span>
                            </div>

                            {/* Dynamic Debounced Notes Section */}
                            <div className="pt-3 border-t border-border/20 space-y-2 text-left">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Session Notes (Auto-saves while typing)</label>
                              <textarea
                                defaultValue={b.admin_notes || ''}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  try {
                                    // Save dynamically to firebase bookings collection notes
                                    const { doc, setDoc } = await import('firebase/firestore');
                                    await setDoc(doc(db, 'bookings', b.id), {
                                      admin_notes: val,
                                      updated_at: new Date().toISOString()
                                    }, { merge: true });
                                    
                                    // Update locally
                                    setSelectedMemberBookings(prev => 
                                      prev.map(item => item.id === b.id ? { ...item, admin_notes: val } : item)
                                    );
                                  } catch (err) {
                                    console.error('Notes auto-save failed:', err);
                                  }
                                }}
                                placeholder="Write notes during or after the session..."
                                className="w-full text-xs bg-secondary/30 border border-border/40 rounded-xl p-3 focus:outline-none focus:border-gold/50 text-foreground"
                                rows={3}
                              />
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (!confirm('Clear notes for this session?')) return;
                                    try {
                                      const { doc, setDoc } = await import('firebase/firestore');
                                      await setDoc(doc(db, 'bookings', b.id), {
                                        admin_notes: null,
                                        updated_at: new Date().toISOString()
                                      }, { merge: true });
                                      
                                      setSelectedMemberBookings(prev => 
                                        prev.map(item => item.id === b.id ? { ...item, admin_notes: null } : item)
                                      );
                                      toast.success('Notes deleted successfully.');
                                    } catch (err) {
                                      toast.error('Could not clear notes.');
                                    }
                                  }}
                                  className="h-7 text-[10px] rounded-full text-destructive hover:bg-destructive/10 gap-1.5"
                                >
                                  <Trash2 className="h-3 w-3" /> Clear Notes
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>
          <div className="text-sm text-muted-foreground font-semibold">
            Total Members: {filteredMembers.length}
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading list...
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No members found matching that search.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Member Info</th>
                  <th className="pb-3 pr-4">Contact</th>
                  <th className="pb-3 pr-4">Timezone</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="border-b border-border/30 hover:bg-secondary/20 transition-all">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden border border-border/40 bg-secondary flex items-center justify-center">
                          {m.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{m.full_name || 'No name'}</p>
                          <p className="text-xs font-semibold text-primary">{m.member_id || 'No Member ID'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-xs text-foreground">{m.email}</p>
                      <p className="text-xs text-muted-foreground">{m.phone || 'No phone'}</p>
                    </td>
                    <td className="py-4 pr-4 text-xs text-muted-foreground">
                      {m.timezone || 'Asia/Kolkata'}
                    </td>
                    <td className="py-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => loadMemberDetails(m)} className="rounded-full hover:bg-primary/10">
                        View profile <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
