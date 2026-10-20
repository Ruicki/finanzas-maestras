'use client';

import React, { useState } from 'react';
import { XIcon, HistoryIcon, WalletIcon, Trash2Icon } from '@animateicons/react/lucide';
import { formatMoney } from '@/lib/utils';
import { formatEnTimezonaDeNegocio } from '@/lib/dates';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';

export interface PagoDeDeudaRow {
    id: number;
    amount: number;
    createdAt: string | Date;
    accountName: string | null;
}

interface DebtHistoryModalProps {
    /** Nombre del préstamo o tarjeta, para el encabezado. */
    nombre: string;
    pagos: PagoDeDeudaRow[];
    cargando: boolean;
    onClose: () => void;
    /**
     * Si se pasa, cada pago muestra un botón para corregirlo: lo borra y
     * devuelve el monto al saldo de la deuda y a la cuenta de origen. Antes
     * un pago registrado por error no se podía corregir de ninguna forma.
     */
    onEliminarPago?: (pagoId: number) => Promise<void>;
}

/**
 * Los pagos reales ya registrados de un préstamo o tarjeta.
 *
 * Antes no existía ninguna vista de esto — el usuario no tenía forma de
 * comprobar si ya había pagado una cuota antes de volver a pagarla, y llegó
 * a pagar la misma deuda dos veces por eso mismo.
 */
export default function DebtHistoryModal({ nombre, pagos, cargando, onClose, onEliminarPago }: DebtHistoryModalProps) {
    const total = pagos.reduce((suma, p) => suma + p.amount, 0);
    const [eliminandoId, setEliminandoId] = useState<number | null>(null);

    function handleEliminar(pagoId: number) {
        if (!onEliminarPago || eliminandoId !== null) return;
        confirmDelete(
            async () => {
                setEliminandoId(pagoId);
                try {
                    await onEliminarPago(pagoId);
                } finally {
                    setEliminandoId(null);
                }
            },
            '¿Corregir este pago?',
            'Se borra y el monto vuelve al saldo de la deuda y a la cuenta de origen.',
        );
    }

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white">Historial de pagos</h3>
                        <p className="text-xs text-zinc-400">{nombre}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><XIcon size={16} /></button>
                </div>

                {!cargando && pagos.length > 0 && (
                    <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total pagado</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatMoney(total)}</span>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                    {cargando ? (
                        <div className="text-center py-8 text-zinc-400">Cargando...</div>
                    ) : pagos.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                            <HistoryIcon size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Todavía no hay pagos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pagos.map(pago => (
                                <div key={pago.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 shrink-0">
                                            <WalletIcon size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                                {formatEnTimezonaDeNegocio(pago.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 truncate">
                                                {pago.accountName || 'Pago externo (efectivo / sin cuenta)'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                                            {formatMoney(pago.amount)}
                                        </span>
                                        {onEliminarPago && (
                                            <button
                                                onClick={() => handleEliminar(pago.id)}
                                                disabled={eliminandoId !== null}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                                                title="Corregir (eliminar este pago)"
                                            >
                                                <Trash2Icon size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
