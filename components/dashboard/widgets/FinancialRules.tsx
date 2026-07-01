'use client';

import React from 'react';
import { formatMoney } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, TrendingUp, Calculator, Target, ArrowRight } from 'lucide-react';

interface FinancialRulesProps {
    income: number;
    expenses: any[];
    debtsPayment: number;
    totalSavings: number;
    totalCash: number;
}

export default function FinancialRules({ income, expenses, debtsPayment, totalSavings, totalCash }: FinancialRulesProps) {
    if (income === 0) return null;

    // --- RULE 1: 50/30/20 ---
    const needs = expenses.filter(e => e.categoryRel?.type === 'FIXED').reduce((sum, e) => sum + Number(e.amount), 0);
    const wants = expenses.filter(e => ['VARIABLE', 'LUXURY'].includes(e.categoryRel?.type)).reduce((sum, e) => sum + Number(e.amount), 0);
    // Standard: Savings = Income - Needs - Wants (what's left over)
    const savings = Math.max(0, income - needs - wants);

    const totalClassified = needs + wants + savings;
    const data503020 = totalClassified > 0 ? [
        { name: 'Necesidades', value: needs, color: '#3b82f6', target: 0.5 },
        { name: 'Deseos', value: wants, color: '#a855f7', target: 0.3 },
        { name: 'Ahorro', value: savings, color: '#10b981', target: 0.2 },
    ] : [
        { name: 'Necesidades', value: 0, color: '#3b82f6', target: 0.5 },
        { name: 'Deseos', value: 0, color: '#a855f7', target: 0.3 },
        { name: 'Ahorro', value: 0, color: '#10b981', target: 0.2 },
    ];

    // --- RULE 2: DEBT-TO-INCOME (DTI) ---
    const dtiRatio = income > 0 ? (debtsPayment / income) * 100 : 0;
    const dtiStatus = dtiRatio <= 36 ? 'healthy' : dtiRatio <= 50 ? 'warning' : 'critical';
    const dtiColor = dtiStatus === 'healthy' ? 'text-emerald-500' : dtiStatus === 'warning' ? 'text-amber-500' : 'text-red-500';
    const dtiBg = dtiStatus === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : dtiStatus === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';

    // --- RULE 3: EMERGENCY FUND ---
    const monthlyFixedExpenses = expenses.filter(e => e.categoryRel?.type === 'FIXED').reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlyBurn = monthlyFixedExpenses > 0 ? monthlyFixedExpenses : (needs + wants);
    const monthsCovered = monthlyBurn > 0 ? (totalCash / monthlyBurn) : 0;
    const monthsMissing = Math.max(0, 6 - monthsCovered);
    const monthlySavingsNeeded = monthsMissing > 0 && monthsCovered < 6 ? Math.ceil(monthlyBurn * monthsMissing / 6) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-700">

            {/* RULE 1: 50/30/20 */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500" />
                        Regla 50/30/20
                    </h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                        PRESUPUESTO
                    </div>
                </div>

                <div className="h-40 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data503020}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {data503020.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => formatMoney(Number(value))}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-zinc-400">DISTRIBUCIÓN</span>
                    </div>
                </div>

                <div className="space-y-2 mt-2">
                    {data503020.map((item) => {
                        const pct = income > 0 ? (item.value / income) * 100 : 0;
                        const diff = pct - (item.target * 100);
                        return (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-zinc-600 dark:text-zinc-400">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900 dark:text-white">{pct.toFixed(0)}%</span>
                                    <span className={`text-[10px] ${diff > 5 ? 'text-red-400' : diff < -5 ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RULE 2: DEBT TO INCOME - Simplified */}
            <div className={`rounded-3xl p-6 border shadow-sm flex flex-col ${dtiBg}`}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                        <Calculator size={18} className="text-purple-500" />
                        Endeudamiento
                    </h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                        MÁX 36%
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className={`text-5xl font-black tracking-tighter mb-1 ${dtiColor}`}>
                        {dtiRatio.toFixed(0)}%
                    </div>
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">de tu ingreso va a deudas</p>

                    {/* Status indicator */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${dtiStatus === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : dtiStatus === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {dtiStatus === 'healthy' ? '✓ Saludable' : dtiStatus === 'warning' ? '⚠ Precaución' : '✕ Alto endeudamiento'}
                    </div>

                    <p className="text-xs text-zinc-500 mt-4 px-2 leading-relaxed">
                        {dtiStatus === 'healthy'
                            ? "Tus deudas están bajo control. Sigue así."
                            : dtiStatus === 'warning'
                                ? "Estás acercándote al límite. Revisa tus gastos en deudas."
                                : "Tus deudas son altas. Considera reducirlas pronto."}
                    </p>
                </div>
            </div>

            {/* RULE 3: EMERGENCY FUND - Enhanced */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-500" />
                        Fondo Emergencia
                    </h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                        META: 6 MESES
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-4xl font-black text-zinc-900 dark:text-white">{monthsCovered.toFixed(1)}</span>
                        <span className="text-sm font-bold text-zinc-400 mb-1.5">meses cubiertos</span>
                    </div>

                    {/* Bar chart */}
                    <div className="flex gap-1 h-10 items-end mb-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div
                                key={i}
                                className={`flex-1 rounded-t-lg transition-all duration-500 border-b-2 border-zinc-50 dark:border-zinc-900 ${i <= Math.ceil(monthsCovered) ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                style={{ height: `${(i / 6) * 100}%` }}
                            />
                        ))}
                    </div>

                    {/* Monthly burn */}
                    <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-3">
                        <span>Gasto fijo mensual</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{formatMoney(monthlyBurn)}</span>
                    </div>

                    {/* Recommendation */}
                    {monthsCovered < 6 && monthlyBurn > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                                <Target size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                                    <p className="font-bold mb-1">
                                        {monthsMissing > 0 ? `Te faltan ${monthsMissing.toFixed(1)} meses` : '¡Meta alcanzada!'}
                                    </p>
                                    {monthlySavingsNeeded > 0 && (
                                        <p className="flex items-center gap-1">
                                            Ahorra <span className="font-bold">{formatMoney(monthlySavingsNeeded)}</span>/mes
                                            <ArrowRight size={10} />
                                            fondo completo en ~{Math.ceil(monthsMissing)} meses
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {monthsCovered >= 6 && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 text-center">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                ¡Tienes tu fondo de emergencia completo!
                            </p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
