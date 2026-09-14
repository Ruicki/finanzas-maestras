'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
    /** Icono ya renderizado, para que cada pestaña use el suyo. */
    icon: ReactNode;
    title: string;
    /** Una frase: que es esta pantalla y por que esta vacia. */
    description: string;
    /** Accion principal. Sin ella la pantalla solo informa, que casi nunca es lo util. */
    actionLabel?: string;
    onAction?: () => void;
    /** Accion secundaria opcional, para cuando hay dos caminos razonables. */
    secondaryLabel?: string;
    onSecondary?: () => void;
}

/**
 * Pantalla de "aqui todavia no hay nada". Existe para que las siete pestañas
 * digan lo mismo de la misma forma: hasta ahora cada una lo resolvia a su
 * manera —unas con icono y boton, otras con una linea suelta, y Deudas y
 * Presupuesto sin nada—, asi que un usuario recien llegado recibia un trato
 * distinto en cada pestaña.
 *
 * Todo el color sale de los tokens del tema, asi que se adapta a los seis.
 */
export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryLabel,
    onSecondary,
}: EmptyStateProps) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center text-center py-14 md:py-20 px-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] bg-surface/50 dark:bg-zinc-900/50">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-surface dark:bg-zinc-800 rounded-full flex items-center justify-center mb-5 shadow-sm text-zinc-400 dark:text-zinc-500">
                {icon}
            </div>

            <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white mb-2 text-balance">
                {title}
            </h3>

            {/* max-w-sm para que la frase no se estire en escritorio y siga
                leyendose de un vistazo en movil. */}
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
                {description}
            </p>

            {(actionLabel || secondaryLabel) && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
                        >
                            {actionLabel}
                        </button>
                    )}
                    {secondaryLabel && onSecondary && (
                        <button
                            onClick={onSecondary}
                            className="px-6 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            {secondaryLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
