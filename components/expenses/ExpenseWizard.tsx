'use client';

import { useState, useEffect } from 'react';
// import { Account, CreditCard, Category } from '@prisma/client';
import { ProfileWithData } from '@/types';
import { createExpense, updateExpense } from '@/app/actions/budget';
import { getCategories } from '@/app/actions/categories';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import {
    CreditCard as CreditCardIcon,
    Wallet,
    Calendar,
    Save,
    X,
    HelpCircle
} from 'lucide-react';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { useScrollLock } from '@/hooks/useScrollLock';

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
    isEditing = false
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

    // Load Initial Data
    useEffect(() => {
        if (isEditing && initialData) {
            setAmount(initialData.amount.toString());
            setName(initialData.name);
            setCategoryId(initialData.categoryId || null);
            setDate(initialData.createdAt ? new Date(initialData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setIsRecurring(initialData.isRecurring || false);

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
            dueDate: isRecurring ? new Date(date).getDate() : undefined,
            isRecurring,
            isOneTime: !isRecurring,
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
                {categories.map(cat => (
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
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                        className="w-full bg-transparent text-center text-5xl md:text-7xl font-black tracking-tighter outline-none placeholder-zinc-200 dark:placeholder-zinc-800 focus:placeholder-zinc-100 transition-all border-b-2 border-transparent focus:border-zinc-200 dark:focus:border-zinc-800 pb-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-zinc-900 dark:text-white"
                        placeholder="0"
                    />
                    <span className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 text-2xl md:text-3xl font-bold text-zinc-300 select-none">$</span>
                </div>
            </div>

            {/* Cuadrícula de Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 pl-1">Descripción</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-purple-500/50 transition-all"
                            placeholder="¿En qué gastaste?"
                        />
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
                                <Wallet className="w-4 h-4" />
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
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toFixed(2)})</option>
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
                                        <option key={card.id} value={card.id}>{card.name} (Disp: ${(card.limit - card.balance).toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-4 flex flex-col-reverse md:flex-row items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-3">
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-900 border-none rounded-xl px-3 py-2 font-bold text-sm text-zinc-600 dark:text-zinc-300 outline-none flex-1 md:flex-none"
                    />
                    <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isRecurring ? 'bg-purple-500 border-purple-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                            {isRecurring && <CreditCardIcon className="w-3 h-3 text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors">Recurrente</span>
                    </label>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full md:w-auto md:flex-1 md:max-w-[200px] bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    Guardar
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-950 w-full md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[95vh] min-h-[85vh] md:min-h-0 overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-red-500 transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                {step === 1 && renderStep1_Categories()}
                {step === 2 && renderStep2_Details()}
            </div>
        </div>
    );
}
