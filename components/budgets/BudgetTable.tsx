'use client';

import React from 'react';
import { formatMoney } from '@/lib/utils';
import { TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, PiggyBank } from 'lucide-react';

interface BudgetTableProps {
    categories: any[];
    expenses: any[];
    currentMonth: number;
    currentYear: number;
    currency: string;
}

export default function BudgetTable({ categories, expenses, currentMonth, currentYear }: BudgetTableProps) {

    // Calculate per-category spending for current month
    const categoryStats = categories.map(cat => {
        const spent = expenses
            .filter(e => {
                const d = new Date(e.createdAt);
                return e.categoryId === cat.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + Number(e.amount), 0);

        const limit = Number(cat.monthlyLimit) || 0;
        const rollover = cat.isRollover ? Number(cat.rolloverBalance) : 0;
        const effectiveLimit = limit + rollover;
        const remaining = effectiveLimit > 0 ? effectiveLimit - spent : null;
        const isOver = effectiveLimit > 0 && spent > effectiveLimit;

        return { ...cat, spent, limit, rollover, effectiveLimit, remaining, isOver };
    });

    // Summary calculations
    const totalAssigned = categoryStats.reduce((sum, c) => sum + c.effectiveLimit, 0);
    const totalSpent = categoryStats.reduce((sum, c) => sum + c.spent, 0);
    const totalRollover = categoryStats.reduce((sum, c) => sum + c.rollover, 0);
    const overallRemaining = totalAssigned - totalSpent;

    // Top 3 spending categories
    const topSpenders = [...categoryStats]
        .filter(c => c.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 3);

    // Categories over limit
    const overLimit = categoryStats.filter(c => c.isOver);

    // Categories with budget (for percentage)
    const categoriesWithBudget = categoryStats.filter(c => c.effectiveLimit > 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Assigned vs Spent */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Asignado vs Gastado</p>
                    <div className="flex items-end gap-2 mb-3">
                        <span className="text-2xl font-black text-zinc-900 dark:text-white">{formatMoney(totalSpent)}</span>
                        <span className="text-sm font-bold text-zinc-400 mb-0.5">/ {formatMoney(totalAssigned)}</span>
                    </div>
                    {totalAssigned > 0 && (
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${totalSpent > totalAssigned ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min((totalSpent / totalAssigned) * 100, 100)}%` }}
                            />
                        </div>
                    )}
                    {totalAssigned === 0 && (
                        <p className="text-xs text-zinc-400 mt-1">Sin presupuestos definidos</p>
                    )}
                </div>

                {/* Top Spenders */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Mayores Gastos</p>
                    {topSpenders.length > 0 ? (
                        <div className="space-y-2">
                            {topSpenders.map((cat, i) => {
                                const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                                return (
                                    <div key={cat.id} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}</span>
                                        <div className={`w-2 h-2 rounded-full ${cat.color || 'bg-zinc-400'}`} />
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-1 truncate">{cat.name}</span>
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatMoney(cat.spent)}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-400">Sin gastos este mes</p>
                    )}
                </div>

                {/* Alerts & Rollover */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Alertas y Rollover</p>

                    {overLimit.length > 0 ? (
                        <div className="space-y-2 mb-3">
                            {overLimit.map(cat => (
                                <div key={cat.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                    <span className="text-xs font-bold text-red-700 dark:text-red-400 truncate flex-1">{cat.name}</span>
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">+{formatMoney(cat.spent - cat.effectiveLimit)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">✓ Todas dentro del presupuesto</p>
                    )}

                    {totalRollover > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-2">
                            <PiggyBank size={14} className="text-blue-500" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Rollover total:</span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">+{formatMoney(totalRollover)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Breakdown Table */}
            {categoriesWithBudget.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Detalle por Categoría</h4>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {categoriesWithBudget.sort((a, b) => b.spent - a.spent).map(cat => {
                            const pct = cat.effectiveLimit > 0 ? Math.min((cat.spent / cat.effectiveLimit) * 100, 100) : 0;
                            return (
                                <div key={cat.id} className="px-6 py-3 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                    <div className={`w-2.5 h-2.5 rounded-full ${cat.color || 'bg-zinc-400'}`} />
                                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 w-32 truncate">{cat.name}</span>
                                    <div className="flex-1">
                                        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${cat.isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-zinc-500 w-16 text-right">{pct.toFixed(0)}%</span>
                                    <span className={`text-sm font-bold w-24 text-right ${cat.isOver ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        {formatMoney(cat.spent)}
                                    </span>
                                    <span className="text-xs text-zinc-400 w-20 text-right">/ {formatMoney(cat.effectiveLimit)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {categories.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                    No tienes categorías configuradas.
                </div>
            )}
        </div>
    );
}
