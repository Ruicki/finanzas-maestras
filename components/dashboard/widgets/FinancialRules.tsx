'use client';

import React, { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/utils';
import { gastoFijoYVariableDelMes, type GastoDeRegla } from '@/lib/financial-rules';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheckIcon, TrendingUpIcon, CalculatorIcon, ArrowRightIcon, DollarSignIcon, InfoIcon } from '@animateicons/react/lucide';
import { Target, Check, X } from 'lucide-react';

type RuleExpense = GastoDeRegla;

interface FinancialRulesProps {
    income: number;
    expenses: RuleExpense[];
    /**
     * TODAS las suscripciones/gastos recurrentes del perfil, sin filtrar por
     * mes (ver BudgetsTab.tsx) — de aquí sale el gasto fijo de meses donde
     * `expenses` (solo el mes visible) aún no tiene la copia real que genera
     * el cron ese día de cobro.
     */
    recurringExpenses?: RuleExpense[];
    debtsPayment: number;
    totalSavings: number;
    totalCash: number;
}

/**
 * Reglas financieras disponibles para comparar el gasto fijo/variable del
 * mes — antes la app solo conocía 50/30/20, sin alternativa, y el usuario
 * pidió poder elegir la que mejor le vaya. Las tres reparten el 100% del
 * ingreso en las mismas tres categorías que ya calcula `tipoDeGasto`
 * (Necesidades/Deseos/Ahorro) — solo cambia el objetivo contra el que se
 * compara, nunca cómo se clasifica o suma cada gasto.
 */
interface ReglaFinanciera {
    id: string;
    nombre: string;
    descripcion: string;
    needsTarget: number;
    wantsTarget: number;
    savingsTarget: number;
}

const REGLAS_FINANCIERAS: ReglaFinanciera[] = [
    {
        id: '50-30-20',
        nombre: '50/30/20',
        descripcion: 'La más conocida: 50% Necesidades, 30% Deseos, 20% Ahorro. Un punto de partida equilibrado para la mayoría de los casos.',
        needsTarget: 50, wantsTarget: 30, savingsTarget: 20,
    },
    {
        id: '70-20-10',
        nombre: '70/20/10',
        descripcion: 'Más margen para gastos fijos altos (alquiler, deudas grandes): 70% Necesidades, 20% Deseos, 10% Ahorro.',
        needsTarget: 70, wantsTarget: 20, savingsTarget: 10,
    },
    {
        id: '60-20-20',
        nombre: '60/20/20',
        descripcion: 'Para quien quiere ahorrar más sin recortar tanto en gustos: 60% Necesidades, 20% Deseos, 20% Ahorro.',
        needsTarget: 60, wantsTarget: 20, savingsTarget: 20,
    },
];

const REGLA_GUARDADA_KEY = 'finanzas-regla-presupuesto';

/**
 * RULE 3 (Fondo de Emergencia): no depende del ingreso del mes, solo del
 * gasto fijo y del efectivo/ahorro líquido disponible — por eso se extrae a
 * su propio componente y se renderiza siempre, tenga o no el usuario un
 * ingreso registrado este mes (ver el porqué en `FinancialRules`, abajo).
 */
function FondoEmergenciaCard({ monthsCovered, monthlyBurn, monthsMissing, monthlySavingsNeeded }: {
    monthsCovered: number;
    monthlyBurn: number;
    monthsMissing: number;
    monthlySavingsNeeded: number;
}) {
    return (
        <div className="bg-surface dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
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

                {monthlyBurn === 0 ? (
                    <p className="text-xs text-zinc-400">Registra tus gastos fijos para calcular tu fondo de emergencia.</p>
                ) : monthsCovered < 6 ? (
                    <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                            <Target size={14} className="lucide-animated text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
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
                ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            ¡Fondo de emergencia completo!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FinancialRules({ income, expenses, recurringExpenses = [], debtsPayment, totalSavings, totalCash }: FinancialRulesProps) {
    const [reglaId, setReglaId] = useState(REGLAS_FINANCIERAS[0].id);

    // Preferencia solo de este navegador (no hace falta migrar la base de
    // datos para esto): se recuerda la última regla elegida. Valor solo
    // conocido en cliente, de ahí que viva en un efecto — un único setState
    // al montar, mismo patrón que color-theme-provider.tsx.
    useEffect(() => {
        try {
            const guardada = localStorage.getItem(REGLA_GUARDADA_KEY);
            // eslint-disable-next-line react-hooks/set-state-in-effect -- valor solo conocido en cliente; se resuelve una vez al montar
            if (guardada && REGLAS_FINANCIERAS.some(r => r.id === guardada)) setReglaId(guardada);
        } catch {
            // localStorage puede fallar (ventana privada, bloqueado): la UI
            // sigue funcionando con la regla por defecto.
        }
    }, []);

    const elegirRegla = (id: string) => {
        setReglaId(id);
        try { localStorage.setItem(REGLA_GUARDADA_KEY, id); } catch { /* ver arriba */ }
    };

    const regla = REGLAS_FINANCIERAS.find(r => r.id === reglaId) || REGLAS_FINANCIERAS[0];

    // Gasto fijo/variable del mes y Fondo de Emergencia: ninguno de los dos
    // depende del ingreso registrado este mes, así que se calculan siempre.
    // Antes todo esto vivía DESPUÉS de un `if (income === 0) return <placeholder>`,
    // así que el Fondo de Emergencia mostraba "0.0 meses" fijo apenas no
    // hubiera un Salary registrado ese mes — sin importar cuánto efectivo
    // real hubiera en las cuentas. Reportado por el usuario como "el fondo
    // de emergencia sigue en 0 meses" pese a tener ahorro real.
    const { needs, wants } = gastoFijoYVariableDelMes(expenses, recurringExpenses);
    const monthlyBurn = needs > 0 ? needs : (needs + wants);
    const liquidFunds = totalCash + totalSavings;
    const monthsCovered = monthlyBurn > 0 ? (liquidFunds / monthlyBurn) : 0;
    const monthsMissing = Math.max(0, 6 - monthsCovered);
    const monthlySavingsNeeded = monthsMissing > 0 && monthsCovered < 6 ? Math.ceil(monthlyBurn * monthsMissing / 6) : 0;

    const tieneIngreso = income > 0;

    if (!tieneIngreso) {
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm text-center">
                    <DollarSignIcon size={32} className="text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-200 mb-2">Sin ingresos registrados</h3>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto">
                        Registra tus ingresos en la pestaña <span className="font-bold text-zinc-600 dark:text-zinc-300">Ingresos</span> para ver el análisis de presupuesto y el puntaje financiero. El Fondo de Emergencia no necesita ingreso registrado — se calcula igual, abajo.
                    </p>
                </div>

                <FondoEmergenciaCard
                    monthsCovered={monthsCovered}
                    monthlyBurn={monthlyBurn}
                    monthsMissing={monthsMissing}
                    monthlySavingsNeeded={monthlySavingsNeeded}
                />
            </div>
        );
    }

    // --- RULE 1: regla financiera elegida (Necesidades/Deseos/Ahorro) ---
    const savings = Math.max(0, income - needs - wants);

    const needsPct = (needs / income) * 100;
    const wantsPct = (wants / income) * 100;
    const savingsPct = (savings / income) * 100;

    const needsDiff = needsPct - regla.needsTarget;
    const wantsDiff = wantsPct - regla.wantsTarget;
    const savingsDiff = savingsPct - regla.savingsTarget;

    const data503020 = [
        { name: 'Necesidades', value: needs, color: '#3b82f6', target: regla.needsTarget, actual: needsPct, diff: needsDiff },
        { name: 'Deseos', value: wants, color: '#a855f7', target: regla.wantsTarget, actual: wantsPct, diff: wantsDiff },
        { name: 'Ahorro', value: savings, color: '#10b981', target: regla.savingsTarget, actual: savingsPct, diff: savingsDiff },
    ];

    // --- RULE 2: DEBT-TO-INCOME ---
    // Pago mínimo de tarjetas (interés + seguro + % mínimo sobre el saldo,
    // ver BudgetDashboard.tsx) más la cuota mensual de préstamos, entre el
    // ingreso del mes. Umbrales estándar de la industria crediticia (DTI).
    const dtiRatio = (debtsPayment / income) * 100;
    const dtiStatus = dtiRatio <= 36 ? 'healthy' : dtiRatio <= 50 ? 'warning' : 'critical';
    const dtiColor = dtiStatus === 'healthy' ? 'text-emerald-500' : dtiStatus === 'warning' ? 'text-amber-500' : 'text-red-500';
    const dtiBg = dtiStatus === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : dtiStatus === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';

    // Health Score — mismos tres factores que antes, ahora documentados uno
    // por uno en la tarjeta (antes solo había una frase genérica).
    const needsOk = needsDiff <= 5;
    const wantsOk = wantsDiff <= 5;
    const dtiOk = dtiStatus === 'healthy';
    let score = 0;
    if (needsOk) score += 33;
    if (wantsOk) score += 33;
    if (dtiOk) score += 34;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">

            {/* EXECUTIVE SUMMARY */}
            <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
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

                {/* HEALTH SCORE — ahora con el desglose de los 3 factores, no
                    solo una frase ("el score no es entendible", pedido del
                    usuario). */}
                <div className="bg-surface dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Score Financiero</p>
                    <div className={`text-5xl font-black mb-1 ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {score}
                    </div>
                    <p className="text-xs text-zinc-400">/100</p>
                    <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${score >= 80 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : score >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {score >= 80 ? '✓ Excelente' : score >= 50 ? '⚠ Regular' : '✕ Necesita mejorar'}
                    </div>

                    <div className="w-full mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-left">
                        {[
                            { ok: needsOk, label: `Necesidades dentro del objetivo (${regla.needsTarget}% + 5)` },
                            { ok: wantsOk, label: `Deseos dentro del objetivo (${regla.wantsTarget}% + 5)` },
                            { ok: dtiOk, label: 'Deudas en nivel saludable (≤36% del ingreso)' },
                        ].map((factor) => (
                            <div key={factor.label} className="flex items-start gap-2">
                                {factor.ok
                                    ? <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                    : <X size={14} className="text-red-400 mt-0.5 shrink-0" />}
                                <span className={`text-[11px] leading-tight ${factor.ok ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-600 dark:text-zinc-300 font-medium'}`}>
                                    {factor.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RULE 1: regla financiera elegida — BIGGER CHART, con selector */}
                <div className="bg-surface dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <TrendingUpIcon size={18} className="text-blue-500" />
                            Regla {regla.nombre}
                        </h3>
                    </div>

                    <div className="flex gap-1.5 mb-3">
                        {REGLAS_FINANCIERAS.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => elegirRegla(r.id)}
                                className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${r.id === regla.id ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                            >
                                {r.nombre}
                            </button>
                        ))}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                        {regla.descripcion}
                    </p>

                    <div className="h-52 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart className="lucide-animated">
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
                                    formatter={(value?: number) => formatMoney(value ?? 0)}
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
                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.name} <span className="text-zinc-400">({item.target}%)</span></span>
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

                {/* RULE 2: DEBT-TO-INCOME — con explicación de dónde sale el % */}
                <div className={`rounded-3xl p-6 border shadow-sm flex flex-col ${dtiBg}`}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <CalculatorIcon size={18} className="text-purple-500" />
                            Endeudamiento
                            <span title="Pago mínimo de tus tarjetas (interés + seguro + % mínimo sobre el saldo) más la cuota mensual de tus préstamos, dividido entre tu ingreso del mes.">
                                <InfoIcon size={13} className="text-zinc-400 cursor-help" />
                            </span>
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
                        <p className="text-xs text-zinc-500 mb-1">{formatMoney(debtsPayment)}/mes en pagos</p>
                        <p className="text-[10px] text-zinc-400 mb-3 max-w-[200px]">Pagos mínimos de tarjetas + cuotas de préstamos ÷ ingreso del mes</p>

                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${dtiStatus === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : dtiStatus === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                            {dtiStatus === 'healthy' ? '✓ Saludable' : dtiStatus === 'warning' ? '⚠ Precaución' : '✕ Alto endeudamiento'}
                        </div>
                    </div>
                </div>

                {/* RULE 3: EMERGENCY FUND */}
                <FondoEmergenciaCard
                    monthsCovered={monthsCovered}
                    monthlyBurn={monthlyBurn}
                    monthsMissing={monthsMissing}
                    monthlySavingsNeeded={monthlySavingsNeeded}
                />
            </div>
        </div>
    );
}
