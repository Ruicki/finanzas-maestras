'use client';

import React from 'react';
import { formatMoney } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheckIcon, TrendingUpIcon, CalculatorIcon, ArrowRightIcon, DollarSignIcon, PiggyBankIcon } from '@animateicons/react/lucide';
import { Target } from 'lucide-react';

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
    const getType = (e: any): string => {
        if (e.categoryRel?.type) return e.categoryRel.type;
        const name = (e.category || e.name || '').toLowerCase();
        if (['alquiler', 'arriendo', 'servicio', 'servicios', 'internet', 'teléfono', 'teléfono celular', 'seguro', 'educación', 'colegio', 'matrícula', 'hipoteca', 'préstamo', 'loan'].some(k => name.includes(k))) return 'FIXED';
        if (['ahorro', 'inversión', 'inversion', 'fondo', 'meta'].some(k => name.includes(k))) return 'SAVING';
        return 'VARIABLE';
    };

    const needs = expenses.filter(e => getType(e) === 'FIXED').reduce((sum, e) => sum + Number(e.amount), 0);
    const wants = expenses.filter(e => ['VARIABLE', 'LUXURY'].includes(getType(e))).reduce((sum, e) => sum + Number(e.amount), 0);
    const savings = Math.max(0, income - needs - wants);

    const needsPct = income > 0 ? (needs / income) * 100 : 0;
    const wantsPct = income > 0 ? (wants / income) * 100 : 0;
    const savingsPct = income > 0 ? (savings / income) * 100 : 0;

    const needsDiff = needsPct - 50;
    const wantsDiff = wantsPct - 30;
    const savingsDiff = savingsPct - 20;

    const data503020 = income > 0 ? [
        { name: 'Necesidades', value: needs, color: '#3b82f6', target: 50, actual: needsPct, diff: needsDiff },
        { name: 'Deseos', value: wants, color: '#a855f7', target: 30, actual: wantsPct, diff: wantsDiff },
        { name: 'Ahorro', value: savings, color: '#10b981', target: 20, actual: savingsPct, diff: savingsDiff },
    ] : [];

    // --- RULE 2: DEBT-TO-INCOME ---
    const dtiRatio = income > 0 ? (debtsPayment / income) * 100 : 0;
    const dtiStatus = dtiRatio <= 36 ? 'healthy' : dtiRatio <= 50 ? 'warning' : 'critical';
    const dtiColor = dtiStatus === 'healthy' ? 'text-emerald-500' : dtiStatus === 'warning' ? 'text-amber-500' : 'text-red-500';
    const dtiBg = dtiStatus === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : dtiStatus === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';

    // --- RULE 3: EMERGENCY FUND ---
    const monthlyFixedExpenses = expenses.filter(e => getType(e) === 'FIXED').reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlyBurn = monthlyFixedExpenses > 0 ? monthlyFixedExpenses : (needs + wants);
    const monthsCovered = monthlyBurn > 0 ? (totalCash / monthlyBurn) : 0;
    const monthsMissing = Math.max(0, 6 - monthsCovered);
    const monthlySavingsNeeded = monthsMissing > 0 && monthsCovered < 6 ? Math.ceil(monthlyBurn * monthsMissing / 6) : 0;

    // Health Score
    let score = 0;
    if (needsDiff <= 5) score += 33;
    if (wantsDiff <= 5) score += 33;
    if (dtiStatus === 'healthy') score += 34;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">

            {/* EXECUTIVE SUMMARY */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <DollarSignIcon size={18} className="text-zinc-400" />
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-200">Resumen Ejecutivo</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Ingresos</p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatMoney(income)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Gasto Fijo</p>
                        <p className="text-2xl font-black text-blue-500">{formatMoney(needs)}</p>
                        <p className="text-[10px] text-zinc-400">{needsPct.toFixed(0)}% del ingreso</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Gasto Variable</p>
                        <p className="text-2xl font-black text-purple-500">{formatMoney(wants)}</p>
                        <p className="text-[10px] text-zinc-400">{wantsPct.toFixed(0)}% del ingreso</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Disponible</p>
                        <p className={`text-2xl font-black ${savings >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatMoney(savings)}</p>
                        <p className="text-[10px] text-zinc-400">{savingsPct.toFixed(0)}% del ingreso</p>
                    </div>
                </div>
            </div>

            {/* RULES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* HEALTH SCORE */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Score Financiero</p>
                    <div className={`text-5xl font-black mb-1 ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {score}
                    </div>
                    <p className="text-xs text-zinc-400">/100</p>
                    <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${score >= 80 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : score >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {score >= 80 ? '✓ Excelente' : score >= 50 ? '⚠ Regular' : '✕ Necesita mejorar'}
                    </div>
                </div>

                {/* RULE 1: 50/30/20 — BIGGER CHART */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <TrendingUpIcon size={18} className="text-blue-500" />
                            Regla 50/30/20
                        </h3>
                    </div>

                    <div className="h-52 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data503020}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
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
                            <div className="text-center">
                                <span className="text-xs font-bold text-zinc-400 block">DISTRIBUCIÓN</span>
                                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">{formatMoney(income)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        {data503020.map((item) => {
                            const diff = item.diff;
                            const statusColor = diff > 5 ? 'text-red-400' : diff < -5 ? 'text-blue-400' : 'text-emerald-400';
                            const statusBg = diff > 5 ? 'bg-red-50 dark:bg-red-500/10' : diff < -5 ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10';
                            return (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{formatMoney(item.value)}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBg} ${statusColor}`}>
                                            {item.actual.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RULE 2: DEBT-TO-INCOME */}
                <div className={`rounded-3xl p-6 border shadow-sm flex flex-col ${dtiBg}`}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <CalculatorIcon size={18} className="text-purple-500" />
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
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">de tu ingreso va a deudas</p>
                        <p className="text-xs text-zinc-500 mb-3">{formatMoney(debtsPayment)}/mes en pagos</p>

                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${dtiStatus === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : dtiStatus === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                            {dtiStatus === 'healthy' ? '✓ Saludable' : dtiStatus === 'warning' ? '⚠ Precaución' : '✕ Alto endeudamiento'}
                        </div>
                    </div>
                </div>

                {/* RULE 3: EMERGENCY FUND */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <ShieldCheckIcon size={18} className="text-emerald-500" />
                            Fondo Emergencia
                        </h3>
                        <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                            META: 6 MESES
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-end gap-2 mb-1">
                            <span className="text-4xl font-black text-zinc-900 dark:text-white">{monthsCovered.toFixed(1)}</span>
                            <span className="text-sm font-bold text-zinc-400 mb-1.5">meses</span>
                        </div>

                        <div className="flex gap-1 h-10 items-end mb-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div
                                    key={i}
                                    className={`flex-1 rounded-t-lg transition-all duration-500 border-b-2 border-zinc-50 dark:border-zinc-900 ${i <= Math.ceil(monthsCovered) ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                    style={{ height: `${(i / 6) * 100}%` }}
                                />
                            ))}
                        </div>

                        <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-3">
                            <span>Gasto fijo mensual</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-200">{formatMoney(monthlyBurn)}</span>
                        </div>

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
                                                <ArrowRightIcon size={10} />
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
                                    ¡Fondo de emergencia completo!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
