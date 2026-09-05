'use client';

import { useState, useEffect } from 'react';
import { Account } from '@prisma/client';
import { createIncome, updateIncome } from '@/app/actions/budget';
import { createSalary, updateSalary } from '@/app/actions/salary';
import { DollarSignIcon, WalletIcon, SaveIcon } from '@animateicons/react/lucide';
import { Building2 } from 'lucide-react';
import SalaryCalculator from '@/components/salary/SalaryCalculator';
import { toast } from 'sonner';
import { useScrollLock } from '@/hooks/useScrollLock';
import { parseDateNoon } from '@/lib/utils';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';
import { CategoryIcon, AVAILABLE_ICONS } from '@/components/shared/CategoryIcon';

interface IncomeWizardProps {
    accounts: any[];
    profileId: number;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    isEditing?: boolean;
}

type IncomeType = 'SALARY' | 'DEPOSIT' | 'CASH' | null;

export default function IncomeWizard({ accounts, profileId, onClose, onSuccess, initialData, isEditing = false }: IncomeWizardProps) {
    const [step, setStep] = useState<number>(isEditing ? 2 : 1);
    const [type, setType] = useState<IncomeType>(null);

    // Sub-modo Salario
    const [salaryMode, setSalaryMode] = useState<'MANUAL' | 'CALCULATOR'>('MANUAL');

    // Estado del Formulario
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [selectedIcon, setSelectedIcon] = useState('Wallet');
    const [incomeFrequency, setIncomeFrequency] = useState<string>('ONE_TIME');
    const [date, setDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });

    // Cargar datos iniciales al editar
    useEffect(() => {
        if (isEditing && initialData) {
            setAmount(initialData.amount?.toString() || '');
            setDescription(initialData.name || '');
            setSelectedAccountId(initialData.accountId || null);
            setSelectedIcon(initialData.icon || 'Wallet');
            setIncomeFrequency(initialData.frequency || 'ONE_TIME');
            setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

            // Detectar tipo basado en los datos
            if (initialData.type === 'SALARY' || initialData.name?.toLowerCase().includes('salario')) {
                setType('SALARY');
                setSalaryMode('MANUAL');
            } else if (initialData.accountId) {
                // Verificar si la cuenta es CASH
                const acc = accounts.find(a => a.id === initialData.accountId);
                if (acc?.type === 'CASH') {
                    setType('CASH');
                } else {
                    setType('DEPOSIT');
                }
            } else {
                setType('CASH');
            }
        }
    }, [isEditing, initialData, accounts]);

    useScrollLock(true);

    // Manejadores
    const handleTypeSelect = (selectedType: IncomeType) => {
        setType(selectedType);

        if (selectedType === 'CASH') {
            const cashAcc = accounts.find(a => a.type === 'CASH');
            if (cashAcc) setSelectedAccountId(cashAcc.id);
        }

        if (selectedType === 'SALARY') setSelectedIcon('Building');
        if (selectedType === 'DEPOSIT') setSelectedIcon('CreditCard');
        if (selectedType === 'CASH') setSelectedIcon('Wallet');

        setStep(2);
    };

    const handleSaveIncome = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            toast.error("Monto inválido");
            return;
        }

        if (!selectedAccountId) {
            toast.error("Selecciona una cuenta de destino");
            return;
        }

        if (type !== 'SALARY' && !description.trim()) {
            toast.error("Falta descripción");
            return;
        }

        try {
            if (isEditing && initialData?.id) {
                if (initialData.type === 'SALARY' || type === 'SALARY') {
                    await updateSalary(initialData.id, {
                        grossVal: val,
                        bonus: initialData.bonus ?? 0,
                        frequency: initialData.frequency || 'monthly',
                        paymentDate: date,
                        absentDays: initialData.absentDays ?? 0,
                        company: description || initialData.company || 'Salario',
                        profileId,
                        accountId: selectedAccountId || undefined,
                        isManualCalculation: initialData.isManualCalculation ?? true,
                    });
                    toast.success("Salario actualizado");
                } else {
                    await updateIncome(initialData.id, {
                        name: description || 'Ingreso',
                        amount: val,
                        type: incomeFrequency === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING',
                        frequency: incomeFrequency === 'ONE_TIME' ? undefined : incomeFrequency,
                        profileId,
                        accountId: selectedAccountId || undefined,
                        icon: selectedIcon,
                        date: parseDateNoon(date),
                    });
                    toast.success("Ingreso actualizado");
                }
            } else if (type === 'SALARY' && salaryMode === 'MANUAL') {
                // CREAR SALARIO MANUAL
                await createSalary({
                    grossVal: val,
                    bonus: 0,
                    frequency: 'monthly',
                    paymentDate: date,
                    absentDays: 0,
                    company: description || "Salario Manual",
                    profileId,
                    accountId: selectedAccountId || undefined,
                    isManualCalculation: true
                });
                toast.success("Salario registrado");
            } else {
                // CREAR INGRESO NUEVO
                await createIncome({
                    name: description,
                    amount: val,
                    type: incomeFrequency === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING',
                    frequency: incomeFrequency === 'ONE_TIME' ? undefined : incomeFrequency,
                    profileId,
                    accountId: selectedAccountId || undefined,
                    icon: selectedIcon,
                    date: parseDateNoon(date),
                });
                toast.success("Ingreso registrado");
            }

            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        }
    };

    const renderStep1_TypeSelection = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-center mb-8 text-zinc-800 dark:text-white">¿Qué tipo de ingreso es?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => handleTypeSelect('SALARY')}
                    className="p-6 rounded-3xl border-2 border-zinc-100 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group flex flex-col items-center gap-4"
                >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="w-8 h-8 lucide-animated" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg text-zinc-800 dark:text-zinc-200">Salario / Nómina</span>
                        <span className="text-xs text-zinc-500">Pago recurrente de empresa</span>
                    </div>
                </button>

                <button
                    onClick={() => handleTypeSelect('DEPOSIT')}
                    className="p-6 rounded-3xl border-2 border-zinc-100 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group flex flex-col items-center gap-4"
                >
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <DollarSignIcon className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg text-zinc-800 dark:text-zinc-200">Depósito / Transfer</span>
                        <span className="text-xs text-zinc-500">Ingreso a cuenta bancaria</span>
                    </div>
                </button>

                <button
                    onClick={() => handleTypeSelect('CASH')}
                    className="p-6 rounded-3xl border-2 border-zinc-100 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group flex flex-col items-center gap-4"
                >
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <WalletIcon className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg text-zinc-800 dark:text-zinc-200">Efectivo / Otro</span>
                        <span className="text-xs text-zinc-500">Dinero en mano o eventual</span>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderStep2_Details = () => {
        if (!type) return null;

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 pt-6 md:pt-0">
                    {!isEditing && (
                        <button
                            onClick={() => setStep(1)}
                            className="p-3 -ml-3 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-2 group shrink-0"
                        >
                            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            <span className="font-bold text-sm hidden md:inline">Volver</span>
                        </button>
                    )}

                    <h2 className="text-xl md:text-2xl font-black text-center text-zinc-900 dark:text-white uppercase tracking-tight flex-1 px-2 leading-tight">
                        {isEditing ? 'Editar Ingreso' : type === 'SALARY' ? 'Registrar Salario' : type === 'DEPOSIT' ? 'Registrar Depósito' : 'Registrar Efectivo'}
                    </h2>

                    <div className="w-10 md:w-20 shrink-0"></div>
                </div>

                {type === 'SALARY' && !isEditing && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => setSalaryMode('MANUAL')}
                            className={`p-4 rounded-3xl border-2 transition-all group flex flex-col items-center gap-3 relative overflow-hidden ${salaryMode === 'MANUAL' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${salaryMode === 'MANUAL' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'}`}>
                                <DollarSignIcon className="w-6 h-6" />
                            </div>
                            <div className="text-center z-10">
                                <span className={`block font-bold text-sm ${salaryMode === 'MANUAL' ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>Monto Exacto</span>
                                <span className="text-[10px] text-zinc-400 leading-tight block mt-1">Sé cuánto recibí</span>
                            </div>
                            {salaryMode === 'MANUAL' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        </button>

                        <button
                            onClick={() => setSalaryMode('CALCULATOR')}
                            className={`p-4 rounded-3xl border-2 transition-all group flex flex-col items-center gap-3 relative overflow-hidden ${salaryMode === 'CALCULATOR' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${salaryMode === 'CALCULATOR' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'}`}>
                                <Building2 className="w-6 h-6 lucide-animated" />
                            </div>
                            <div className="text-center z-10">
                                <span className={`block font-bold text-sm ${salaryMode === 'CALCULATOR' ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400'}`}>Calculadora</span>
                                <span className="text-[10px] text-zinc-400 leading-tight block mt-1">Estimar deducciones</span>
                            </div>
                            {salaryMode === 'CALCULATOR' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                        </button>
                    </div>
                )}

                {type === 'SALARY' && salaryMode === 'CALCULATOR' && !isEditing ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <SalaryCalculator
                            profileId={profileId}
                            accounts={accounts}
                            onSave={() => onSuccess()}
                            isEmbedded={true}
                        />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        {type === 'SALARY' && !isEditing && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <DollarSignIcon className="w-5 h-5" />
                                </div>
                                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                                    <strong className="block font-bold mb-1">Registro Rápido</strong>
                                    Ingresa el monto final que llegó a tu cuenta. Perfecto si no necesitas desglosar impuestos.
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* INPUT DE MONTO */}
                            <div className="text-center space-y-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Monto {type === 'SALARY' ? 'Neto Recibido' : 'a Ingresar'}
                                </label>
                                <div className="relative inline-block w-full max-w-[280px]">
                                    <SmartMoneyInput
                                        value={amount}
                                        onMoneyChange={setAmount}
                                        className="w-full bg-transparent text-center text-6xl md:text-7xl font-black tracking-tighter outline-none placeholder-zinc-200 dark:placeholder-zinc-800 focus:placeholder-zinc-100 transition-all border-b-2 border-transparent focus:border-zinc-200 dark:focus:border-zinc-800 pb-2"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-zinc-300 select-none">$</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-zinc-200 dark:ring-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all"
                                    />
                                </div>

                                {type !== 'SALARY' && (
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Frecuencia</label>
                                        <select
                                            value={incomeFrequency}
                                            onChange={e => setIncomeFrequency(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-zinc-200 dark:ring-zinc-700 appearance-none text-zinc-800 dark:text-zinc-200 transition-all"
                                        >
                                            <option value="ONE_TIME">Único (una vez)</option>
                                            <option value="MONTHLY">Mensual</option>
                                            <option value="BIWEEKLY">Quincenal</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Destino</label>
                                    <div className="relative">
                                        <select
                                            value={selectedAccountId || ''}
                                            onChange={e => setSelectedAccountId(Number(e.target.value))}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-zinc-200 dark:ring-zinc-700 appearance-none text-zinc-800 dark:text-zinc-200 transition-all"
                                        >
                                            <option value="" disabled>Seleccionar...</option>
                                            {accounts.filter(acc => {
                                                if (acc.purpose === 'SAVINGS') return false;
                                                if (type === 'DEPOSIT') return acc.type !== 'CASH';
                                                if (type === 'CASH') return acc.type === 'CASH';
                                                return true;
                                            }).map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SELECTOR DE ICONOS */}
                            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-4">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 pl-1">Icono del Ingreso</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                    {AVAILABLE_ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => setSelectedIcon(icon)}
                                            className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-all ${selectedIcon === icon
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-110'
                                                : 'bg-white dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                }`}
                                        >
                                            <CategoryIcon iconName={icon} size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveIncome}
                            className={`w-full py-5 rounded-3xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl ${type === 'SALARY' ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                                type === 'DEPOSIT' ? 'bg-blue-500 text-white shadow-blue-500/30' :
                                    'bg-amber-500 text-white shadow-amber-500/30'
                                }`}
                        >
                            <SaveIcon className="w-6 h-6" />
                            {isEditing ? 'Guardar Cambios' : type === 'SALARY' ? 'Registrar Salario' : 'Guardar Ingreso'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col ${type === 'SALARY' ? 'md:max-w-3xl' : ''}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-red-500 transition-colors z-10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {step === 1 && <div className="p-6 md:p-8 overflow-y-auto flex-1">{renderStep1_TypeSelection()}</div>}
                {step === 2 && <div className="p-6 md:p-8 overflow-y-auto flex-1">{renderStep2_Details()}</div>}
            </div>
        </div>
    );
}
