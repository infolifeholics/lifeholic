import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'thl_ad_consent';
const MAX_AGE = 60 * 60 * 24 * 180;

export async function GET(req: NextRequest) {
  const consent = req.cookies.get(COOKIE_NAME)?.value;
  return NextResponse.json({
    consent: consent === 'granted' || consent === 'denied' ? consent : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { consent } = await req.json();
    if (consent !== 'granted' && consent !== 'denied') {
      return NextResponse.json({ error: 'Invalid consent choice.' }, { status: 400 });
    }

    const response = NextResponse.json({ consent });
    response.cookies.set(COOKIE_NAME, consent, {
      httpOnly: true,
      maxAge: MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Could not save privacy choice.' }, { status: 400 });
  }
}