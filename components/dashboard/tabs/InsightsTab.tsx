
"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { ArrowUp, ArrowDown, Target, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, PieChart } from 'lucide-react';
import { ProfileWithData } from '@/types';

type Expense = ProfileWithData['expenses'][number];
type Category = ProfileWithData['categories'][number];
type AdditionalIncome = ProfileWithData['incomes'][number];
type Salary = ProfileWithData['salaries'][number];
import { CategoryIcon } from '@/components/shared/CategoryIcon';

// Tipos auxiliares
type InsightsTabProps = {
    expenses: Expense[];
    categories: Category[];
    incomes: AdditionalIncome[];
    salaries: Salary[];
    currency?: string;
};

export default function InsightsTab({ expenses, categories, incomes, salaries, currency = "$" }: InsightsTabProps) {

    // --- 1. PROCESAMIENTO DE DATOS ---
    const {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        monthlyData,
        budgetComparison,
        topCategories
    } = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // A. Totales
        const salaryTotal = salaries.reduce((acc, s) => acc + s.netVal, 0);
        const incomeTotal = incomes.reduce((acc, i) => acc + i.amount, 0);
        const totalIncome = salaryTotal + incomeTotal;

        const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);
        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        // B. Datos de Gráfico (Acumulación Diaria)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const chartData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayExpenses = expenses
                .filter(e => {
                    const d = new Date(e.createdAt || new Date());
                    return d.getDate() === day;
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
            const catExpenses = expenses.filter(e => e.categoryId === cat.id).reduce((acc, e) => acc + e.amount, 0);
            const limit = cat.monthlyLimit || 0;
            const diff = limit - catExpenses;
            const percent = limit > 0 ? (catExpenses / limit) * 100 : 0;

            return {
                ...cat,
                spent: catExpenses,
                remaining: diff,
                percent,
                status: percent > 100 ? 'EXCEEDED' : percent > 85 ? 'WARNING' : 'GOOD'
            };
        }).sort((a, b) => b.percent - a.percent);

        // D. Categorías Principales para "Insights Rápidos"
        const topCategories = [...budgetComparison].sort((a, b) => b.spent - a.spent).slice(0, 3);

        return {
            totalIncome,
            totalExpense,
            netSavings,
            savingsRate,
            monthlyData: cumulativeData,
            budgetComparison,
            topCategories
        };
    }, [expenses, categories, incomes, salaries]);


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 pt-6">

            {/* --- 1. SECCIÓN DE GRÁFICO HERO --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* A. Gráfico de Flujo (Grande) */}
                <div className="lg:col-span-2 relative h-80 w-full bg-linear-to-b from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 group">
                    <div className="absolute top-6 left-8 z-10">
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                            <TrendingUp size={14} className="text-zinc-400 dark:text-zinc-600" />
                            Evolución de Gasto Mensual
                        </p>
                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                            {currency}{totalExpense.toLocaleString()}
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
                                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl shadow-xl">
                                                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1 font-bold uppercase">Día {data.day}</p>
                                                    <p className="text-indigo-500 dark:text-indigo-400 text-xl font-black">{currency}{data.cumulative.toLocaleString()}</p>
                                                    <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Gasto del día: +{currency}{data.expense.toLocaleString()}</p>
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

                {/* B. Tarjeta de Resumen Mensual (Pequeña) */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Wallet className="w-32 h-32" />
                    </div>

                    <div>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider mb-2">Balance Neto</p>
                        <h3 className={`text-4xl md:text-5xl font-black ${netSavings >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
                            {netSavings >= 0 ? '+' : '-'}{currency}{Math.abs(netSavings).toLocaleString()}
                        </h3>
                        <p className="text-zinc-400 mt-2 font-medium">
                            {netSavings >= 0 ? "Estás ahorrando dinero este mes." : "Has gastado más de lo que ingresaste."}
                        </p>
                    </div>

                    <div className="mt-8">
                        <div className="flex justify-between text-sm mb-2 font-bold text-zinc-500">
                            <span>Tasa de Ahorro</span>
                            <span>{savingsRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${savingsRate > 20 ? 'bg-emerald-500' : savingsRate > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.max(0, Math.min(savingsRate, 100))}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>


            {/* --- 2. TABLA DE PRESUPUESTO AVANZADA --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-none overflow-hidden hover:shadow-2xl transition-shadow duration-500">
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div>
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <PieChart size={24} />
                            </div>
                            Desglose de Presupuestos
                        </h3>
                        <p className="text-zinc-500 text-sm mt-1 ml-1">Análisis detallado de ejecución presupuestaria.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-400 bg-zinc-50/80 dark:bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
                                <th className="p-6 font-bold text-zinc-500">Categoría</th>
                                <th className="p-6 font-bold text-zinc-500 text-right">Gastado</th>
                                <th className="p-6 font-bold text-zinc-500 text-right hidden md:table-cell">Límite Mensual</th>
                                <th className="p-6 font-bold text-zinc-500 text-right">Disponible</th>
                                <th className="p-6 font-bold text-zinc-500 w-1/3 min-w-[200px]">Ejecución</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {budgetComparison.map((cat) => (
                                <tr key={cat.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors duration-200">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full group-hover:scale-110 shadow-sm transition-all duration-300 ${cat.color || 'text-zinc-500'} ${cat.color?.includes('text-') ? cat.color.replace('text-', 'bg-').replace('500', '100') + ' dark:bg-opacity-10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                                <CategoryIcon iconName={cat.icon} size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cat.name}</p>
                                                {cat.status === 'EXCEEDED' && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider">
                                                        <AlertTriangle size={8} /> Excedido
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <p className="font-bold text-zinc-900 dark:text-zinc-200 tabular-nums text-lg">{currency}{cat.spent.toLocaleString()}</p>
                                    </td>
                                    <td className="p-6 text-right hidden md:table-cell">
                                        <p className="font-medium text-zinc-400 tabular-nums text-sm">
                                            {cat.monthlyLimit ? `${currency}${cat.monthlyLimit.toLocaleString()}` : 'Sin Límite'}
                                        </p>
                                    </td>
                                    <td className="p-6 text-right">
                                        <p className={`font-black tabular-nums text-lg ${cat.remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {cat.remaining < 0 ? '-' : '+'}{currency}{Math.abs(cat.remaining).toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden relative shadow-inner">
                                                {/* Superposición de patrón rayado para excedidos */}
                                                {cat.percent > 100 && (
                                                    <div className="absolute inset-0 z-10 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#000_5px,#000_10px)]" />
                                                )}
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${cat.status === 'EXCEEDED' ? 'bg-red-500' : cat.status === 'WARNING' ? 'bg-amber-400' : 'bg-linear-to-r from-emerald-400 to-emerald-500'}`}
                                                    style={{ width: `${Math.min(cat.percent, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-bold w-12 text-right ${cat.status === 'EXCEEDED' ? 'text-red-500' : 'text-zinc-400'}`}>
                                                {cat.percent.toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {budgetComparison.length === 0 && (
                    <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-full mb-4">
                            <PieChart className="w-12 h-12 opacity-20" />
                        </div>
                        <p className="text-lg font-bold text-zinc-600 dark:text-zinc-300">No hay datos suficientes</p>
                        <p className="text-sm mt-1">Registra gastos para ver el análisis detallado.</p>
                    </div>
                )}
            </div>

            {/* --- 3. RESUMEN DE GASTOS PRINCIPALES --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topCategories.map((cat, idx) => (
                    <div key={cat.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl flex items-center gap-4">
                        <div className={`text-3xl p-3 rounded-2xl shadow-sm ${cat.color || 'text-zinc-500'} ${cat.color?.includes('text-') ? cat.color.replace('text-', 'bg-').replace('500', '100') + ' dark:bg-opacity-10' : 'bg-white dark:bg-zinc-800'}`}>
                            <CategoryIcon iconName={cat.icon} size={32} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Top {idx + 1} Gasto</p>
                            <h4 className="font-bold text-zinc-900 dark:text-white truncate lg:max-w-[120px]">{cat.name}</h4>
                            <p className="text-indigo-500 font-bold">{currency}{cat.spent.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
