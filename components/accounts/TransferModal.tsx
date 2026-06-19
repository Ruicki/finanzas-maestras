'use client';

import { useState } from 'react';
import { createTransfer } from '@/app/actions/budget';
import { Account } from '@prisma/client';
import { toast } from 'sonner';
import { useScrollLock } from '@/hooks/useScrollLock';
import { ArrowRightLeft, CreditCard, ChevronRight, X, ArrowDown } from "lucide-react";

interface TransferModalProps {
    accounts: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function TransferModal({ accounts, onClose, onSuccess }: TransferModalProps) {
    const [sourceId, setSourceId] = useState<number | null>(null);
    const [destinationId, setDestinationId] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    useScrollLock(true);

    const handleTransfer = async () => {
        if (!sourceId || !destinationId || !amount) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.warning("Monto inválido");
            return;
        }

        setLoading(true);
        try {
            await createTransfer(sourceId, destinationId, numAmount);
            toast.success("Transferencia realizada");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error en la transferencia");
        } finally {
            setLoading(false);
        }
    };

    const sourceAccount = accounts.find(a => a.id === sourceId);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">

                {/* Encabezado */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                            <ArrowRightLeft className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white">Transferir Fondos</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Cuenta Origen */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Desde (Origen)</label>
                        <div className="relative">
                            <select
                                value={sourceId ?? ''}
                                onChange={(e) => setSourceId(Number(e.target.value))}
                                className="w-full appearance-none bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 pr-10 font-bold text-zinc-900 dark:text-white outline-none transition-all cursor-pointer"
                            >
                                <option value="" disabled>Seleccionar cuenta...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (${acc.balance.toFixed(2)})
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 rotate-90" />
                        </div>
                    </div>

                    {/* Divisor de Flecha */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-white dark:bg-zinc-900 p-2 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            <ArrowDown className="w-5 h-5 text-zinc-400" />
                        </div>
                    </div>

                    {/* Cuenta Destino */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Para (Destino)</label>
                        <div className="relative">
                            <select
                                value={destinationId ?? ''}
                                onChange={(e) => setDestinationId(Number(e.target.value))}
                                disabled={!sourceId}
                                className="w-full appearance-none bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 pr-10 font-bold text-zinc-900 dark:text-white outline-none transition-all cursor-pointer disabled:opacity-50"
                            >
                                <option value="" disabled>Seleccionar cuenta...</option>
                                {accounts.filter(a => a.id !== sourceId).map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (${acc.balance.toFixed(2)})
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 rotate-90" />
                        </div>
                    </div>

                    {/* Entrada de Monto */}
                    <div className="pt-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Monto a Transferir</label>
                        <div className="relative mt-2">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xl">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 p-4 pl-10 text-3xl font-black text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                                placeholder="0.00"
                            />
                        </div>
                        {sourceAccount && amount && parseFloat(amount) > Number(sourceAccount.balance) && (
                            <p className="text-red-500 text-sm font-bold mt-2 flex items-center gap-1">
                                ⚠️ Fondos insuficientes (Disp: ${Number(sourceAccount.balance).toFixed(2)})
                            </p>
                        )}
                    </div>

                </div>

                {/* Pie de página */}
                <div className="p-6 pt-2">
                    <button
                        onClick={handleTransfer}
                        disabled={loading || !sourceId || !destinationId || !amount || (sourceAccount ? parseFloat(amount) > Number(sourceAccount.balance) : false)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                    >
                        {loading ? 'Procesando...' : 'Confirmar Transferencia'}
                    </button>
                </div>

            </div>
        </div>
    );
}
