import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/backend/security/rateLimiter';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/chat')) {
    const rateCheck = checkRateLimit(getRateLimitKey(request));
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
