'use client';

import React from 'react';
import { PlusIcon, FlagIcon } from '@animateicons/react/lucide';
import { formatMoney } from '@/lib/utils';

interface DebtFreedomHeaderProps {
    deudaTotal: number;
    fechaLibertad: Date;
    onNuevaTarjeta: () => void;
    onNuevoPrestamo: () => void;
}

/**
 * La cabecera de Deudas: cuándo sales y cuánto debes.
 *
 * No decide nada —la fecha se la dan hecha desde `lib/debts.ts`—, solo la pinta.
 */
export default function DebtFreedomHeader({
    deudaTotal,
    fechaLibertad,
    onNuevaTarjeta,
    onNuevoPrestamo,
}: DebtFreedomHeaderProps) {
    const sinDeudas = deudaTotal === 0;

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 bg-surface dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 dark:group-hover:bg-emerald-500/20 transition-all duration-1000"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-1">Tu Libertad Financiera</h3>
                            <h2 className="font-title text-3xl font-semibold text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-linear-to-r dark:from-white dark:to-zinc-400">
                                {sinDeudas ? "¡Eres Libre!" : (isNaN(fechaLibertad.getTime()) ? "Calculando..." : fechaLibertad.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
                            </h2>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl">
                            <FlagIcon className={sinDeudas ? "text-emerald-500 dark:text-emerald-400" : "text-purple-500 dark:text-purple-400"} />
                        </div>
                    </div>

                    <p className="text-zinc-500 font-medium max-w-md">
                        {sinDeudas
                            ? "¡Felicidades! No tienes deudas registradas."
                            : `Basado en tus pagos actuales, serás totalmente libre de deudas en esta fecha. ¡Sigue así!`}
                    </p>

                    {!sinDeudas && (
                        <div className="mt-6 flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs font-bold text-zinc-500 uppercase">Deuda Total</p>
                                <p className="text-2xl font-black text-red-400">{formatMoney(deudaTotal)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col justify-center gap-4">
                <button onClick={onNuevaTarjeta} className="flex items-center gap-3 px-8 py-4 bg-surface dark:bg-zinc-800 text-black dark:text-white rounded-4xl font-black hover:scale-105 transition-transform shadow-xl">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-full"><PlusIcon size={20} /></div>
                    Nueva Tarjeta
                </button>
                <button onClick={onNuevoPrestamo} className="flex items-center gap-3 px-8 py-4 bg-surface dark:bg-zinc-800 text-black dark:text-white rounded-4xl font-black hover:scale-105 transition-transform shadow-xl">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full"><PlusIcon size={20} /></div>
                    Nuevo Préstamo
                </button>
            </div>
        </div>
    );
}
