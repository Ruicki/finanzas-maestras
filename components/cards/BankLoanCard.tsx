'use client';

import { useState } from 'react';
import { calculateNextPaymentSplit, calculatePayoffImpact } from '@/lib/financial-engine';
import { formatMoney } from '@/lib/utils';
import { Zap, ChevronDown, Landmark, TrendingDown, Calendar, MoreHorizontal, Pencil } from 'lucide-react';

interface BankLoanCardProps {
    loan: any;
    onPay: (loan: any) => void;
    onDelete: (id: number) => void;
    onEdit?: (loan: any) => void;
}

export default function BankLoanCard({ loan, onPay, onDelete, onEdit }: BankLoanCardProps) {
    const [simulating, setSimulating] = useState(false);

    // Financials
    const currentBalance = Number(loan.currentBalance);
    const monthlyPayment = Number(loan.monthlyPayment) || 0;
    const interestRate = Number(loan.interestRate) || 0;
    const totalAmount = Number(loan.totalAmount);

    // Progress logic
    const paidAmount = totalAmount - currentBalance;
    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    // Split for visual bar (Capital vs Interest part of the NEXT payment)
    const split = calculateNextPaymentSplit(currentBalance, interestRate, monthlyPayment);
    // Simulation
    const impact = calculatePayoffImpact(currentBalance, interestRate, monthlyPayment, 50);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">

            {/* Top Decoration */}
            <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500" />

            <div className="p-6 md:p-8 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{loan.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{loan.lender || 'Banco'}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded text-[10px]">{interestRate}% APR</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="flex flex-col mb-8 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Saldo Pendiente</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatMoney(currentBalance)}</span>
                    </div>

                    {/* Rich Progress Bar */}
                    <div className="relative h-2.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <span>Inicio: {formatMoney(totalAmount)}</span>
                        <span>{progress.toFixed(0)}% Pagado</span>
                    </div>
                </div>

                {/* Next Payment Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <Calendar size={12} /> Cuota Mensual
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            {formatMoney(monthlyPayment)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <TrendingDown size={12} /> Interés / Mes
                        </span>
                        <span className="text-sm font-bold text-rose-500">
                            ~{formatMoney(split.interest)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                    <button
                        onClick={() => onPay(loan)}
                        className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                    >
                        Pagar Cuota
                    </button>
                    {onEdit && (
                        <button
                            onClick={() => onEdit(loan)}
                            className="px-4 py-3 bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-blue-500 rounded-xl transition-colors"
                            title="Editar"
                        >
                            <Pencil size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => setSimulating(!simulating)}
                        className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all flex items-center gap-2 ${simulating ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white dark:bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                    >
                        <Zap size={16} className={simulating ? "fill-current" : ""} />
                        <span>Ahorro</span>
                    </button>
                    <button
                        onClick={() => onDelete(loan.id)}
                        className="px-4 py-3 bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 rounded-xl transition-colors"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Simulator Panel (Expanded) */}
            {simulating && (
                <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border-t border-indigo-100 dark:border-indigo-900/30 p-6 animate-in slide-in-from-bottom-2 backdrop-blur-sm">
                    <div className="flex gap-4 items-center">
                        <div className="p-2 bg-white dark:bg-indigo-900/50 rounded-full text-indigo-500 shadow-sm">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-zinc-500 uppercase">Impacto de +$50/mes</p>
                            <div className="flex gap-4 mt-1">
                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">-{impact?.monthsSaved} Meses</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">-${impact?.interestSaved.toFixed(0)} Interés</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
