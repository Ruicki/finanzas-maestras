'use client';

import React, { useState } from 'react';
import BudgetTable from '@/components/budgets/BudgetTable';
import BudgetCard from '@/components/budgets/BudgetCard';
import FinancialRules from '@/components/dashboard/widgets/FinancialRules';
import { formatMoney } from '@/lib/utils';
import { CreditCard, Category, Expense } from '@prisma/client';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { deleteExpense } from '@/app/actions/budget';
import { toast } from 'sonner';

// Extend types to match our serialization
type ExtendedCategory = Category & {
    monthlyLimit: number | null;
    isRollover: boolean;
    rolloverBalance: number;
}

interface BudgetsTabProps {
    categories: any[];
    expenses: any[];
    currency?: string;
    // New props for the rules
    totalIncome: number;
    totalDebtPayments: number;
    totalSavings: number;
    totalCash: number;
    // Date Filtering
    currentMonth: number; // 0-11
    currentYear: number;
    onUpdate?: () => void;
}

export default function BudgetsTab({ categories, expenses, currency = 'USD', totalIncome, totalDebtPayments, totalSavings, totalCash, currentMonth, currentYear, onUpdate }: BudgetsTabProps) {

    const [viewMode, setViewMode] = useState<'cards' | 'table' | 'subscriptions'>('cards');

    // Subscriptions Logic - sorted by due date
    const subscriptions = expenses
        .filter(e => e.isRecurring)
        .sort((a, b) => (a.dueDate || 1) - (b.dueDate || 1));

    const totalSubscriptions = subscriptions.reduce((s, e) => s + Number(e.amount), 0);
    const subscriptionCount = subscriptions.length;
    const nextDueDay = subscriptions.length > 0 ? Math.min(...subscriptions.map(s => s.dueDate || 1)) : null;
    const subscriptionPctOfIncome = totalIncome > 0 ? (totalSubscriptions / totalIncome) * 100 : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 pt-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Presupuesto</h2>
                    <p className="text-zinc-500">Planifica tus límites y controla tus fondos (Sinking Funds).</p>
                </div>

                {/* Control Segmentado */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1 shrink-0">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Tarjetas
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Tabla
                    </button>
                    <button
                        onClick={() => setViewMode('subscriptions')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'subscriptions' ? 'bg-white dark:bg-zinc-800 text-purple-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Suscripciones
                    </button>
                </div>
            </div>

            {/* FINANCIAL RULES WIDGETS (Only in Budget Views) */}
            {viewMode !== 'subscriptions' && (
                <FinancialRules
                    income={totalIncome}
                    expenses={expenses}
                    debtsPayment={totalDebtPayments}
                    totalSavings={totalSavings}
                    totalCash={totalCash}
                />
            )}

            {/* VISTA: TABLA */}
            {viewMode === 'table' && (
                <BudgetTable
                    categories={categories}
                    expenses={expenses}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    currency={currency}
                />
            )}

            {/* VISTA: TARJETAS (Migrated from ExpensesTab) */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((categoryObj) => (
                        <BudgetCard
                            key={categoryObj.id}
                            category={categoryObj}
                            expenses={expenses}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            )}

            {/* VISTA: SUSCRIPCIONES */}
            {viewMode === 'subscriptions' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Widget de Resumen Mejorado */}
                    <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 text-white p-10 shadow-xl shadow-indigo-500/30">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">Gastos Fijos Mensuales</p>
                                <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-2">
                                    {formatMoney(totalSubscriptions)}
                                </h2>
                                <p className="text-indigo-100 text-sm font-medium opacity-80">
                                    {subscriptionCount} {subscriptionCount === 1 ? 'suscripción' : 'suscripciones'} activas
                                    {subscriptionPctOfIncome > 0 && (
                                        <span className="ml-2">• {subscriptionPctOfIncome.toFixed(0)}% de tus ingresos</span>
                                    )}
                                </p>
                            </div>
                            {nextDueDay && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                                    <Calendar size={20} className="text-indigo-200" />
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-300 uppercase">Próximo cobro</p>
                                        <p className="text-lg font-black">Día {nextDueDay}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscription Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {subscriptions.map((exp) => {
                            const catColor = exp.categoryRel?.color || 'bg-zinc-400';
                            const catIcon = exp.categoryRel?.icon || 'RefreshCw';
                            return (
                                <div key={exp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl flex flex-col justify-between min-h-[180px] shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-purple-500 to-indigo-500" />

                                    <div className="flex justify-between items-start">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${catColor?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${catColor || 'text-zinc-500'}`}>
                                            <CategoryIcon iconName={catIcon} size={20} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-500">
                                                Día {exp.dueDate || '1'}
                                            </div>
                                            {/* Actions on hover */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => {/* TODO: edit subscription */}}
                                                    className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
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
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{exp.name}</h4>
                                        {exp.categoryRel && (
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mt-0.5">{exp.categoryRel.name}</p>
                                        )}
                                        <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">-{formatMoney(Number(exp.amount))}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Subscription Button */}
                        <button
                            onClick={() => {/* TODO: open expense wizard with isRecurring */}}
                            className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center min-h-[180px] text-zinc-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                        >
                            <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold">Nueva Suscripción</span>
                        </button>
                    </div>

                    {subscriptions.length === 0 && (
                        <div className="text-center py-12 text-zinc-400">
                            <p className="text-lg font-bold mb-2">No tienes suscripciones</p>
                            <p className="text-sm">Registra tus gastos recurrentes para controlar tu "costo de vida" base.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
