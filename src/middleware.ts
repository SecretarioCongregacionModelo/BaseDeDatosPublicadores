import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authCookie = request.cookies.get('auth');
    const { pathname } = request.nextUrl;

    // Allow public assets and api routes if needed (though API might need protection too)
    // For now, protecting everything except /login and static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // public files like favicon.ico
    ) {
        return NextResponse.next();
    }

    // If user is already on login page
    if (pathname === '/login') {
        if (authCookie?.value === 'true') {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Determine if user is authenticated
    const isAuthenticated = authCookie?.value === 'true';

    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
