'use client';

import { useState, useEffect } from 'react';
import { BANK_PRESETS, BANK_OPTIONS } from '@/lib/credit-card-presets';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

interface CreditCardWizardProps {
    profileId: number;
    onClose: () => void;
    onSuccess: () => void;
    onCreate: (data: any) => Promise<any>;
}

export default function CreditCardWizard({ profileId, onClose, onSuccess, onCreate }: CreditCardWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1
    const [bank, setBank] = useState('');
    const [name, setName] = useState('');

    // Step 2
    const [limit, setLimit] = useState('');
    const [balance, setBalance] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [cutoffDay, setCutoffDay] = useState('');
    const [paymentDay, setPaymentDay] = useState('');
    const [hasAnnualFee, setHasAnnualFee] = useState(false);
    const [annualFee, setAnnualFee] = useState('');
    const [annualFeeMonth, setAnnualFeeMonth] = useState('');

    useScrollLock(true);

    // Auto-fill when bank is selected
    useEffect(() => {
        if (bank && BANK_PRESETS[bank]) {
            const preset = BANK_PRESETS[bank];
            setInterestRate(preset.interestRate.toString());
            setAnnualFee(preset.annualFee.toString());
            setHasAnnualFee(preset.annualFee > 0);
        }
    }, [bank]);

    const getPreset = () => bank ? BANK_PRESETS[bank] : null;

    const getDisplayName = () => {
        if (name.trim()) return name.trim();
        if (bank && BANK_PRESETS[bank]) return BANK_PRESETS[bank].label;
        return 'Mi Tarjeta';
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            await onCreate({
                name: getDisplayName(),
                limit: parseFloat(limit) || 0,
                balance: parseFloat(balance) || 0,
                interestRate: parseFloat(interestRate) || 0,
                insuranceRate: getPreset()?.insuranceRate || 0.25,
                cutoffDay: parseInt(cutoffDay) || 1,
                paymentDay: parseInt(paymentDay) || 1,
                annualFee: hasAnnualFee ? (parseFloat(annualFee) || 0) : 0,
                annualFeeMonth: hasAnnualFee ? (parseInt(annualFeeMonth) || null) : null,
                bank: bank || null,
                profileId,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Bank and Name
    if (step === 1) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-zinc-900 dark:text-white">Nueva Tarjeta de Crédito</h2>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Bank select */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Banco emisor</label>
                            <select
                                value={bank}
                                onChange={(e) => setBank(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                            >
                                <option value="">Seleccionar banco...</option>
                                {BANK_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Nombre (opcional)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={bank ? BANK_PRESETS[bank]?.label : 'Mi Tarjeta'}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500 placeholder:text-zinc-400"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Si lo dejas vacío, usaremos el nombre del banco</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-2">
                        <button
                            onClick={() => setStep(2)}
                            disabled={!bank}
                            className="w-full py-4 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Details
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep(1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-zinc-400" />
                        </button>
                        <div>
                            <h2 className="font-bold text-lg text-zinc-900 dark:text-white">{getDisplayName()}</h2>
                            <p className="text-xs text-zinc-500">{bank && BANK_PRESETS[bank]?.label}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Montos */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Límite de crédito</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                            <input
                                type="number"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Saldo actual</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                            <input
                                type="number"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Si es nueva, déjalo en 0</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Tasa de interés mensual</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full pl-4 pr-8 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">En tu estado: &quot;Tasa de interés nominal mensual&quot;</p>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Día de corte</label>
                            <input
                                type="number"
                                value={cutoffDay}
                                onChange={(e) => setCutoffDay(e.target.value)}
                                placeholder="22"
                                min="1"
                                max="31"
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Día límite de pago</label>
                            <input
                                type="number"
                                value={paymentDay}
                                onChange={(e) => setPaymentDay(e.target.value)}
                                placeholder="18"
                                min="1"
                                max="31"
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                            />
                        </div>
                    </div>

                    {/* Membresía */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">¿Cobra membresía anual?</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setHasAnnualFee(false)}
                                className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                                    !hasAnnualFee
                                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                                }`}
                            >
                                No cobra
                            </button>
                            <button
                                onClick={() => setHasAnnualFee(true)}
                                className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                                    hasAnnualFee
                                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                                }`}
                            >
                                Sí cobra
                            </button>
                        </div>
                    </div>

                    {hasAnnualFee && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Monto anual</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={annualFee}
                                        onChange={(e) => setAnnualFee(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Mes de cobro</label>
                                <input
                                    type="number"
                                    value={annualFeeMonth}
                                    onChange={(e) => setAnnualFeeMonth(e.target.value)}
                                    placeholder="3"
                                    min="1"
                                    max="12"
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-2 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                    <button
                        onClick={handleCreate}
                        disabled={!limit || loading}
                        className="w-full py-4 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Crear Tarjeta
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
