import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Simple path gating - only check for required headers
  if (req.nextUrl.pathname.startsWith('/api/proof/create')) {
    // Require user_id header for authentication
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/proof/create', '/api/proof/:path*'],
};
