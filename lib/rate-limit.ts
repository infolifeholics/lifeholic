type LimiterStore = {
  [ip: string]: {
    tokens: number;
    lastRefill: number;
  };
};

// Global in-memory cache for development/production processes.
// Note: In serverless, memory is ephemeral, but it works as a basic per-instance safeguard.
const globalStore: LimiterStore = {};

interface RateLimiterOptions {
  limit: number;     // Max requests allowed in the window
  windowMs: number;  // Window duration in ms
}

/**
 * A basic token bucket rate limiter for Next.js API Routes.
 */
export function rateLimiter(ip: string, options: RateLimiterOptions) {
  const now = Date.now();
  const limit = Number(process.env.RATE_LIMIT_MAX) || options.limit;
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW) || options.windowMs;

  if (!globalStore[ip]) {
    globalStore[ip] = {
      tokens: limit,
      lastRefill: now,
    };
  }

  const record = globalStore[ip];
  const timePassed = now - record.lastRefill;

  // Add tokens back proportional to time passed
  const refillRate = limit / windowMs;
  const newTokens = Math.min(limit, record.tokens + timePassed * refillRate);

  record.tokens = newTokens;
  record.lastRefill = now;

  if (record.tokens >= 1) {
    record.tokens -= 1;
    return {
      success: true,
      remaining: Math.floor(record.tokens),
      limit,
    };
  }

  // Log blocked request
  console.warn(`[RateLimit] Blocked request from IP: ${ip} (Window: ${windowMs}ms, Max: ${limit})`);
  return {
    success: false,
    remaining: 0,
    limit,
  };
}

/**
 * Extracts the IP address from Next.js request headers.
 */
export function getIpFromRequest(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
