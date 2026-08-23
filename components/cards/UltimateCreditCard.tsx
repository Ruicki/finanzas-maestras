'use client';

import { calculateCreditHealth, calculateMinimumPayment, calculateMonthlyCharges, getDaysToCutoff } from '@/lib/financial-engine';
import { formatMoney } from '@/lib/utils';
import { CreditCard, Wifi, MoreHorizontal, Calendar, TrendingUp, AlertCircle, Pencil, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { recalculateCardBalance } from '@/app/actions/budget/credit-cards';
import { toast } from 'sonner';

interface UltimateCreditCardProps {
    card: any;
    onPay: (card: any) => void;
    onDelete: (id: number) => void;
    cardholderName?: string;
    onEdit?: (card: any) => void;
}

export default function UltimateCreditCard({ card, onPay, onDelete, cardholderName = 'USUARIO', onEdit }: UltimateCreditCardProps) {
    const [recalculating, setRecalculating] = useState(false);

    // Basic Calculations
    const utilization = (Number(card.balance) / Number(card.limit)) * 100;
    const available = Number(card.limit) - Number(card.balance);
    const health = calculateCreditHealth(utilization);

    // Smart Estimates (Panama real-world calculations)
    const hasRate = Number(card.interestRate) > 0;
    const effectiveRate = hasRate ? Number(card.interestRate) : 2.0;
    const insuranceRate = Number(card.insuranceRate) || 0.25;

    const charges = calculateMonthlyCharges(
        Number(card.balance),
        effectiveRate,
        insuranceRate
    );
    const minPayment = calculateMinimumPayment(
        Number(card.balance),
        effectiveRate,
        insuranceRate,
        Number(card.minPaymentPercentage) || 3.0
    );

    // Cutoff alert
    const cutoffInfo = getDaysToCutoff(card.cutoffDay);

    const handleRecalculate = async () => {
        setRecalculating(true);
        try {
            const result = await recalculateCardBalance(card.id);
            if (result.difference !== 0) {
                toast.success(`Balance corregido: ${formatMoney(result.oldBalance)} → ${formatMoney(result.newBalance)} (${result.difference > 0 ? '+' : ''}${formatMoney(result.difference)})`);
            } else {
                toast.info('Balance correcto, sin cambios');
            }
        } catch (error) {
            toast.error('Error al recalcular balance');
        } finally {
            setRecalculating(false);
        }
    };

    const renderCutoffAlert = () => {
        if (cutoffInfo.status === 'normal') return null;
        if (Number(card.balance) <= 0) return null;

        const bgColor = cutoffInfo.status === 'warning'
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : cutoffInfo.status === 'urgent'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';

        const textColor = cutoffInfo.status === 'warning'
            ? 'text-amber-700 dark:text-amber-400'
            : cutoffInfo.status === 'urgent'
            ? 'text-red-700 dark:text-red-400'
            : 'text-emerald-700 dark:text-emerald-400';

        const Icon = cutoffInfo.status === 'passed' ? CheckCircle : AlertTriangle;

        const message = cutoffInfo.status === 'passed'
            ? `Corte completado (${cutoffInfo.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`
            : cutoffInfo.days === 0
            ? '¡Corte es hoy!'
            : cutoffInfo.days === 1
            ? 'Corte mañana'
            : `Corte en ${cutoffInfo.days} días (${cutoffInfo.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`;

        const submessage = cutoffInfo.status !== 'passed'
            ? 'Paga antes del corte para evitar intereses'
            : 'Nuevo ciclo inicia';

        return (
            <div className={`${bgColor} border rounded-xl p-3 mb-4 flex items-start gap-3`}>
                <Icon className={`w-5 h-5 ${textColor} shrink-0 mt-0.5`} />
                <div>
                    <p className={`font-bold text-sm ${textColor}`}>{message}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{submessage}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-full">

            {/* 1. VISUAL CARD (Top) */}
            <div className="relative w-full aspect-[1.586/1] shrink-0 rounded-[1.3rem] overflow-hidden bg-zinc-950 text-white shadow-lg flex flex-col justify-between p-6 m-1">
                <div className="absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-950" />
                <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"}} />

                <div className="relative z-10 flex justify-between items-start">
                    <span className="font-bold text-lg tracking-tight text-zinc-100 truncate pr-4">{card.name}</span>
                    <Wifi className="rotate-90 opacity-40 shrink-0" size={20} />
                </div>

                <div className="relative z-10 w-11 h-8 rounded bg-linear-to-tr from-amber-200 to-amber-100 shadow-sm opacity-90 border border-amber-300/20" />

                <div className="relative z-10">
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5">Titular</span>
                            <span className="font-mono text-sm tracking-widest text-zinc-300 uppercase">{cardholderName}</span>
                        </div>
                        <CreditCard size={28} className="opacity-50" />
                    </div>
                </div>
            </div>

            {/* 2. SUMMARY DASHBOARD */}
            <div className="flex-1 p-5 flex flex-col">
                {/* Cutoff Alert */}
                {renderCutoffAlert()}

                {/* Balance */}
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Saldo Total</span>
                        <span className="block text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                            {formatMoney(Number(card.balance))}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating}
                            className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50"
                            title="Recalcular balance desde gastos y pagos"
                        >
                            <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
                        </button>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${health.color.replace('text-', 'bg-').replace('400', '100').replace('500', '100')} ${health.color}`}>
                            {health.status === 'Excellent' ? 'Saludable' : health.status === 'Critical' ? 'Crítico' : 'Atención'}
                        </span>
                    </div>
                </div>

                {/* Utilization Bar */}
                <div className="mb-5">
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner border border-zinc-200 dark:border-zinc-800/50">
                        <div
                            className={`h-full transition-all duration-500 relative ${health.color.replace('text-', 'bg-')}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-medium text-zinc-400">
                        <span>Límite: {formatMoney(Number(card.limit))}</span>
                        <span className="text-zinc-600 dark:text-zinc-300">Disp: {formatMoney(available)}</span>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <TrendingUp size={12} /> Interés ({effectiveRate}%)
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            +{formatMoney(charges.interest)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <AlertCircle size={12} /> Pago Mínimo
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            ~{formatMoney(minPayment)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <Calendar size={12} /> Corte
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            Día {card.cutoffDay}
                            {cutoffInfo.days > 0 && cutoffInfo.status !== 'passed' && (
                                <span className="text-zinc-400 ml-1">({cutoffInfo.days}d)</span>
                            )}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <Calendar size={12} /> Pago
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            Día {card.paymentDay}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                    <button
                        onClick={() => onPay(card)}
                        className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                        Pagar
                    </button>
                    {onEdit && (
                        <button
                            onClick={() => onEdit(card)}
                            className="px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-500 rounded-xl transition-colors"
                            title="Editar"
                        >
                            <Pencil size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(card.id)}
                        className="px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 rounded-xl transition-colors"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
