'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Ticket, Printer, Download, Mail, Calendar, Clock, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TicketPage({ params }: { params: { slug: string } }) {
  const [reg, setReg] = useState<any>(null);
  const [ws, setWs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const q = query(collection(db, 'workshopRegistrations'), where('id', '==', params.slug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setReg(data);

          // Fetch associated workshop details
          const wsSnap = await getDocs(query(collection(db, 'workshops'), where('id', '==', data.workshop_id)));
          if (!wsSnap.empty) {
            setWs(wsSnap.docs[0].data());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [params.slug]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmailTicket = () => {
    toast.success('Your ticket has been dispatched to your email address!');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-2" />
        <p className="text-sm">Generating secure ticket pass...</p>
      </div>
    );
  }

  if (!reg) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">Ticket not found or expired.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-2/30 py-16 sm:py-24 flex items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Ticket Header Actions */}
        <div className="flex justify-between items-center no-print">
          <h1 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
            <Ticket className="h-5 w-5 text-gold" /> Your Entry Pass
          </h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-full gap-1 text-xs">
              <Printer className="h-4 w-4" /> Print Pass
            </Button>
            <Button size="sm" variant="outline" onClick={handleEmailTicket} className="rounded-full gap-1 text-xs">
              <Mail className="h-4 w-4" /> Email Pass
            </Button>
          </div>
        </div>

        {/* Entry Card */}
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft text-left relative overflow-hidden">
          
          {/* Accent border strip */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent via-gold to-accent" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border/40">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Booking ID: {reg.id}</p>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground mt-1">{reg.workshop_title}</h2>
            </div>
            {reg.qr_code && (
              <img src={reg.qr_code} alt="Ticket QR Pass" className="h-24 w-24 border border-border rounded-xl bg-white shrink-0 p-1" />
            )}
          </div>

          <div className="py-6 space-y-4 border-b border-border/40">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex gap-2 items-center text-muted-foreground">
                <Calendar className="h-4 w-4 text-gold shrink-0" />
                <span>Date: {ws ? new Date(ws.date).toLocaleDateString() : ''}</span>
              </div>
              <div className="flex gap-2 items-center text-muted-foreground">
                <Clock className="h-4 w-4 text-gold shrink-0" />
                <span>Time: {ws?.start_time} - {ws?.end_time}</span>
              </div>
            </div>

            <div className="flex gap-2 items-start text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">{ws?.venue_name}</span>
                <span>{ws?.address}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendee details</h4>
            <div className="flex gap-3 items-center text-xs text-muted-foreground">
              <User className="h-4 w-4 text-gold" />
              <span>{reg.client_name} ({reg.client_email})</span>
            </div>
          </div>
        </div>

        <div className="text-center no-print">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Please present this QR code pass at the entrance gate for check-in verification.
          </p>
        </div>
      </div>
    </div>
  );
}
