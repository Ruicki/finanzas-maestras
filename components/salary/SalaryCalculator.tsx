'use client';

import { useState, ChangeEvent } from 'react';
import { createSalary } from '@/app/actions/salary';
import { Account } from '@prisma/client';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

interface FormData {
    grossVal: number;
    bonus: number;
    company: string;
}

interface SalaryCalculatorProps {
    onSave?: () => void;
    profileId?: number;
    accounts?: Account[];
    isEmbedded?: boolean;
}

export default function SalaryCalculator({ onSave, profileId, accounts, isEmbedded }: SalaryCalculatorProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [frequency, setFrequency] = useState<'monthly' | 'biweekly'>('monthly');

    const [form, setForm] = useState<FormData & { absentDays: number, paymentDate: string, accountId: string }>({
        grossVal: 0,
        bonus: 0,
        company: '',
        absentDays: 0,
        paymentDate: new Date().toISOString().split('T')[0], // Por defecto hoy
        accountId: ''
    });

    const [result, setResult] = useState<{
        gross: number;
        socialSec: number;
        eduIns: number;
        incomeTax: number;
        net: number;
        decimo: number; // Estimado Neto
        decimoGross: number; // Estimado Bruto
        bonus: number;
        isDecimoIncluded?: boolean;
    } | null>(null);




    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: name === 'company' || name === 'paymentDate' || name === 'accountId' ? value : (parseFloat(value) || 0)
        }));
    };

    const handleCalculate = async () => {
        if (form.grossVal <= 0 && form.bonus <= 0) {
            toast.warning("Por favor ingresa un salario o un bono para calcular.");
            return;
        }

        setLoading(true);

        try {
            const response = await createSalary({
                grossVal: form.grossVal,
                bonus: form.bonus,
                company: form.company,
                frequency: frequency,
                absentDays: form.absentDays,
                paymentDate: form.paymentDate,
                profileId: profileId,
                accountId: form.accountId ? parseInt(form.accountId) : undefined
            });

            if (onSave) onSave();

            setResult({
                gross: response.grossVal,
                socialSec: response.socialSec,
                eduIns: response.eduIns,
                incomeTax: response.incomeTax,
                net: response.netVal,
                decimo: response._uiResult.decimoNet,
                decimoGross: response._uiResult.decimoGross,
                bonus: response.bonus,
                isDecimoIncluded: response._uiResult.isDecimoIncluded
            });

            const selectedMonth = parseInt(form.paymentDate.split('-')[1]);
            const successMsg = response._uiResult.isDecimoIncluded
                ? `¡Cálculo guardado! (Incluye Décimo por ser mes ${selectedMonth} 🎁)`
                : '¡Salario guardado correctamente!';

            toast.success(successMsg);
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error('Hubo un error al guardar el cálculo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white dark:bg-zinc-900/80 backdrop-blur-xl p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700/50 w-full relative overflow-hidden transition-all duration-500 ${isEmbedded ? 'shadow-none border-0 p-0! bg-transparent!' : ''}`}>
            {!isEmbedded && <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500"></div>}

            {!isEmbedded && <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center text-zinc-900 dark:text-white tracking-tight">
                Calculador de Salario
            </h2>}

            <div className="flex justify-center mb-4 md:mb-6 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                <button
                    onClick={() => setFrequency('monthly')}
                    className={`flex-1 px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-bold transition-all ${frequency === 'monthly' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                    Mensual
                </button>
                <button
                    onClick={() => setFrequency('biweekly')}
                    className={`flex-1 px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-bold transition-all ${frequency === 'biweekly' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                    Quincenal
                </button>
            </div>

            <div className="space-y-6">
                {/* ENTRADA EMPRESA */}
                <div className="relative group/input">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400 group-hover/input:text-cyan-500 transition-colors">
                        Empresa o Entidad
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-semibold text-lg">🏢</span>
                        <input
                            type="text"
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-lg text-zinc-900 dark:text-gray-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                            placeholder="Nombre de la empresa o entidad"
                        />
                    </div>
                </div>

                {/* ENTRADA SALARIO */}
                <div className="relative group/input">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400 group-hover/input:text-cyan-500 transition-colors">
                        Salario {frequency === 'monthly' ? 'Mensual' : 'Quincenal'}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-semibold text-lg">$</span>
                        <input
                            type="number"
                            name="grossVal"
                            value={form.grossVal || ''}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-lg text-zinc-900 dark:text-gray-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* ENTRADA BONOS */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative group/input flex-1">
                        <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400 group-hover/input:text-cyan-500 transition-colors">
                            Bonos / Extras
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-semibold text-lg">$</span>
                            <input
                                type="number"
                                name="bonus"
                                value={form.bonus || ''}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all outline-none font-medium text-lg text-zinc-900 dark:text-gray-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* ENTRADA DÍAS FALTADOS */}
                    <div className="relative group/input flex-1">
                        <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400 group-hover/input:text-red-400 transition-colors">
                            Días Faltados
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-semibold text-lg">📅</span>
                            <input
                                type="number"
                                name="absentDays"
                                value={form.absentDays || ''}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none font-medium text-lg text-zinc-900 dark:text-gray-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {/* ENTRADA FECHA DE PAGO */}
                <div className="relative group/input">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400 group-hover/input:text-cyan-500 transition-colors">
                        Fecha de Pago
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-semibold text-lg">🗓️</span>
                        <input
                            type="date"
                            name="paymentDate"
                            value={form.paymentDate}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-lg text-zinc-900 dark:text-gray-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                        />
                    </div>
                </div>

                <div className="relative group/input">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400 group-hover/input:text-cyan-500 transition-colors">
                        Cuenta de Depósito (Opcional)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-semibold text-lg">🏦</span>
                        <select
                            name="accountId"
                            value={form.accountId}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-lg text-zinc-900 dark:text-gray-100"
                        >
                            <option value="">-- No vincular a cuenta --</option>
                            {accounts?.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} (${Number(acc.balance)})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* BOTÓN CON ESTADO DE CARGA */}
                <button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full py-3 mt-6 bg-linear-to-r from-red-600 via-orange-600 to-yellow-300 hover:from-red-600 hover:via-orange-400 hover:to-yellow-200 text-white font-bold text-sm rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:grayscale shadow-md ring-1"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Calculando...
                        </span>
                    ) : 'Calcular Deducciones'}
                </button>

                {/* RESULTADO */}
                {result && (
                    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {/* Tarjeta de Desglose */}
                        <div className="bg-zinc-100 dark:bg-black/20 p-6 rounded-2xl border border-zinc-200 dark:border-white/10 text-base space-y-3">
                            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                                <span>Salario Bruto</span>
                                <span className="font-mono">${result.gross.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                                <span>Bonos</span>
                                <span className="font-mono">${result.bonus.toFixed(2)}</span>
                            </div>

                            {/* NUEVO: DÉCIMO INTEGRADO EN LISTA */}
                            {result.isDecimoIncluded && (
                                <div className="flex justify-between text-yellow-500 font-bold bg-yellow-500/10 p-2 rounded-lg -mx-2">
                                    <span className="flex items-center gap-2">🎁 Décimo Tercer Mes</span>
                                    <span className="font-mono">${result.decimoGross.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="h-px bg-zinc-200 dark:bg-white/10 my-3"></div>

                            <div className="flex justify-between text-red-500 dark:text-red-300">
                                <span>Seguro Social (9.75%)</span>
                                <span className="font-mono">-${result.socialSec.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-500 dark:text-red-300">
                                <span>Seguro Educativo (1.25%)</span>
                                <span className="font-mono">-${result.eduIns.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-600 dark:text-red-400 font-bold">
                                <span>Impuesto S/R (ISR)</span>
                                <span className="font-mono">-${result.incomeTax.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Tarjeta Principal de Salario Neto */}
                        <div className="p-8 bg-emerald-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl text-center relative overflow-hidden">
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-bold uppercase tracking-widest mb-2">
                                Disponible en Mano
                            </p>
                            <p className="text-4xl md:text-6xl font-black text-orange-600 dark:text-orange-400 tracking-tighter">
                                ${result.net.toFixed(2)}
                            </p>

                            {result.isDecimoIncluded && (
                                <p className="text-xs text-orange-500/80 mt-2 font-medium">
                                    * Incluye pago de décimo y sus deducciones
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
