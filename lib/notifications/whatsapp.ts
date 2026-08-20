export interface WhatsAppConfig {
  provider: 'wasender';
  wasender_api_key?: string;
  wasender_session_id?: string;
  wasender_owner_phone?: string;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  // Fall back to environment variables
  return {
    provider: 'wasender',
    wasender_api_key: process.env.WASENDER_API_KEY,
    wasender_session_id: process.env.WASENDER_SESSION_ID || '105612',
    wasender_owner_phone: process.env.WASENDER_OWNER_PHONE || '917485001044',
  };
}

/**
 * Sends a WhatsApp message using WasenderAPI.
 */
export async function sendWhatsAppMessage(to: string, messageText: string, templateData?: any): Promise<any> {
  const config = await getWhatsAppConfig();
  const apiKey = config.wasender_api_key;
  
  if (!apiKey) {
    console.warn('[WhatsApp] WASENDER_API_KEY is not configured. Skipping WhatsApp dispatch.');
    return { skipped: true, reason: 'Wasender API key missing' };
  }

  const cleanPhone = to.replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    console.warn('[WhatsApp] Recipient phone number is empty after cleaning. Skipping.');
    return { skipped: true, reason: 'Empty phone number' };
  }

  const url = 'https://www.wasenderapi.com/api/send-message';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    to: cleanPhone,
    text: messageText,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || (result && result.success === false)) {
      console.warn(`[WhatsApp] Skipping WhatsApp dispatch because Wasender API returned an error: ${JSON.stringify(result)}`);
      return { skipped: true, success: false, reason: result?.message || 'Wasender API error' };
    }
    console.log(`[WhatsApp] Wasender notification successfully sent to ${cleanPhone}`);
    return result;
  } catch (error: any) {
    console.warn(`[WhatsApp] Skipping WhatsApp dispatch because the API is not available or failed:`, error.message);
    return { skipped: true, success: false, reason: error.message };
  }
}
