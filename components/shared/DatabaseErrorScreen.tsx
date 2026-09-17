import React from 'react';
import type { DiagnosticoDB } from '@/lib/db-errors';

/**
 * La pantalla que sale cuando la app no puede leer sus datos.
 *
 * Reemplaza a "Algo salió mal" con un identificador que solo se resuelve
 * entrando en los registros del servidor. Lo que se enseña aquí lo escribe
 * `lib/db-errors.ts`, nunca el error original: ese puede llevar dentro la
 * cadena de conexión.
 */
export default function DatabaseErrorScreen({ diagnostico }: { diagnostico: DiagnosticoDB }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-6 text-center">
                <div className="space-y-3">
                    <h1 className="font-title text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white">
                        {diagnostico.titulo}
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {diagnostico.explicacion}
                    </p>
                </div>

                {diagnostico.accion && (
                    <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-left">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                            Qué hacer
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {diagnostico.accion}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 justify-center pt-2">
                    {/* Recarga completa a proposito, no <Link>: lo que fallo es el
                        render en el servidor, y una navegacion de cliente puede
                        servir lo que ya tiene en cache en vez de reintentarlo. */}
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                        href="/"
                        className="px-5 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        Reintentar
                    </a>
                    {/* Sin esto, con la sesión abierta y esta página rota no hay
                        manera de llegar al login: el middleware devuelve /login
                        a /, que es justo la que falla. */}
                    <a
                        href="/login?salir=1"
                        className="px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cerrar sesión
                    </a>
                </div>

                <p className="text-xs text-zinc-400">
                    Código: <span className="font-mono">{diagnostico.clase}</span>
                </p>
            </div>
        </div>
    );
}
