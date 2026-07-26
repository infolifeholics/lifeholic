import { TemplateVars } from '@/lib/notifications/templates';

export type NotificationChannel = 'email' | 'whatsapp' | 'both';

export type NotificationType =
  | 'welcome'
  | 'booking_confirmation'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'booking_status_changed'
  | 'certificate_generated'
  | 'rec_letter_generated'
  | 'password_reset'
  | 'admin_alert';

export interface NotificationJob {
  /** Unique idempotency key — used to prevent duplicate sends */
  jobId: string;
  /** Notification template type */
  type: NotificationType;
  /** Target email address (empty string if email not applicable) */
  recipientEmail: string;
  /** Target phone number with country code, or null */
  recipientPhone: string | null;
  /** Template variable data */
  vars: TemplateVars;
  /** Related booking ID (optional) */
  bookingId?: string;
  /** Firebase Auth user ID (optional) */
  userId?: string;
  /** Which channels to send on */
  channel: NotificationChannel;
  /** Current retry attempt number (0 = first attempt) */
  attempt: number;
  /** ISO timestamp when job was first created */
  createdAt: string;
}

export interface NotificationLogEntry {
  jobId: string;
  userId: string | null;
  bookingId: string | null;
  notificationType: NotificationType;
  channel: 'Email' | 'WhatsApp';
  provider: string;
  recipient: string;
  deliveryStatus: 'pending' | 'processing' | 'delivered' | 'failed';
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  processingMs?: number;
  errorMessage?: string | null;
  providerResponse?: string | null;
}

export interface DLQEntry {
  jobId: string;
  notificationType: NotificationType;
  bookingId: string | null;
  userId: string | null;
  channel: NotificationChannel;
  provider: string;
  retryCount: number;
  failureReason: string;
  failedAt: string;
  payload: NotificationJob;
}
