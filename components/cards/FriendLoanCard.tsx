'use client';

import { formatMoney } from '@/lib/utils';
import { ArrowUpRight, User, MoreHorizontal, Calendar, TrendingDown, PiggyBank, Pencil } from 'lucide-react';

interface FriendLoanCardProps {
    loan: any;
    onPay: (loan: any) => void;
    onDelete: (id: number) => void;
    onQuickPay: (loan: any, amount: number) => void;
    onEdit?: (loan: any) => void;
}

export default function FriendLoanCard({ loan, onPay, onDelete, onQuickPay, onEdit }: FriendLoanCardProps) {
    // Financials
    const currentBalance = Number(loan.currentBalance);
    const totalAmount = Number(loan.totalAmount);

    // Progress logic
    const paidAmount = totalAmount - currentBalance;
    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">

            {/* Top Decoration (Amber for Personal to distinguish from Indigo Bank) */}
            <div className="h-1.5 w-full bg-linear-to-r from-amber-400 via-orange-400 to-amber-400" />

            <div className="p-6 md:p-8 flex-1 flex flex-col">
                {/* Header (Identical structure to BankLoanCard) */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shadow-inner">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{loan.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{loan.lender || 'Conocido'}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/10 px-1.5 py-0.5 rounded text-[10px]">Personal</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Stats (Identical structure) */}
                <div className="flex flex-col mb-8 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Saldo Pendiente</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatMoney(currentBalance)}</span>
                    </div>

                    {/* Rich Progress Bar */}
                    <div className="relative h-2.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <span>Inicio: {formatMoney(totalAmount)}</span>
                        <span>{progress.toFixed(0)}% Pagado</span>
                    </div>
                </div>

                {/* Info Grid (Adapted fields for Personal Loan) */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <PiggyBank size={12} /> Total Pagado
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">
                            {formatMoney(paidAmount)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                            <TrendingDown size={12} /> Estado
                        </span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            {progress >= 100 ? 'Completado' : 'En Progreso'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                    <button
                        onClick={() => onQuickPay(loan, 20)}
                        className="flex-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold py-3 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-sm border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2"
                    >
                        <ArrowUpRight size={16} />
                        Abonar $20
                    </button>
                    <button
                        onClick={() => onPay(loan)}
                        className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                    >
                        Pagar
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
                        onClick={() => onDelete(loan.id)}
                        className="px-4 py-3 bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 rounded-xl transition-colors"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
