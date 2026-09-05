'use client';

import { useState, useEffect } from 'react';
// import { Account, CreditCard, Category } from '@prisma/client';
import { ProfileWithData } from '@/types';
import { createExpense, updateExpense } from '@/app/actions/budget';
import { getCategories } from '@/app/actions/categories';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { CreditCardIcon, WalletIcon, CalendarIcon, SaveIcon, XIcon } from '@animateicons/react/lucide';
import { HelpCircle } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';
import { useScrollLock } from '@/hooks/useScrollLock';
import { parseDateNoon } from '@/lib/utils';

type Account = ProfileWithData['accounts'][number];
type CreditCard = ProfileWithData['creditCards'][number];
type Category = ProfileWithData['categories'][number];

interface ExpenseWizardProps {
    accounts: Account[];
    creditCards: CreditCard[];
    categories: Category[];
    profileId: number;
    onClose: () => void;
    onSuccess: () => void;
    onInit?: () => void;
    initialData?: any; // New prop for editing
    isEditing?: boolean;
    recentNames?: string[];
}

export default function ExpenseWizard({
    accounts,
    creditCards,
    categories,
    profileId,
    onClose,
    onSuccess,
    onInit,
    initialData,
    isEditing = false,
    recentNames = []
}: ExpenseWizardProps) {
    const [step, setStep] = useState(isEditing ? 2 : 1); // Skip to step 2 if editing

    // Estado del Formulario
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');
    const [accountId, setAccountId] = useState<string>('');
    const [cardId, setCardId] = useState<string>('');
    const [date, setDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('MONTHLY');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filtered name suggestions
    const filteredNames = name.length > 0
        ? recentNames.filter(n => n.toLowerCase().includes(name.toLowerCase()) && n.toLowerCase() !== name.toLowerCase()).slice(0, 5)
        : recentNames.slice(0, 5);

    // Load Initial Data
    useEffect(() => {
        if (isEditing && initialData) {
            setAmount(initialData.amount.toString());
            setName(initialData.name);
            setCategoryId(initialData.categoryId || null);
            setDate(initialData.createdAt ? new Date(initialData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setIsRecurring(initialData.isRecurring || false);
            setRecurrenceType(initialData.recurrenceType || 'MONTHLY');

            if (initialData.linkedCardId) {
                setPaymentMethod('CREDIT');
                setCardId(initialData.linkedCardId.toString());
            } else if (initialData.accountId) {
                setPaymentMethod('CASH');
                setAccountId(initialData.accountId.toString());
            }
        }
    }, [isEditing, initialData]);

    // Carga Inicial (Si las categorías son válidas pero la lista local está vacía)
    useEffect(() => {
        if (categories.length === 0) {
            getCategories(profileId).then((cats) => {
                if (cats.length > 0 && onInit) {
                    onInit();
                }
            });
        }
    }, [categories.length, profileId, onInit]);

    useScrollLock(true);

    // Manejadores
    const handleCategorySelect = (catId: number) => {
        setCategoryId(catId);
        setStep(2);
    };

    const handleSave = async () => {
        const val = parseFloat(amount);
        if (!name || isNaN(val) || val <= 0 || !categoryId) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        // Validaciones Financieras
        // Skip balance check on edit if amount didn't increase significantly? Or simpler: warn but allow.
        // For simplicity, we keep checks but maybe less strict or just warn.

        if (paymentMethod === 'CASH') {
            if (!accountId) {
                toast.error("Selecciona una cuenta de origen");
                return;
            }
            // Logic to check balance? If editing, we revert old amount first. 
            // Checking strictly is tricky without knowing old impact precisely here.
            // We just let backend handle negatives or simple check.
        }

        if (paymentMethod === 'CREDIT') {
            if (!cardId) {
                toast.error("Selecciona la tarjeta utilizada");
                return;
            }
        }

        // Buscar nombre de categoría para compatibilidad con versiones anteriores
        const selectedCat = categories.find(c => c.id === categoryId);

        const payload = {
            name,
            amount: val,
            category: selectedCat?.name || "Gasto",
            categoryId: categoryId,
            profileId,
            dueDate: isRecurring ? parseDateNoon(date).getDate() : undefined,
            isRecurring,
            isOneTime: !isRecurring,
            recurrenceType: isRecurring ? recurrenceType : 'MONTHLY',
            paymentMethod,
            accountId: paymentMethod === 'CASH' ? Number(accountId) : undefined,
            linkedCardId: paymentMethod === 'CREDIT' ? Number(cardId) : undefined,
            date: `${date}T12:00:00`
        };

        try {
            if (isEditing && initialData?.id) {
                await updateExpense(initialData.id, payload);
                toast.success("Gasto actualizado con éxito");
            } else {
                await createExpense(payload);
                toast.success("Gasto registrado con éxito");
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Hubo un error al guardar el gasto");
        }
    };

    // Helper eliminado, usando componente CategoryIcon directamente

    // Pasos de Renderizado
    const renderStep1_Categories = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-center mb-2 text-zinc-900 dark:text-white">¿Qué estás pagando?</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
                {categories.filter(cat => cat.type !== 'SAVING').map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`p-4 rounded-3xl border-2 border-zinc-100 dark:border-zinc-800 hover:border-purple-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group flex flex-col items-center gap-3`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-zinc-100 dark:bg-zinc-800 ${cat.color} bg-opacity-10`}>
                            <CategoryIcon iconName={cat.icon} size={24} />
                        </div>
                        <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Fallback si no hay categorías */}
            {categories.length === 0 && (
                <div className="text-center text-zinc-500 py-10">
                    <p>Cargando categorías...</p>
                </div>
            )}
        </div>
    );

    const renderStep2_Details = () => (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold text-sm px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    ← Volver
                </button>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full mr-12">
                    {(() => {
                        const cat = categories.find(c => c.id === categoryId);
                        if (!cat) return null;
                        return (
                            <>
                                <span className={cat.color}><CategoryIcon iconName={cat.icon} size={24} /></span>
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Input Principal */}
            <div className="text-center space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Monto del Gasto</label>
                <div className="relative inline-block w-full max-w-[280px]">
                    <SmartMoneyInput
                        value={amount}
                        onMoneyChange={setAmount}
                        autoFocus
                        className="w-full bg-transparent text-center text-5xl md:text-7xl font-black tracking-tighter outline-none placeholder-zinc-200 dark:placeholder-zinc-800 focus:placeholder-zinc-100 transition-all border-b-2 border-transparent focus:border-zinc-200 dark:focus:border-zinc-800 pb-2 text-zinc-900 dark:text-white"
                        placeholder="0.00"
                    />
                    <span className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 text-2xl md:text-3xl font-bold text-zinc-300 select-none">$</span>
                </div>
            </div>

            {/* Cuadrícula de Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div className="relative">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Descripción</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-purple-500/50 transition-all"
                            placeholder="¿En qué gastaste?"
                        />
                        {showSuggestions && filteredNames.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
                                {filteredNames.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onMouseDown={() => { setName(suggestion); setShowSuggestions(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors flex items-center gap-2"
                                    >
                                        <span className="text-zinc-400">↩</span> {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Selector de Método de Pago */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Método de Pago</label>
                        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl">
                            <button
                                onClick={() => setPaymentMethod('CASH')}
                                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${paymentMethod === 'CASH' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <WalletIcon className="w-4 h-4" />
                                Efectivo/Débito
                            </button>
                            <button
                                onClick={() => setPaymentMethod('CREDIT')}
                                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${paymentMethod === 'CREDIT' ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600 dark:text-purple-400' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <CreditCardIcon className="w-4 h-4" />
                                Crédito
                            </button>
                        </div>
                    </div>

                    {/* Selección Dinámica de Cuenta/Tarjeta */}
                    <div>
                        {paymentMethod === 'CASH' ? (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Cuenta de Origen</label>
                                <select
                                    value={accountId}
                                    onChange={e => setAccountId(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-emerald-500/50 appearance-none text-zinc-800 dark:text-zinc-200 transition-all"
                                >
                                    <option value="" disabled>Seleccionar Cuenta...</option>
                                    {accounts.filter(acc => acc.purpose !== 'SAVINGS').map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.symbol || '$'}{acc.balance.toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Tarjeta de Crédito</label>
                                <select
                                    value={cardId}
                                    onChange={e => setCardId(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-purple-500/50 appearance-none text-zinc-800 dark:text-zinc-200 transition-all"
                                >
                                    <option value="" disabled>Seleccionar Tarjeta...</option>
                                    {creditCards.map(card => (
                                        <option key={card.id} value={card.id}>{card.name} (Disp: ${(card.limit - card.balance - (card.balance * ((card.insuranceRate || 0.25) / 100))).toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fecha y Recurrencia - Sección destacada */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase mb-3 pl-1">
                        <CalendarIcon className="w-4 h-4" />
                        Fecha del Gasto
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 font-bold text-base text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 ring-purple-500/50 transition-all"
                    />
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Gasto recurrente</span>
                        <span className="text-xs text-zinc-400">Se repite automáticamente</span>
                    </div>
                    <button
                        onClick={() => setIsRecurring(!isRecurring)}
                        className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${isRecurring ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${isRecurring ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                {isRecurring && (
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4">
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 block mb-3">Frecuencia</span>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'MONTHLY', label: 'Mensual' },
                                { value: 'ANNUAL', label: 'Anual' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setRecurrenceType(opt.value)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                        recurrenceType === opt.value
                                            ? 'bg-purple-500 text-white shadow-sm'
                                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-2 flex justify-end">
                <button
                    onClick={handleSave}
                    className="w-full md:w-auto md:max-w-[240px] bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                    <SaveIcon className="w-5 h-5" />
                    Guardar
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-red-500 transition-colors z-10"
                >
                    <XIcon className="w-6 h-6" />
                </button>

                {step === 1 && <div className="p-6 md:p-8 overflow-y-auto flex-1">{renderStep1_Categories()}</div>}
                {step === 2 && <div className="p-6 md:p-8 overflow-y-auto flex-1">{renderStep2_Details()}</div>}
            </div>
        </div>
    );
}
