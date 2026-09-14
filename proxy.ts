import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isAuthPage = path === '/login' || path === '/register' || path === '/claim';

    /**
     * Salida de emergencia.
     *
     * Con sesion valida, este middleware devuelve /login a /. Si / esta rota
     * —paso de verdad: un cambio de esquema desplegado sin aplicarlo a la base—
     * el usuario queda encerrado entre la pagina rota y una redireccion, sin
     * manera de cerrar sesion ni de entrar con otra cuenta.
     *
     * Con ?salir=1 se borran las cookies aqui mismo y se deja pasar. Va lo
     * primero, antes incluso de mirar el secreto, para que funcione tambien
     * cuando la configuracion este mal.
     */
    if (isAuthPage && request.nextUrl.searchParams.get('salir') === '1') {
        const salida = NextResponse.next();
        salida.cookies.delete('auth_session');
        salida.cookies.delete('impersonate_id');
        return salida;
    }

    const secretKey = process.env.JWT_SECRET;
    if (!secretKey || secretKey.length < 32) {
        // Sin redirigir una pagina de entrada a si misma: antes, si faltaba el
        // secreto, /login se redirigia a /login y el navegador entraba en bucle
        // en vez de enseñar nada que explicara el problema.
        if (isAuthPage) return NextResponse.next();
        return NextResponse.redirect(new URL('/login', request.url));
    }
    const key = new TextEncoder().encode(secretKey);

    const session = request.cookies.get('auth_session');
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
