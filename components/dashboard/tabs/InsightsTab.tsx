
"use client";

import { useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUpIcon, WalletIcon, InfoIcon } from '@animateicons/react/lucide';
import { ListIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ProfileWithData } from '@/types';
import { nombreCategoria, esDeCategoria } from '@/lib/expense-category';
import { formatMoney } from '@/lib/utils';
import { topGastosIndividuales, tendenciaDeGasto } from '@/lib/expense-insights';
import { CategoryIcon } from '@/components/shared/CategoryIcon';

type Expense = ProfileWithData['expenses'][number];
type Category = ProfileWithData['categories'][number];
type AdditionalIncome = ProfileWithData['incomes'][number];
type Salary = ProfileWithData['salaries'][number];
type Account = ProfileWithData['accounts'][number];
type CreditCard = ProfileWithData['creditCards'][number];

// Tipos auxiliares
type InsightsTabProps = {
    expenses: Expense[];
    allExpenses?: Expense[];
    categories: Category[];
    incomes: AdditionalIncome[];
    salaries: Salary[];
    accounts?: Account[];
    creditCards?: CreditCard[];
    selectedMonth?: number;
    selectedYear?: number;
};

export default function InsightsTab({ expenses, allExpenses = [], categories, incomes, salaries, accounts = [], creditCards = [], selectedMonth, selectedYear }: InsightsTabProps) {
    // Categoría top seleccionada, para ver qué gastos individuales la
    // componen sin salir de Análisis. El desglose vive aquí (en las
    // categorías con más gasto) y no en la lista de gastos individuales de
    // abajo — ahí cada fila ya muestra todo lo que tiene, no hay nada más
    // que desglosar.
    const [categoriaExpandidaId, setCategoriaExpandidaId] = useState<number | null>(null);

    // --- 1. PROCESAMIENTO DE DATOS ---
    const {
        totalIncome,
        salaryTotal,
        incomeTotal,
        totalExpense,
        topGastosTotal,
        monthlyData,
        topCategories,
        topGastos,
        tendencia,
        realExpenses,
    } = useMemo(() => {
        const currentMonth = selectedMonth ?? new Date().getMonth();
        const currentYear = selectedYear ?? new Date().getFullYear();

        // A. Totales
        const salaryTotal = salaries.reduce((acc, s) => acc + s.netVal, 0);
        const incomeTotal = incomes.reduce((acc, i) => acc + i.amount, 0);
        const totalIncome = salaryTotal + incomeTotal;

        // Los gastos proyectados aún no descuentan saldo real: no cuentan como
        // "gastado" en ninguno de estos cálculos.
        const realExpenses = expenses.filter(e => !e.isProjected);
        const totalExpense = realExpenses.reduce((acc, e) => acc + e.amount, 0);

        // B. Datos de Gráfico (Acumulación Diaria)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const chartData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayExpenses = realExpenses
                .filter(e => {
                    const d = new Date(e.createdAt || new Date());
                    return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .reduce((acc, e) => acc + e.amount, 0);

            return { day, expense: dayExpenses };
        });

        let accumulatedExpense = 0;
        const cumulativeData = chartData.map(d => {
            accumulatedExpense += d.expense;
            return { ...d, cumulative: accumulatedExpense };
        });

        // C. Comparación de Presupuesto
        const budgetComparison = categories.map(cat => {
            const catExpenses = realExpenses.filter(e => e.categoryId === cat.id).reduce((acc, e) => acc + e.amount, 0);
            const mb = cat.budgets?.find((b) => b.year === currentYear && b.month === currentMonth + 1);
            const limit = mb ? Number(mb.limit) : Number(cat.monthlyLimit || 0);

            // Calculate rollover from previous month — solo si la categoría tiene
            // el toggle isRollover activado (misma regla que en Presupuesto).
            let prevM = currentMonth;
            let prevY = currentYear;
            prevM -= 1;
            if (prevM < 0) { prevM = 11; prevY -= 1; }
            const prevMb = cat.budgets?.find((b) => b.year === prevY && b.month === prevM + 1);
            const prevLimit = prevMb ? Number(prevMb.limit) : Number(cat.monthlyLimit || 0);
            const prevSpent = allExpenses
                // Una plantilla recurrente (isRecurring) no mueve dinero al
                // crearse — ver createExpense —, así que tampoco cuenta como
                // gasto real del mes anterior; solo la copia real de su ciclo.
                .filter(e => e.categoryId === cat.id && !e.isProjected && !e.isRecurring)
                .filter(e => { const d = new Date(e.createdAt); return d.getMonth() === prevM && d.getFullYear() === prevY; })
                .reduce((sum, e) => sum + Number(e.amount), 0);
            const rollover = cat.isRollover && prevLimit > 0 ? Math.max(0, prevLimit - prevSpent) : 0;

            const effectiveLimit = limit + rollover;
            const diff = effectiveLimit - catExpenses;
            const percent = effectiveLimit > 0 ? (catExpenses / effectiveLimit) * 100 : 0;

            return {
                ...cat,
                spent: catExpenses,
                effectiveLimit,
                remaining: diff,
                percent,
                status: percent > 100 ? 'EXCEEDED' : percent > 85 ? 'WARNING' : 'GOOD'
            };
        }).sort((a, b) => b.percent - a.percent);

        // D. Categorías Principales para "Insights Rápidos" — solo las que
        // realmente tuvieron gasto este mes (si no, con &lt;3 categorías activas
        // se mostraban tarjetas de categorías con $0 gastado).
        const topCategories = [...budgetComparison]
            .filter(c => c.spent > 0)
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 3);

        // E. Gastos individuales más altos y tendencia de 6 meses — lo que
        // reemplaza al "Desglose de Presupuestos", que repetía categoría por
        // categoría lo que ya muestra Presupuesto → Categorías.
        const topGastos = topGastosIndividuales(realExpenses, 8);
        const topGastosTotal = topGastos.reduce((suma, g) => suma + Number(g.amount), 0);
        const tendencia = tendenciaDeGasto(allExpenses, currentMonth, currentYear, 6);

        return {
            totalIncome,
            salaryTotal,
            incomeTotal,
            totalExpense,
            topGastosTotal,
            monthlyData: cumulativeData,
            topCategories,
            topGastos,
            tendencia,
            realExpenses,
        };
    }, [expenses, allExpenses, categories, incomes, salaries, selectedMonth, selectedYear]);


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 pt-6">

            {/* --- 1. SECCIÓN DE GRÁFICO HERO --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* A. Gráfico de Flujo (Grande) */}
                <div className="lg:col-span-2 relative h-80 w-full bg-linear-to-b from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 group">
                    <div className="absolute top-6 left-8 z-10">
                        {/* div y no p: los iconos de @animateicons envuelven el svg en un
                            div, y un div dentro de un p es HTML inválido — rompía la hidratación. */}
                        <div className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                            <TrendingUpIcon size={14} className="text-zinc-400 dark:text-zinc-600" />
                            Evolución de Gasto Mensual
                        </div>
                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                            {formatMoney(totalExpense)}
                            <span className="text-sm font-medium text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg">Acumulado</span>
                        </h3>
                    </div>

                    <div className="absolute inset-0 pt-24 pb-4 px-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:stroke-[#333]" vertical={false} />
                                <Tooltip
                                    cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl shadow-xl">
                                                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1 font-bold uppercase">Día {data.day}</p>
                                                    <p className="text-indigo-500 dark:text-indigo-400 text-xl font-black">{formatMoney(data.cumulative)}</p>
                                                    <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Gasto del día: +{formatMoney(data.expense)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorFlow)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* B. Ingresos vs. Gastos Grandes — reemplaza al confuso "Balance
                    Neto" (ingresos menos TODO lo gastado, sin decir de dónde sale
                    ni contra qué se compara). Esto sí dice algo que no está en
                    ningún otro lado: si lo que entra (desglosado por fuente)
                    alcanza para cubrir los movimientos más grandes de la lista de
                    abajo. */}
                {(() => {
                    const margen = totalIncome - topGastosTotal;
                    const coberturaPct = totalIncome > 0 ? (topGastosTotal / totalIncome) * 100 : 0;
                    return (
                        <div className="bg-surface dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <WalletIcon className="w-32 h-32" />
                            </div>

                            <div>
                                {/* div y no p: el icono de @animateicons envuelve el svg en un
                                    div, y un div dentro de un p es HTML inválido — rompe la hidratación. */}
                                <div className="text-sm text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    Ingresos vs. Gastos Grandes
                                    <span title="Compara todo lo que entró este mes (salario + otros ingresos) contra la suma de tus gastos más grandes (la lista de abajo) — no contra todo lo gastado.">
                                        <InfoIcon size={13} className="text-zinc-400 cursor-help" />
                                    </span>
                                </div>
                                <h3 className={`text-4xl md:text-5xl font-black ${margen >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
                                    {margen >= 0 ? '+' : '-'}{formatMoney(Math.abs(margen))}
                                </h3>
                                <p className="text-zinc-400 mt-2 font-medium">
                                    {totalIncome === 0
                                        ? "Registra tus ingresos del mes para comparar."
                                        : margen >= 0
                                            ? "Tus ingresos cubren tus gastos más grandes, con esto de sobra."
                                            : "Tus gastos más grandes superan lo que ingresó este mes."}
                                </p>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 font-medium">Salario</span>
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{formatMoney(salaryTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 font-medium">Otros ingresos</span>
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{formatMoney(incomeTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 font-medium">Tus {topGastos.length} gastos más grandes</span>
                                    <span className="font-bold text-red-500 tabular-nums">-{formatMoney(topGastosTotal)}</span>
                                </div>

                                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${coberturaPct <= 70 ? 'bg-emerald-500' : coberturaPct <= 100 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.max(0, Math.min(coberturaPct, 100))}%` }}
                                    />
                                </div>
                                <p className="text-xs text-zinc-400">
                                    Tus gastos más grandes consumen el {Math.min(coberturaPct, 999).toFixed(0)}% de tus ingresos del mes.
                                </p>
                            </div>
                        </div>
                    );
                })()}
            </div>


            {/* --- 2. GASTOS MÁS ALTOS + TENDENCIA DE 3 MESES --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* A. Gastos individuales más altos del mes */}
                <div className="lg:col-span-2 bg-surface dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-none overflow-hidden hover:shadow-2xl transition-shadow duration-500">
                    <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <ListIcon className="lucide-animated" size={24} />
                            </div>
                            Gastos Más Altos del Mes
                        </h3>
                        <p className="text-zinc-500 text-sm mt-1 ml-1">Tus movimientos individuales más grandes, uno por uno.</p>
                    </div>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {topGastos.map((gasto, idx) => {
                            const cuentaOTarjeta = gasto.linkedCardId
                                ? creditCards.find(c => c.id === gasto.linkedCardId)?.name || 'Tarjeta'
                                : accounts.find(a => a.id === gasto.accountId)?.name || 'Efectivo/Otro';

                            // Cada fila ya es un gasto individual: no hay nada más que
                            // "desglosar" dentro de uno, así que no es clickeable — el
                            // desglose real (qué gastos componen un total) vive en las
                            // tarjetas de Top Categoría, más abajo.
                            return (
                                <div key={gasto.id} className="w-full flex items-center gap-4 p-6">
                                    <span className="text-sm font-black text-zinc-300 dark:text-zinc-700 w-5 text-center shrink-0">{idx + 1}</span>
                                    <div className={`text-xl w-10 h-10 flex items-center justify-center rounded-full shrink-0 shadow-sm ${gasto.categoryRel?.color || 'text-zinc-500'} ${gasto.categoryRel?.color?.includes('text-') ? gasto.categoryRel.color.replace('text-', 'bg-').replace('500', '100') + ' dark:bg-opacity-10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                        <CategoryIcon iconName={gasto.categoryRel?.icon || 'HelpCircle'} size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-zinc-900 dark:text-white truncate">{gasto.name}</p>
                                        <p className="text-xs text-zinc-400 truncate">
                                            {nombreCategoria(gasto)} · {new Date(gasto.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {cuentaOTarjeta}
                                        </p>
                                    </div>
                                    <p className="font-black text-zinc-900 dark:text-white tabular-nums shrink-0">{formatMoney(gasto.amount)}</p>
                                </div>
                            );
                        })}

                        {topGastos.length === 0 && (
                            <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center min-h-[200px]">
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-full mb-4">
                                    <ListIcon className="w-12 h-12 opacity-20 lucide-animated" />
                                </div>
                                <p className="text-lg font-bold text-zinc-600 dark:text-zinc-300">Sin gastos este mes</p>
                                <p className="text-sm mt-1">Registra un gasto para verlo aquí.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* B. Tendencia de 3 meses */}
                <div className="bg-surface dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 flex flex-col">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                        <TrendingUpIcon size={18} className="text-indigo-500" />
                        Tendencia de 6 Meses
                    </h3>
                    <p className="text-zinc-500 text-sm mb-6">Gasto real total, mes a mes.</p>

                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tendencia} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                                <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#a1a1aa' }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                                    formatter={(value?: number) => [formatMoney(value ?? 0), 'Gastado']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#6366f1" maxBarSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                        {tendencia.map(mes => (
                            <div key={mes.clave} className="flex justify-between text-sm">
                                <span className="font-bold text-zinc-500">{mes.etiqueta}</span>
                                <span className="font-black text-zinc-900 dark:text-white tabular-nums">{formatMoney(mes.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- 3. TOP CATEGORÍAS --- el desglose real: qué gastos componen
                cada una de las categorías con más gasto este mes. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {topCategories.map((cat, idx) => {
                    const expandida = categoriaExpandidaId === cat.id;
                    const gastosDeLaCategoria = realExpenses
                        .filter((e) => esDeCategoria(e, cat))
                        .sort((a, b) => Number(b.amount) - Number(a.amount));

                    return (
                        <div key={cat.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setCategoriaExpandidaId(expandida ? null : cat.id)}
                                aria-expanded={expandida}
                                className="w-full flex items-center gap-4 p-6 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                            >
                                <div className={`text-3xl p-3 rounded-2xl shadow-sm shrink-0 ${cat.color || 'text-zinc-500'} ${cat.color?.includes('text-') ? cat.color.replace('text-', 'bg-').replace('500', '100') + ' dark:bg-opacity-10' : 'bg-surface dark:bg-zinc-800'}`}>
                                    <CategoryIcon iconName={cat.icon} size={32} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Top {idx + 1} Categoría</p>
                                    <h4 className="font-bold text-zinc-900 dark:text-white truncate">{cat.name}</h4>
                                    <p className="text-indigo-500 font-bold">{formatMoney(cat.spent)}</p>
                                </div>
                                <span className="text-zinc-400 dark:text-zinc-500 shrink-0">
                                    {expandida ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </span>
                            </button>

                            {expandida && (
                                <div className="px-6 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 mb-3" />
                                    {gastosDeLaCategoria.length === 0 ? (
                                        <p className="text-xs text-zinc-400">Sin gastos individuales este mes en esta categoría.</p>
                                    ) : gastosDeLaCategoria.map((g) => (
                                        <div key={g.id} className="flex justify-between items-center gap-3 text-sm">
                                            <div className="min-w-0">
                                                <p className="font-medium text-zinc-700 dark:text-zinc-200 truncate">{g.name}</p>
                                                <p className="text-[11px] text-zinc-400">
                                                    {new Date(g.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white tabular-nums shrink-0">{formatMoney(g.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
