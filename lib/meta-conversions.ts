type MetaPurchaseInput = {
  eventId: string;
  value: number;
  currency: string;
  contentIds: string[];
  numItems: number;
  requestUrl: string;
  headers: Headers;
  cookies: { get: (name: string) => { value: string } | undefined };
};

export async function sendMetaPurchase(input: MetaPurchaseInput): Promise<boolean> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return false;

  const forwardedFor = input.headers.get('x-forwarded-for');
  const userData: Record<string, string> = {};
  const ip = forwardedFor?.split(',')[0]?.trim();
  const userAgent = input.headers.get('user-agent');
  const fbp = input.cookies.get('_fbp')?.value;
  const fbc = input.cookies.get('_fbc')?.value;
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(input.requestUrl).origin;
  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    event_source_url: `${siteUrl.replace(/\/$/, '')}/shop/checkout`,
    user_data: userData,
    custom_data: {
      value: input.value,
      currency: input.currency,
      content_ids: input.contentIds,
      content_type: 'product',
      num_items: input.numItems,
    },
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(pixelId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        data: JSON.stringify([event]),
        access_token: accessToken,
        ...(process.env.NODE_ENV !== 'production' && process.env.META_CAPI_TEST_EVENT_CODE
          ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
          : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.events_received === 1;
  } catch {
    return false;
  }
}