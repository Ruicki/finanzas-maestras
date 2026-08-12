import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'secret-key-change-me-in-prod';
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('auth_session');
    const path = request.nextUrl.pathname;
    const isAuthPage = path === '/login' || path === '/register' || path === '/claim';
    const isHomePage = path === '/';
    const isPublicAsset = path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.includes('.'); // files like favicon.ico


    let isValidSession = false;

    if (session && session.value) {
        try {
            await jwtVerify(session.value, key, { algorithms: ['HS256'] });
            isValidSession = true;
        } catch (e) {
            isValidSession = false;
        }
    }

    // Si no hay sesión válida, redirigir a login (EXCEPTO si es auth, home o asset)
    if (!isValidSession && !isAuthPage && !isHomePage && !isPublicAsset) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Si hay sesión válida y está en páginas de Auth (login/register), redirigir al dashboard
    if (isValidSession && isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
