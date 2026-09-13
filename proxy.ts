import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export default async function middleware(request: NextRequest) {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey || secretKey.length < 32) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    const key = new TextEncoder().encode(secretKey);

    const session = request.cookies.get('auth_session');
    const path = request.nextUrl.pathname;
    const isAuthPage = path === '/login' || path === '/register' || path === '/claim';
    const isHomePage = path === '/';
    // Vista previa de los temas de color: solo datos ficticios, sin acceso a la
    // base de datos ni a ningún dato del perfil, así que no requiere sesión.
    const isThemePreview = path === '/preview-temas';
    const isPublicAsset = path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.includes('.');

    let payload: Record<string, unknown> | null = null;

    if (session && session.value) {
        try {
            const verified = await jwtVerify(session.value, key, { algorithms: ['HS256'] });
            payload = verified.payload as Record<string, unknown>;
        } catch {
            payload = null;
        }
    }

    const isValidSession = payload !== null;

    if (!isValidSession && !isAuthPage && !isHomePage && !isPublicAsset && !isThemePreview) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isValidSession && isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (path.startsWith('/admin') && (!payload || payload.role !== 'ADMIN')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
