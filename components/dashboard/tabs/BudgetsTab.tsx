'use client';

import React, { useState } from 'react';
import BudgetCard from '@/components/budgets/BudgetCard';
import FinancialRules from '@/components/dashboard/widgets/FinancialRules';
import SubscriptionCalendar from '@/components/budgets/SubscriptionCalendar';
import { formatMoney } from '@/lib/utils';
import { Category, Expense } from '@prisma/client';
import { Plus, Calendar, TrendingDown, CreditCard } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { deleteExpense } from '@/app/actions/budget';
import { toast } from 'sonner';

import ExpenseWizard from '@/components/expenses/ExpenseWizard';

interface BudgetsTabProps {
    categories: any[];
    expenses: any[];
    creditCards?: any[];
    accounts?: any[];
    profileId?: number;
    currency?: string;
    totalIncome: number;
    totalDebtPayments: number;
    totalSavings: number;
    totalCash: number;
    currentMonth: number;
    currentYear: number;
    onUpdate?: () => void;
}

export default function BudgetsTab({ categories, expenses, creditCards = [], accounts = [], profileId, currency = 'USD', totalIncome, totalDebtPayments, totalSavings, totalCash, currentMonth, currentYear, onUpdate }: BudgetsTabProps) {
    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);

    // Subscriptions sorted by due date
    const subscriptions = expenses
        .filter(e => e.isRecurring)
        .sort((a, b) => (a.dueDate || 1) - (b.dueDate || 1));

    const totalSubscriptions = subscriptions.reduce((s, e) => s + Number(e.amount), 0);
    const subscriptionCount = subscriptions.length;
    const nextDueDay = subscriptions.length > 0 ? Math.min(...subscriptions.map(s => s.dueDate || 1)) : null;
    const subscriptionPctOfIncome = totalIncome > 0 ? (totalSubscriptions / totalIncome) * 100 : 0;
    const annualCost = totalSubscriptions * 12;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 pt-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Presupuesto</h2>
                    <p className="text-zinc-500">Reglas financieras, control de gastos y suscripciones.</p>
                </div>
            </div>

            {/* SECTION 1: FINANCIAL RULES */}
            <FinancialRules
                income={totalIncome}
                expenses={expenses}
                debtsPayment={totalDebtPayments}
                totalSavings={totalSavings}
                totalCash={totalCash}
            />

            {/* SECTION 2: BUDGET CATEGORIES + TABLE */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Control por Categorías</h3>
                </div>

                {/* Summary Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {(() => {
                        const catStats = categories.map(cat => {
                            const spent = expenses
                                .filter(e => {
                                    const d = new Date(e.createdAt);
                                    return e.categoryId === cat.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                                })
                                .reduce((sum, e) => sum + Number(e.amount), 0);
                            return { ...cat, spent };
                        });
                        const totalSpent = catStats.reduce((s, c) => s + c.spent, 0);
                        const totalAssigned = categories.reduce((s, c) => s + (Number(c.monthlyLimit) || 0), 0);
                        const overBudget = catStats.filter(c => Number(c.monthlyLimit) > 0 && c.spent > Number(c.monthlyLimit));
                        const noBudget = catStats.filter(c => (!c.monthlyLimit || Number(c.monthlyLimit) === 0) && c.spent > 0);

                        return (
                            <>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Gastado</p>
                                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatMoney(totalSpent)}</p>
                                    <p className="text-[10px] text-zinc-400 mt-1">este mes</p>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Presupuesto</p>
                                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatMoney(totalAssigned)}</p>
                                    <p className="text-[10px] text-zinc-400 mt-1">{categories.length} categorías</p>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Restante</p>
                                    <p className={`text-2xl font-black ${totalAssigned - totalSpent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {formatMoney(totalAssigned - totalSpent)}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-1">{totalAssigned > 0 ? `${((totalSpent / totalAssigned) * 100).toFixed(0)}% usado` : 'sin límite'}</p>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Alertas</p>
                                    <p className={`text-2xl font-black ${overBudget.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {overBudget.length}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-1">{overBudget.length === 0 ? 'todo OK' : 'excedidas'}</p>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* Category Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((categoryObj) => (
                        <BudgetCard
                            key={categoryObj.id}
                            category={categoryObj}
                            expenses={expenses}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            </div>

            {/* SECTION 3: SUBSCRIPTIONS */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Suscripciones y Gastos Fijos</h3>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        {subscriptionCount} {subscriptionCount === 1 ? 'suscripción' : 'suscripciones'}
                    </span>
                </div>

                {subscriptions.length > 0 ? (
                    <>
                        {/* Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="relative overflow-hidden rounded-3xl bg-indigo-600 text-white p-6 shadow-lg shadow-indigo-500/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <CreditCard size={18} className="text-indigo-200" />
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Costo Mensual</p>
                                </div>
                                <p className="text-3xl font-black">{formatMoney(totalSubscriptions)}</p>
                                <p className="text-xs text-indigo-200 mt-1">{subscriptionPctOfIncome.toFixed(0)}% de tus ingresos</p>
                            </div>

                            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <TrendingDown size={18} className="text-red-500" />
                                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Costo Anual</p>
                                </div>
                                <p className="text-3xl font-black text-zinc-900 dark:text-white">{formatMoney(annualCost)}</p>
                                <p className="text-xs text-zinc-400 mt-1">{formatMoney(annualCost / 12)}/mes × 12</p>
                            </div>

                            {nextDueDay && (
                                <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Calendar size={18} className="text-purple-500" />
                                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Próximo Cobro</p>
                                    </div>
                                    <p className="text-3xl font-black text-zinc-900 dark:text-white">Día {nextDueDay}</p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        {subscriptions.filter(s => s.dueDate === nextDueDay).length} {subscriptions.filter(s => s.dueDate === nextDueDay).length === 1 ? 'suscripción' : 'suscripciones'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Calendar View */}
                        <SubscriptionCalendar subscriptions={subscriptions} />

                        {/* Subscription Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                            {subscriptions.map((exp) => {
                                const catColor = exp.categoryRel?.color || 'bg-zinc-400';
                                const catIcon = exp.categoryRel?.icon || 'RefreshCw';
                                return (
                                    <div key={exp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-indigo-500" />

                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catColor?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${catColor || 'text-zinc-500'}`}>
                                                    <CategoryIcon iconName={catIcon} size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[140px]">{exp.name}</h4>
                                                    {exp.categoryRel && (
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">{exp.categoryRel.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500">
                                                Día {exp.dueDate || '1'}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end mt-3">
                                            <p className="text-2xl font-black text-zinc-900 dark:text-white">-{formatMoney(Number(exp.amount))}</p>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        confirmDelete(async () => {
                                                            await deleteExpense(exp.id);
                                                            toast.success("Suscripción eliminada");
                                                            if (onUpdate) onUpdate();
                                                        });
                                                    }}
                                                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <span className="text-xs">✕</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Subscription Button */}
                            <button
                                onClick={() => setShowWizard(true)}
                                className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-zinc-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                            >
                                <Plus size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Nueva Suscripción</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                        <CreditCard size={32} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                        <p className="text-sm font-bold text-zinc-500 mb-1">No tienes suscripciones</p>
                        <p className="text-xs text-zinc-400">Registra tus gastos recurrentes para controlar tu &quot;costo de vida&quot; base.</p>
                    </div>
                )}
            </div>

            {showWizard && profileId && (
                <ExpenseWizard
                    profileId={profileId}
                    categories={categories}
                    creditCards={creditCards}
                    accounts={accounts}
                    initialData={{ isRecurring: true }}
                    onSuccess={() => { setShowWizard(false); onUpdate?.(); }}
                    onClose={() => setShowWizard(false)}
                />
            )}
        </div>
    );
}
