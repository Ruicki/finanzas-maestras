'use client';

import { calculateCreditHealth, calculateProjectedInterest, calculateMinimumPayment } from '@/lib/financial-engine';
import { formatMoney } from '@/lib/utils';
import { CreditCard, Wifi, MoreHorizontal, Calendar, TrendingUp, AlertCircle, Pencil } from 'lucide-react';
import React from 'react';

// Relaxed type to accept serialized data
interface UltimateCreditCardProps {
    card: any;
    onPay: (card: any) => void;
    onDelete: (id: number) => void;
    onAddCharge?: (card: any) => void;
    cardholderName?: string;
    onEdit?: (card: any) => void;
}

export default function UltimateCreditCard({ card, onPay, onDelete, cardholderName = 'USUARIO', onEdit }: UltimateCreditCardProps) {
    // Basic Calculations
    const utilization = (Number(card.balance) / Number(card.limit)) * 100;
    const available = Number(card.limit) - Number(card.balance);
    const health = calculateCreditHealth(utilization);

    // Smart Estimates (Corrected for real-world calculations)
    const hasRate = Number(card.interestRate) > 0;
    const effectiveRate = hasRate ? Number(card.interestRate) : 45.0;
    const estimatedInterest = calculateProjectedInterest(Number(card.balance), effectiveRate);
    const minPayment = calculateMinimumPayment(Number(card.balance), effectiveRate, Number(card.minPaymentPercentage) || 3.0);

    // Dates
    const today = new Date();
    const currentDay = today.getDate();
    // Simple logic for "Next Cutoff": If today < cutoff, it's this month. Else next month.
    const cutoffDateDisplay = card.cutoffDay;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-full">

            {/* 1. VISUAL CARD (Top) - Full Width */}
            <div className="relative w-full aspect-[1.586/1] shrink-0 rounded-[1.3rem] overflow-hidden bg-zinc-950 text-white shadow-lg flex flex-col justify-between p-6 m-1">
                {/* Texture */}
                <div className="absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-950" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />

                {/* Top */}
                <div className="relative z-10 flex justify-between items-start">
                    <span className="font-bold text-lg tracking-tight text-zinc-100 truncate pr-4">{card.name}</span>
                    <Wifi className="rotate-90 opacity-40 shrink-0" size={20} />
                </div>

                {/* Chip */}
                <div className="relative z-10 w-11 h-8 rounded bg-linear-to-tr from-amber-200 to-amber-100 shadow-sm opacity-90 border border-amber-300/20">
                    <div className="absolute inset-0 opacity-40 bg-[dashed_border_pattern]" />
                </div>

                {/* Bottom */}
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

            {/* 2. SUMMARY DASHBOARD (Bottom) */}
            <div className="flex-1 p-5 flex flex-col">

                {/* Row 1: Main Balance */}
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Saldo Total</span>
                        <span className="block text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                            {formatMoney(Number(card.balance))}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${health.color.replace('text-', 'bg-').replace('400', '100').replace('500', '100')} ${health.color}`}>
                            {health.status === 'Excellent' ? 'Saludable' : health.status === 'Critical' ? 'Crítico' : 'Atención'}
                        </span>
                    </div>
                </div>

                {/* VISUAL BAR */}
                <div className="mb-6">
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

                {/* Row 2: SMART ESTIMATES GRID */}
                <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <TrendingUp size={12} /> Interés {Number(card.interestRate) ? `(${card.interestRate}%)` : '(Est. 45%)'}
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            +{formatMoney(estimatedInterest)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <AlertCircle size={12} /> Pago Mín.
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
