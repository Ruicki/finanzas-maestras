'use client';

import React from 'react';
import { XIcon } from '@animateicons/react/lucide';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';

interface CuentaOrigen {
    id: number;
    name: string;
    symbol?: string | null;
    balance: number;
    purpose?: string | null;
}

interface LoanPaymentModalProps {
    nombre: string;
    cuentas: CuentaOrigen[];
    monto: string;
    onMonto: (valor: string) => void;
    cuentaId: string;
    onCuentaId: (valor: string) => void;
    pagando: boolean;
    onConfirmar: () => void;
    onClose: () => void;
}

/**
 * Abonar a un prestamo.
 *
 * A diferencia del pago de tarjeta, aqui la cuenta es opcional: un prestamo
 * tambien se paga en efectivo o por fuera de la app, y entonces no hay ninguna
 * cuenta de la que descontar.
 *
 * Las cuentas de ahorro no se ofrecen: pagar deuda vaciando el ahorro es una
 * decision que deberia tomarse a proposito, no por ser la opcion que salia.
 */
export default function LoanPaymentModal({
    nombre,
    cuentas,
    monto,
    onMonto,
    cuentaId,
    onCuentaId,
    pagando,
    onConfirmar,
    onClose,
}: LoanPaymentModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black">Abonar a {nombre}</h3>
                    <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"><XIcon size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-500">Cuenta de Origen</label>
                        <select
                            value={cuentaId}
                            onChange={e => onCuentaId(e.target.value)}
                            className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold"
                        >
                            <option value="">-- Pago Externo / Efectivo (sin cuenta) --</option>
                            {cuentas.filter(acc => acc.purpose !== 'SAVINGS').map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.symbol || '$'}{acc.balance})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-500">Monto a Pagar</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-xl">$</span>
                            <SmartMoneyInput
                                placeholder="0.00"
                                value={monto}
                                onMoneyChange={(val) => onMonto(val)}
                                className="w-full p-4 pl-10 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-black text-2xl text-center"
                            />
                        </div>
                    </div>
                    <button
                        onClick={onConfirmar} disabled={pagando}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg transition-transform flex items-center justify-center gap-2"
                    >
                        {pagando ? "Procesando..." : "Confirmar Pago"}
                    </button>
                </div>
            </div>
        </div>
    );
}
