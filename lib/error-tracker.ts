import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface SystemErrorLog {
  message: string;
  category: 'API' | 'Queue' | 'Worker' | 'Email' | 'WhatsApp' | 'Booking';
  stack?: string;
  userId?: string | null;
  bookingId?: string | null;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Centrally tracks system, worker, and provider errors to Firestore 'error_logs'.
 */
export async function logSystemError(
  message: string,
  category: SystemErrorLog['category'],
  context: {
    error?: any;
    userId?: string | null;
    bookingId?: string | null;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    const stack = context.error instanceof Error ? context.error.stack : undefined;
    const log: SystemErrorLog = {
      message,
      category,
      stack,
      userId: context.userId || null,
      bookingId: context.bookingId || null,
      timestamp: new Date().toISOString(),
      metadata: context.metadata || undefined,
    };

    console.error(`[SystemErrorLog] [${category}] ${message}`, context.error || '');
    await addDoc(collection(db, 'error_logs'), log);
  } catch (err) {
    console.error('[SystemErrorLog] Critical failure logging error to database:', err);
  }
}
