const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SMTP_USER',
  'SMTP_PASSWORD'
];

export function validateEnv() {
  // Skip during build/export phase to avoid build failures on Vercel build servers
  if (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-export'
  ) {
    return;
  }

  const missing: string[] = [];
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[CRITICAL ENV ERROR] Missing required environment variables: ${missing.join(', ')}`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  }
}

// Automatically validate on module import
validateEnv();
