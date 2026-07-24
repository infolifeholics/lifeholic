'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, AlertTriangle, ShieldCheck, Calendar, Award, FileText, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type VerifiedCert = {
  client_name: string;
  workshop_title: string;
  certificate_number: string;
  certificate_date?: string;
  certificate_status?: string;
};

export default function VerifyCertificatePage() {
  const params = useParams();
  const certId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<VerifiedCert | null>(null);

  useEffect(() => {
    if (!certId) return;
    const q = query(
      collection(db, 'workshopRegistrations'),
      where('certificate_number', '==', certId)
    );
    getDocs(q)
      .then((snap) => {
        if (!snap.empty) {
          setCert(snap.docs[0].data() as VerifiedCert);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [certId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-gold font-display text-2xl font-bold tracking-wider">
          LifeHolics
        </div>
        <h2 className="mt-6 text-center text-2xl font-display font-medium text-foreground">
          Somatic Credential Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card border border-border/60 py-8 px-6 shadow-soft rounded-3xl space-y-6 text-left">
          {cert ? (
            <>
              {/* Valid Status */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 items-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-400 text-sm">Certificate Valid</h4>
                  <p className="text-[11px] text-muted-foreground">This credential represents verified somatic course completion.</p>
                </div>
              </div>

              {/* Data list */}
              <div className="space-y-4 text-xs">
                <div className="pb-3 border-b border-border/20 flex items-start gap-2.5">
                  <Award className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Recipient</span>
                    <span className="font-semibold text-foreground text-sm">{cert.client_name}</span>
                  </div>
                </div>

                <div className="pb-3 border-b border-border/20 flex items-start gap-2.5">
                  <FileText className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Workshop Gatherings</span>
                    <span className="font-semibold text-foreground text-sm">{cert.workshop_title}</span>
                  </div>
                </div>

                <div className="pb-3 border-b border-border/20 flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Date Completed</span>
                    <span className="font-semibold text-foreground text-sm">{cert.certificate_date || 'N/A'}</span>
                  </div>
                </div>

                <div className="pb-3 border-b border-border/20 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Credential Number</span>
                    <span className="font-semibold text-foreground text-sm font-mono">{cert.certificate_number}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-foreground">Certificate Not Found</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The requested credential identifier does not match any certificate in our registry. Please verify the URL or barcode scan.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 text-center">
            <Link href="/">
              <span className="text-xs text-gold hover:text-gold-hover hover:underline cursor-pointer">
                Return to LifeHolics Home
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
