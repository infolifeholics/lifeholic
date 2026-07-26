export interface WhatsAppConfig {
  provider: 'meta' | 'twilio';
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    // Load settings/notifications
    const snap = await getDoc(doc(db, 'settings', 'notifications'));
    if (snap.exists()) {
      const data = snap.data();
      return {
        provider: data.whatsapp_provider || 'meta',
        whatsapp_access_token: data.whatsapp_access_token,
        whatsapp_phone_number_id: data.whatsapp_phone_number_id,
        twilio_account_sid: data.twilio_account_sid,
        twilio_auth_token: data.twilio_auth_token,
        twilio_phone_number: data.twilio_phone_number,
      };
    }
  } catch (e) {
    console.error('[WhatsAppConfig] Error loading settings:', e);
  }

  // Fall back to environment variables
  return {
    provider: (process.env.WHATSAPP_PROVIDER as any) || 'meta',
    whatsapp_access_token: process.env.WHATSAPP_ACCESS_TOKEN,
    whatsapp_phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
    twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
    twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
    twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+14155238886',
  };
}

export async function sendWhatsAppMessage(to: string, messageText: string, templateData?: any): Promise<any> {
  const config = await getWhatsAppConfig();
  const cleanPhone = to.replace(/[^0-9]/g, '');

  if (config.provider === 'meta') {
    const token = config.whatsapp_access_token;
    const phoneId = config.whatsapp_phone_number_id;
    if (!token || !phoneId) {
      console.warn('[WhatsApp] Meta Cloud credentials not configured. Skipping WhatsApp.');
      return { skipped: true, reason: 'Meta credentials missing' };
    }

    const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
    };

    if (templateData) {
      payload.type = 'template';
      payload.template = {
        name: templateData.name,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: templateData.params.map((p: any) => ({ type: 'text', text: String(p) })),
          },
        ],
      };
    } else {
      payload.type = 'text';
      payload.text = { body: messageText };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(result)}`);
    }
    return result;
  } else if (config.provider === 'twilio') {
    const sid = config.twilio_account_sid;
    const token = config.twilio_auth_token;
    const fromPhone = config.twilio_phone_number;

    if (!sid || !token || !fromPhone) {
      console.warn('[WhatsApp] Twilio credentials not configured. Skipping WhatsApp.');
      return { skipped: true, reason: 'Twilio credentials missing' };
    }

    // Twilio REST API uses basic auth and form URL encoding
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const authString = Buffer.from(`${sid}:${token}`).toString('base64');
    
    const body = new URLSearchParams();
    body.append('To', `whatsapp:+${cleanPhone}`);
    body.append('From', fromPhone.startsWith('whatsapp:') ? fromPhone : `whatsapp:${fromPhone}`);
    body.append('Body', messageText);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`Twilio API error: ${JSON.stringify(result)}`);
    }
    return result;
  } else {
    throw new Error(`Unsupported WhatsApp provider: ${config.provider}`);
  }
}
