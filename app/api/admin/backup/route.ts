import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { verifyAdminRequest } from '@/lib/booking-utils';

/**
 * GET /api/admin/backup
 * Exports key collections (bookings, profiles, notification_logs, audit_logs, holidays, session_slots)
 * as a unified downloadable JSON archive.
 * Protects route via admin authorization.
 */
export async function GET(req: Request) {
  const isAdmin = await verifyAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const collectionsToBackup = [
      'bookings',
      'profiles',
      'notification_logs',
      'audit_logs',
      'holidays',
      'session_slots'
    ];

    const backupData: Record<string, any[]> = {};

    const backupPromises = collectionsToBackup.map(async (colName) => {
      try {
        const snap = await getDocs(collection(db, colName));
        backupData[colName] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));
      } catch (colErr) {
        console.error(`Backup failed for collection ${colName}:`, colErr);
        backupData[colName] = [];
      }
    });

    await Promise.all(backupPromises);

    const filename = `lifeholics_db_backup_${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('[Backup API] Failure:', err);
    return NextResponse.json({ error: err.message || 'Backup failed' }, { status: 500 });
  }
}
