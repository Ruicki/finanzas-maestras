'use client';

import React, { useState } from 'react';
import BudgetCard from '@/components/budgets/BudgetCard';
import EmptyState from '@/components/shared/EmptyState';
import FinancialRules from '@/components/dashboard/widgets/FinancialRules';
import SubscriptionsPanel from '@/components/budgets/SubscriptionsPanel';
import { formatMoney } from '@/lib/utils';
import { RepeatIcon, WalletIcon } from '@animateicons/react/lucide';
import { PieChart } from 'lucide-react';
import { estadoDeCategorias, resumenDePresupuesto, sobranteDelMesAnterior } from '@/lib/budgets';
import { ProfileWithData } from '@/types';

import ExpenseWizard from '@/components/expenses/ExpenseWizard';

type Category = ProfileWithData['categories'][number];
type Expense = ProfileWithData['expenses'][number];
type CreditCard = ProfileWithData['creditCards'][number];
type Account = ProfileWithData['accounts'][number];

interface BudgetsTabProps {
    categories: Category[];
    expenses: Expense[];
    allExpenses?: Expense[];
    creditCards?: CreditCard[];
    accounts?: Account[];
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


export default function BudgetsTab({ categories, expenses, allExpenses = [], creditCards = [], accounts = [], profileId, totalIncome, totalDebtPayments, totalSavings, totalCash, currentMonth, currentYear, onUpdate }: BudgetsTabProps) {
    const [subTab, setSubTab] = useState<SubTab>('resumen');
    const [showWizard, setShowWizard] = useState(false);
    const [editingSub, setEditingSub] = useState<Partial<Expense> | null>(null);

    // Suscripciones ordenadas por dia de cobro.
    const subscriptions = expenses
        .filter(e => e.isRecurring)
        .sort((a, b) => (a.dueDate || 1) - (b.dueDate || 1));

    // Las cuentas de las categorias viven en lib/budgets.ts. Estaban escritas
    // dos veces —una para el resumen y otra dentro del bucle de las tarjetas—,
    // que es como el total acaba sin cuadrar con lo que tiene debajo.
    const estados = estadoDeCategorias(categories, expenses, allExpenses, currentMonth, currentYear);
    const resumen = resumenDePresupuesto(estados);

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
                    <h2 className="font-title text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">Tu Presupuesto</h2>
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
                                ? 'bg-surface dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Gastado</p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatMoney(resumen.gastado)}</p>
                            <p className="text-[10px] text-zinc-400 mt-1">este mes</p>
                        </div>
                        <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Presupuesto</p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatMoney(resumen.asignado)}</p>
                            <p className="text-[10px] text-zinc-400 mt-1">
                                {resumen.arrastre > 0
                                    ? `${formatMoney(resumen.arrastre)} del mes anterior`
                                    : `${categories.length} categorías`
                                }
                            </p>
                        </div>
                        <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Restante</p>
                            <p className={`text-2xl font-black ${resumen.asignado - resumen.gastado >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatMoney(resumen.asignado - resumen.gastado)}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1">{resumen.asignado > 0 ? `${((resumen.gastado / resumen.asignado) * 100).toFixed(0)}% usado` : 'sin límite'}</p>
                        </div>
                        <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Alertas</p>
                            <p className={`text-2xl font-black ${resumen.excedidas > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {resumen.excedidas}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1">{resumen.excedidas === 0 ? 'todo OK' : 'excedidas'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {categories.length === 0 && (
                            <EmptyState
                                icon={<PieChart size={36} />}
                                title="Aún no hay categorías"
                                description="Las categorías agrupan tus gastos (vivienda, transporte, comida…) y te dejan ponerle un límite mensual a cada grupo. Normalmente se crean solas al entrar por primera vez; si esta pantalla sigue vacía, registra un gasto y elige su categoría."
                                actionLabel="Registrar un gasto"
                                onAction={() => setShowWizard(true)}
                            />
                        )}
                        {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((categoryObj) => (
                            <BudgetCard
                                key={categoryObj.id}
                                category={categoryObj}
                                expenses={expenses}
                                year={currentYear}
                                month={currentMonth + 1}
                                rollover={sobranteDelMesAnterior(categoryObj, allExpenses, currentMonth, currentYear)}
                                onUpdate={onUpdate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {subTab === 'suscripciones' && (
                <SubscriptionsPanel
                    suscripciones={subscriptions}
                    totalIngresos={totalIncome}
                    onNueva={() => setShowWizard(true)}
                    onEditar={setEditingSub}
                    onUpdate={onUpdate}
                />
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