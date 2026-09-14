'use client';

import React from 'react';
import { PiggyBankIcon } from '@animateicons/react/lucide';

interface CuentaDestino {
    id: number;
    name: string;
    symbol?: string | null;
    balance: number;
}

interface GoalReclaimModalProps {
    meta: { name: string; currentAmount: number };
    cuentas: CuentaDestino[];
    cuentaId: string;
    onCuentaId: (valor: string) => void;
    procesando: boolean;
    onConfirmar: () => void;
    onClose: () => void;
}

/**
 * Romper la alcancia: borrar una meta que ya tiene dinero dentro.
 *
 * Obliga a decir a que cuenta va ese dinero. Sin este paso, borrar la meta lo
 * haria desaparecer, que es exactamente la clase de fallo que mas duele aqui.
 */
export default function GoalReclaimModal({ meta, cuentas, cuentaId, onCuentaId, procesando, onConfirmar, onClose }: GoalReclaimModalProps) {
    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-200">
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full animate-bounce"><PiggyBankIcon size={48} /></div>
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">¡Romper Alcancía!</h3>
                <p className="text-zinc-500 mb-6 font-medium">Eliminar meta <strong>{meta.name}</strong> con fondos acumulados.</p>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl mb-6">
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Monto a Recuperar</p>
                    <p className="text-4xl font-black text-emerald-500">${meta.currentAmount.toFixed(2)}</p>
                </div>
                <div className="mb-8 text-left">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2 mb-2 block">¿A dónde?</label>
                    <select value={cuentaId} onChange={e => onCuentaId(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none">
                        <option value="">Cuenta...</option>
                        {cuentas.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.symbol || '$'}{acc.balance})</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onClose} className="p-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">Cancelar</button>
                    <button onClick={onConfirmar} disabled={!cuentaId || procesando} className="p-4 rounded-xl bg-indigo-600 dark:bg-white text-white dark:text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {procesando ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>Procesando...</span></> : <span>Reclamar</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
