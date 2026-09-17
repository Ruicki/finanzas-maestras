'use client';

import React from 'react';
import { XIcon, HistoryIcon } from '@animateicons/react/lucide';

export interface GoalTransactionRow {
    id: number;
    type: string;
    amount: number;
    createdAt: string | Date;
}

interface GoalHistoryModalProps {
    nombreMeta: string;
    movimientos: GoalTransactionRow[];
    cargando: boolean;
    onClose: () => void;
}

/** Lo que ha entrado y salido de una meta. */
export default function GoalHistoryModal({ nombreMeta, movimientos, cargando, onClose }: GoalHistoryModalProps) {
    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white">Historial</h3>
                        <p className="text-xs text-zinc-400">{nombreMeta}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><XIcon size={16} /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                    {cargando ? (
                        <div className="text-center py-8 text-zinc-400">Cargando...</div>
                    ) : movimientos.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                            <HistoryIcon size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin transacciones aún</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {movimientos.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${tx.type === 'DEPOSIT' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-red-100 dark:bg-red-500/20 text-red-600'}`}>
                                            {tx.type === 'DEPOSIT' ? '+' : '-'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                                {tx.type === 'DEPOSIT' ? 'Depósito' : 'Retiro'}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                                {new Date(tx.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm ${tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
