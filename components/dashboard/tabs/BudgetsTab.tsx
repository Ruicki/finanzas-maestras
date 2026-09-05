'use client';

import React, { useState } from 'react';
import BudgetCard from '@/components/budgets/BudgetCard';
import FinancialRules from '@/components/dashboard/widgets/FinancialRules';
import SubscriptionCalendar from '@/components/budgets/SubscriptionCalendar';
import { formatMoney } from '@/lib/utils';
import { PlusIcon, CalendarIcon, TrendingDownIcon, CreditCardIcon, RepeatIcon, WalletIcon, PencilIcon } from '@animateicons/react/lucide';
import { PieChart } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { deleteExpense, createExpense, markSubscriptionPaid, markSubscriptionUnpaid } from '@/app/actions/budget';
import { toast } from 'sonner';

import ExpenseWizard from '@/components/expenses/ExpenseWizard';

const RECURRENCE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensual',
    ANNUAL: 'Anual',
};

function normalizeToMonthly(amount: number, type?: string | null): number {
    // ANNUAL: full amount in billing month (not divided)
    return amount;
}

function isPaidThisMonth(exp: any): boolean {
    if (!exp.lastPaidAt) return false;
    const paid = new Date(exp.lastPaidAt);
    const now = new Date();
    return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
}

interface BudgetsTabProps {
    categories: any[];
    expenses: any[];
    allExpenses?: any[];
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

type SubTab = 'resumen' | 'categorias' | 'suscripciones';

export default function BudgetsTab({ categories, expenses, allExpenses = [], creditCards = [], accounts = [], profileId, currency = 'USD', totalIncome, totalDebtPayments, totalSavings, totalCash, currentMonth, currentYear, onUpdate }: BudgetsTabProps) {
    const [subTab, setSubTab] = useState<SubTab>('resumen');
    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [editingSub, setEditingSub] = useState<any | null>(null);
    const [payingSub, setPayingSub] = useState<any | null>(null);
    const [payMethod, setPayMethod] = useState<'ACCOUNT' | 'CARD'>('ACCOUNT');
    const [payAccountId, setPayAccountId] = useState<string>('');
    const [payCardId, setPayCardId] = useState<string>('');
    const [processingPay, setProcessingPay] = useState(false);

    async function handlePaySubscription() {
        if (!payingSub || !profileId) return;
        if (payMethod === 'ACCOUNT' && !payAccountId) { toast.error("Selecciona una cuenta"); return; }
        if (payMethod === 'CARD' && !payCardId) { toast.error("Selecciona una tarjeta"); return; }

        setProcessingPay(true);
        try {
            await createExpense({
                name: payingSub.name,
                amount: Number(payingSub.amount),
                category: payingSub.category || 'Suscripciones',
                profileId,
                categoryId: payingSub.categoryId,
                paymentMethod: payMethod === 'CARD' ? 'CREDIT' : 'CASH',
                linkedCardId: payMethod === 'CARD' ? Number(payCardId) : undefined,
                accountId: payMethod === 'ACCOUNT' ? Number(payAccountId) : undefined,
                isRecurring: false,
                isOneTime: true,
                date: new Date(),
            });
            toast.success(`${payingSub.name} pagado ✓`);
            setPayingSub(null);
            setPayAccountId('');
            setPayCardId('');
            onUpdate?.();
        } catch (err: any) {
            toast.error(err.message || "Error al pagar");
        } finally {
            setProcessingPay(false);
        }
    }

    // Subscriptions sorted by due date (each one individually)
    const subscriptions = expenses
        .filter(e => e.isRecurring)
        .sort((a, b) => (a.dueDate || 1) - (b.dueDate || 1));

    const totalSubscriptions = subscriptions.reduce((s, e) => s + normalizeToMonthly(Number(e.amount), e.recurrenceType), 0);
    const subscriptionCount = subscriptions.length;
    const nextDueDay = subscriptions.length > 0 ? Math.min(...subscriptions.map(s => s.dueDate || 1)) : null;
    const subscriptionPctOfIncome = totalIncome > 0 ? (totalSubscriptions / totalIncome) * 100 : 0;
    const annualCost = subscriptions.reduce((s, e) => {
        if (e.recurrenceType === 'ANNUAL') return s + Number(e.amount);
        return s + Number(e.amount) * 12;
    }, 0);

    const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
        { id: 'resumen', label: 'Regla 50/30/20', icon: <WalletIcon size={16} /> },
        { id: 'categorias', label: 'Categorías', icon: <PieChart className="lucide-animated" size={16} /> },
        { id: 'suscripciones', label: 'Suscripciones', icon: <RepeatIcon size={16} /> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 pt-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Presupuesto</h2>
                    <p className="text-zinc-500">Reglas financieras, control de gastos y suscripciones.</p>
                </div>
            </div>

            {/* SUB-TABS */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/50">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center ${
                            subTab === tab.id
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* SUB-TAB CONTENT */}
            {subTab === 'resumen' && (
                <FinancialRules
                    income={totalIncome}
                    expenses={expenses}
                    debtsPayment={totalDebtPayments}
                    totalSavings={totalSavings}
                    totalCash={totalCash}
                />
            )}

            {subTab === 'categorias' && (
                <div className="space-y-6">
                    {/* Summary Cards Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(() => {
                            // Helper: get the budget limit for a specific month
                            const getMonthLimit = (cat: any, year: number, month1: number) => {
                                const mb = cat.budgets?.find((b: any) => b.year === year && b.month === month1);
                                return mb ? Number(mb.limit) : (Number(cat.monthlyLimit) || 0);
                            };

                            // Helper: calculate rollover from previous month
                            const getRollover = (cat: any) => {
                                let prevMonth = currentMonth; // 0-indexed current
                                let prevYear = currentYear;
                                prevMonth -= 1;
                                if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }
                                const prevMonth1 = prevMonth + 1; // 1-indexed

                                const prevLimit = getMonthLimit(cat, prevYear, prevMonth1);
                                if (prevLimit <= 0) return 0;

                                const prevSpent = allExpenses
                                    .filter(e => {
                                        if (e.categoryId !== cat.id) return false;
                                        const d = new Date(e.createdAt);
                                        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
                                    })
                                    .reduce((sum, e) => sum + Number(e.amount), 0);

                                return Math.max(0, prevLimit - prevSpent);
                            };

                            // Límite del mes seleccionado por categoría (presupuesto específico o fallback global)
                            const getCategoryLimit = (cat: any) => {
                                return getMonthLimit(cat, currentYear, currentMonth + 1);
                            };

                            const getCategoryRollover = (cat: any) => {
                                return getRollover(cat);
                            };

                            const catStats = categories.map(cat => {
                                const spent = expenses
                                    .filter(e => {
                                        const d = new Date(e.createdAt);
                                        return e.categoryId === cat.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                                    })
                                    .reduce((sum, e) => sum + normalizeToMonthly(Number(e.amount), e.recurrenceType), 0);
                                const rollover = getCategoryRollover(cat);
                                const limit = getCategoryLimit(cat);
                                const effective = limit + rollover;
                                return { ...cat, spent, rollover, effective };
                            });
                            const totalSpent = catStats.reduce((s, c) => s + c.spent, 0);
                            const totalAssigned = catStats.reduce((s, c) => s + c.effective, 0);
                            const totalRollover = catStats.reduce((s, c) => s + c.rollover, 0);
                            const overBudget = catStats.filter(c => c.effective > 0 && c.spent > c.effective);

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
                                        <p className="text-[10px] text-zinc-400 mt-1">
                                            {totalRollover > 0
                                                ? `${formatMoney(totalRollover)} del mes anterior`
                                                : `${categories.length} categorías`
                                            }
                                        </p>
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
                        {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((categoryObj) => {
                            // Calculate rollover for this category
                            let prevM = currentMonth;
                            let prevY = currentYear;
                            prevM -= 1;
                            if (prevM < 0) { prevM = 11; prevY -= 1; }
                            const prevMb = categoryObj.budgets?.find((b: any) => b.year === prevY && b.month === prevM + 1);
                            const prevLimit = prevMb ? Number(prevMb.limit) : (Number(categoryObj.monthlyLimit) || 0);
                            const prevSpent = allExpenses
                                .filter(e => e.categoryId === categoryObj.id)
                                .filter(e => { const d = new Date(e.createdAt); return d.getMonth() === prevM && d.getFullYear() === prevY; })
                                .reduce((sum, e) => sum + Number(e.amount), 0);
                            const rollover = prevLimit > 0 ? Math.max(0, prevLimit - prevSpent) : 0;

                            return (
                                <BudgetCard
                                    key={categoryObj.id}
                                    category={categoryObj}
                                    expenses={expenses}
                                    year={currentYear}
                                    month={currentMonth + 1}
                                    rollover={rollover}
                                    onUpdate={onUpdate}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {subTab === 'suscripciones' && (
                <div className="space-y-6">
                    {subscriptions.length > 0 ? (
                        <>
                            {/* Summary Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative overflow-hidden rounded-3xl bg-indigo-600 text-white p-6 shadow-lg shadow-indigo-500/20">
                                    <div className="flex items-center gap-3 mb-3">
                                        <CreditCardIcon size={18} className="text-indigo-200" />
                                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Costo Mensual</p>
                                    </div>
                                    <p className="text-3xl font-black">{formatMoney(totalSubscriptions)}</p>
                                    <p className="text-xs text-indigo-200 mt-1">{subscriptionPctOfIncome.toFixed(0)}% de tus ingresos</p>
                                </div>

                                <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <TrendingDownIcon size={18} className="text-red-500" />
                                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Costo Anual</p>
                                    </div>
                                    <p className="text-3xl font-black text-zinc-900 dark:text-white">{formatMoney(annualCost)}</p>
                                    <p className="text-xs text-zinc-400 mt-1">{formatMoney(annualCost / 12)}/mes × 12</p>
                                </div>

                                {nextDueDay && (
                                    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <CalendarIcon size={18} className="text-purple-500" />
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

                            {/* Subscription Cards — each one individually */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subscriptions.map((exp) => {
                                    const catColor = exp.categoryRel?.color || 'bg-zinc-400';
                                    const catIcon = exp.categoryRel?.icon || 'RefreshCw';
                                    const isPaying = payingSub?.id === exp.id;
                                    return (
                                        <div key={exp.id} className={`bg-white dark:bg-zinc-900 border rounded-2xl flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isPaying ? 'border-indigo-400 dark:border-indigo-500/50 ring-2 ring-indigo-500/20' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-indigo-500" />

                                            <div className="p-5">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catColor?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${catColor || 'text-zinc-500'}`}>
                                                            <CategoryIcon iconName={catIcon} size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[140px]">{exp.name}</h4>
                                                            <div className="flex items-center gap-1.5">
                                                                {exp.categoryRel && (
                                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">{exp.categoryRel.name}</p>
                                                                )}
                                                                {exp.recurrenceType && exp.recurrenceType !== 'MONTHLY' && (
                                                                    <span className="text-[9px] font-bold text-purple-500 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full">
                                                                        {RECURRENCE_LABELS[exp.recurrenceType] || 'Mensual'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {isPaidThisMonth(exp) ? (
                                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">Pagado</span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">Pendiente</span>
                                                        )}
                                                        <div className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500">
                                                            Día {exp.dueDate || '1'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end mt-3">
                                                    <div>
                                                        <p className="text-2xl font-black text-zinc-900 dark:text-white">-{formatMoney(Number(exp.amount))}</p>
                                                        {exp.recurrenceType === 'ANNUAL' && (
                                                            <p className="text-[10px] text-zinc-400">{formatMoney(Number(exp.amount) / 12)}/mes equivalente</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Form (inline) */}
                                            {isPaying && (
                                                <div className="px-5 pb-4 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Pagar con</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setPayMethod('ACCOUNT')}
                                                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${payMethod === 'ACCOUNT' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                        >
                                                            <WalletIcon size={12} /> Efectivo
                                                        </button>
                                                        <button
                                                            onClick={() => setPayMethod('CARD')}
                                                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${payMethod === 'CARD' ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                        >
                                                            <CreditCardIcon size={12} /> Tarjeta
                                                        </button>
                                                    </div>

                                                    {payMethod === 'ACCOUNT' ? (
                                                        <select
                                                            value={payAccountId}
                                                            onChange={e => setPayAccountId(e.target.value)}
                                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
                                                        >
                                                            <option value="">Seleccionar cuenta</option>
                                                            {accounts.map((acc: any) => (
                                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <select
                                                            value={payCardId}
                                                            onChange={e => setPayCardId(e.target.value)}
                                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
                                                        >
                                                            <option value="">Seleccionar tarjeta</option>
                                                            {creditCards.map((card: any) => (
                                                                <option key={card.id} value={card.id}>{card.name}</option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setPayingSub(null)}
                                                            className="flex-1 py-2 rounded-xl text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={handlePaySubscription}
                                                            disabled={processingPay}
                                                            className="flex-1 py-2 rounded-xl text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-all"
                                                        >
                                                            {processingPay ? 'Procesando...' : `Pagar ${formatMoney(Number(exp.amount))}`}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            {!isPaying && (
                                                <div className="px-5 pb-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setPayingSub(exp); setPayMethod('ACCOUNT'); }}
                                                            className="py-2 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all shadow-sm hover:shadow-md"
                                                        >
                                                            Pagar
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    if (isPaidThisMonth(exp)) {
                                                                        await markSubscriptionUnpaid(exp.id);
                                                                        toast.success("Marcado como pendiente");
                                                                    } else {
                                                                        await markSubscriptionPaid(exp.id);
                                                                        toast.success("Marcado como pagado");
                                                                    }
                                                                    if (onUpdate) onUpdate();
                                                                } catch (err) {
                                                                    toast.error("Error al actualizar");
                                                                }
                                                            }}
                                                            className={`py-2 px-3 rounded-xl text-[10px] font-bold transition-all ${isPaidThisMonth(exp) ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30'}`}
                                                        >
                                                            {isPaidThisMonth(exp) ? 'Pagado ✓' : 'Marcar pagado'}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setEditingSub(exp)}
                                                            className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Editar"
                                                        >
                                                            <PencilIcon size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                confirmDelete(async () => {
                                                                    await deleteExpense(exp.id);
                                                                    toast.success("Suscripción cancelada");
                                                                    if (onUpdate) onUpdate();
                                                                });
                                                            }}
                                                            className="px-3 py-1.5 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-all"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Add Subscription Button */}
                                <button
                                    onClick={() => setShowWizard(true)}
                                    className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-zinc-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                                >
                                    <PlusIcon size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold">Nueva Suscripción</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                            <CreditCardIcon size={32} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                            <p className="text-sm font-bold text-zinc-500 mb-1">No tienes suscripciones</p>
                            <p className="text-xs text-zinc-400">Registra tus gastos recurrentes para controlar tu &quot;costo de vida&quot; base.</p>
                            <button
                                onClick={() => setShowWizard(true)}
                                className="mt-4 px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors"
                            >
                                Agregar Suscripción
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(showWizard || editingSub) && profileId && (
                <ExpenseWizard
                    profileId={profileId}
                    categories={categories}
                    creditCards={creditCards}
                    accounts={accounts}
                    initialData={editingSub || { isRecurring: true }}
                    isEditing={!!editingSub}
                    recentNames={[...new Set(expenses.map(e => e.name))]}
                    onSuccess={() => { setShowWizard(false); setEditingSub(null); onUpdate?.(); }}
                    onClose={() => { setShowWizard(false); setEditingSub(null); }}
                />
            )}
        </div>
    );
}
