import nodemailer from 'nodemailer';

export interface EmailConfig {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
  business_name?: string;
}

export async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    // Attempt to load settings/notifications
    const settingsSnap = await getDoc(doc(db, 'settings', 'notifications'));
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      if (data.smtp_host && data.smtp_user) {
        return {
          smtp_host: data.smtp_host,
          smtp_port: Number(data.smtp_port || 465),
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
          smtp_from: data.smtp_from || `"${data.sender_name || 'TheLifeHolics'}" <${data.smtp_user}>`,
        };
      }
    }

    // Fall back to settings/global
    const globalSnap = await getDoc(doc(db, 'settings', 'global'));
    if (globalSnap.exists()) {
      const data = globalSnap.data();
      if (data.smtp_host && data.smtp_user) {
        return {
          smtp_host: data.smtp_host,
          smtp_port: Number(data.smtp_port || 465),
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
          smtp_from: data.smtp_from || `"${data.business_name || 'TheLifeHolics'}" <${data.smtp_user}>`,
        };
      }
    }
  } catch (e) {
    console.error('[EmailConfig] Error reading settings from firestore:', e);
  }

  // Fall back to environment variables
  return {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: Number(process.env.SMTP_PORT || 465),
    smtp_user: process.env.SMTP_USER,
    smtp_password: process.env.SMTP_PASSWORD,
    smtp_from: process.env.SMTP_FROM || '"LifeHolics" <support@thelifeholics.com>',
  };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<any> {
  const config = await getEmailConfig();

  if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
    console.warn('[Email] SMTP settings not configured. Skipping email dispatch.');
    return { skipped: true, reason: 'SMTP credentials missing' };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_port === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_password,
    },
  });

  let targetTo = to;
  let finalSubject = subject;
  if (process.env.EMAIL_DEMO_MODE === 'true') {
    targetTo = 'support@thelifeholics.com';
    finalSubject = `DEMO - [To: ${to}] - ${subject}`;
  }

  const info = await transporter.sendMail({
    from: config.smtp_from,
    to: targetTo,
    subject: finalSubject,
    html,
  });

  return info;
}
