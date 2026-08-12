'use client';

import { useState } from 'react';
// import { Expense as PrismaExpense, CreditCard as PrismaCreditCard, Account as PrismaAccount, Category as PrismaCategory } from '@prisma/client'; 
import { ProfileWithData } from '@/types';

type ExpenseWithCategory = ProfileWithData['expenses'][number];
type CreditCard = ProfileWithData['creditCards'][number];
type Account = ProfileWithData['accounts'][number];
type Category = ProfileWithData['categories'][number];

import { createExpense, deleteExpense } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import ExpenseWizard from '@/components/expenses/ExpenseWizard';
import CategoryManager from '@/components/shared/CategoryManager';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { updateCategoryLimit } from '@/app/actions/categories';
import { Pencil, Search, Plus, Trash2, CreditCard as CardIcon, DollarSign, Wallet } from 'lucide-react';

interface ExpensesTabProps {
    expenses: ExpenseWithCategory[];
    creditCards: CreditCard[];
    accounts: Account[];
    categories: Category[];
    profileId: number;
    profileName: string;
    onUpdate: () => void;
}

export default function ExpensesTab({ expenses, creditCards, accounts, categories, profileId, onUpdate }: ExpensesTabProps) {
    const [showWizard, setShowWizard] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expenseToEdit, setExpenseToEdit] = useState<ExpenseWithCategory | null>(null);

    // Filtrar deudas y aplicar búsqueda
    const expensesList = expenses.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.amount.toString().includes(searchQuery));
        return matchesSearch;
    });

    const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteExpense(id);
                onUpdate();
                toast.success("Gasto eliminado");
            } catch (error) {
                toast.error("Error eliminando gasto");
            }
        });
    }

    const getCategoryColor = (catName: string) => {
        const cat = categories.find(c => c.name === catName);
        return cat?.color || 'text-zinc-500';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 pt-6">

            {/* --- ENCABEZADO Y ACCIONES --- */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                    <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">Mis Gastos</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-md">
                        Controla cada centavo. Gestiona tus salidas, suscripciones y límites de presupuesto.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowCategoryManager(true)}
                        className="h-12 px-6 rounded-2xl font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm hover:shadow-md"
                    >
                        Categorías
                    </button>

                    <button
                        onClick={() => { setExpenseToEdit(null); setShowWizard(true); }}
                        className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 dark:bg-zinc-100 px-8 font-bold text-white dark:text-black transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 flex-1 md:flex-none"
                    >
                        <span className="flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Nuevo Gasto
                        </span>
                        <div className="absolute inset-0 -z-10 bg-linear-to-r from-indigo-500 to-purple-500 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
                    </button>
                </div>
            </div>

            {/* --- TARJETA DE RESUMEN --- */}
            {/* ... (Keep existing summary cards) ... */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 relative overflow-hidden rounded-4xl bg-white dark:bg-zinc-950 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 p-10 shadow-2xl group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-48 w-48 rounded-full bg-[#1591DC]/10 dark:bg-indigo-500/30 blur-3xl group-hover:bg-[#1591DC]/15 dark:group-hover:bg-indigo-500/40 transition-all duration-1000" />
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-48 w-48 rounded-full bg-[#FF62BB]/10 dark:bg-pink-500/20 blur-3xl group-hover:bg-[#FF62BB]/15 dark:group-hover:bg-pink-500/30 transition-all duration-1000" />

                    <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/10 backdrop-blur-md border border-zinc-200 dark:border-white/10">
                                <DollarSign className="w-6 h-6 text-[#1591DC] dark:text-white" />
                            </div>
                            <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Total este mes</span>
                        </div>
                        <div>
                            <h3 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white drop-shadow-none dark:drop-shadow-lg dark:shadow-black">
                                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-sm">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full h-32 w-32 flex items-center justify-center mb-4">
                        <span className="text-4xl">📊</span>
                    </div>
                    <p className="text-3xl font-black text-zinc-900 dark:text-white">{expensesList.length}</p>
                    <p className="text-sm font-bold text-zinc-400 uppercase">Movimientos</p>
                </div>
            </div>


            {/* --- CONTROLES: BÚSQUEDA --- */}
            <div className="sticky top-4 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-2 rounded-4xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col md:flex-row gap-2 md:items-center justify-between">
                {/* Barra de Búsqueda */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar gastos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-900/50 border-none rounded-2xl h-12 pl-12 pr-4 font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                </div>
            </div>

            {/* --- LISTA DE GASTOS --- */}
            <div className="space-y-6 pb-20 w-full max-w-full overflow-x-hidden">
                {(() => {
                    const grouped = expensesList.reduce<Record<string, ExpenseWithCategory[]>>((groups, exp) => {
                        const date = new Date(exp.createdAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(exp);
                        return groups;
                    }, {});

                    if (Object.keys(grouped).length === 0) {
                        // Empty State (No changes)
                        return (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-full mb-4">
                                    <span className="text-4xl grayscale opacity-50">💸</span>
                                </div>
                                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Sin gastos registrados</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mb-6 text-sm">
                                    Parece que aún no has gastado nada este mes (¡o no lo has anotado!).
                                </p>
                                <button
                                    onClick={() => { setExpenseToEdit(null); setShowWizard(true); }}
                                    className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-sm"
                                >
                                    Registrar Primer Gasto
                                </button>
                            </div>
                        );
                    }

                    return Object.entries(grouped)
                        .sort(([, aItems], [, bItems]) => {
                            const dateA = new Date(aItems[0].createdAt).getTime();
                            const dateB = new Date(bItems[0].createdAt).getTime();
                            if (dateA !== dateB) return dateB - dateA;
                            return bItems[0].id - aItems[0].id;
                        })
                        .map(([date, items]: [string, ExpenseWithCategory[]]) => (
                            <div key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 dark:bg-black px-4 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">{date}</h4>
                                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                                </div>

                                <div className="grid gap-3">
                                    {items.map((exp) => (
                                        <div key={exp.id} className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 rounded-3xl p-4 md:p-5 flex items-center gap-3 md:gap-5 transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">

                                            {/* Caja de Icono */}
                                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${getCategoryColor(exp.category)} ${getCategoryColor(exp.category).includes('text-') ? getCategoryColor(exp.category).replace('text-', 'bg-').replace('500', '100') + ' dark:bg-opacity-10' : 'bg-zinc-100'} wrap-break-word`}>
                                                <CategoryIcon iconName={exp.categoryRel?.icon || categories.find(c => c.name === exp.category)?.icon || 'HelpCircle'} size={20} />
                                            </div>

                                            <div className="flex-1 min-w-0 text-sm md:text-base">
                                                <div className="flex justify-between items-start gap-2 md:gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-zinc-900 dark:text-white wrap-break-word leading-tight">{exp.name}</h4>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[10px] md:text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[100px]">{exp.category}</span>
                                                            {exp.isRecurring && <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Suscripción</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-black text-zinc-900 dark:text-white">-${exp.amount.toFixed(2)}</p>
                                                        <div className="flex items-center justify-end gap-1 text-[10px] md:text-xs font-medium text-zinc-400 mt-1">
                                                            {exp.linkedCardId ? <CardIcon size={10} /> : <Wallet size={10} />}
                                                            <span className="truncate max-w-[80px]">
                                                                {exp.linkedCardId
                                                                    ? (creditCards.find(c => c.id === exp.linkedCardId)?.name || 'Tarjeta')
                                                                    : (accounts.find(a => a.id === exp.accountId)?.name || 'Efectivo/Otro')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Acción: Botones (Edit/Delete) */}
                                            <div className="flex flex-col gap-1 md:flex-row md:items-center">
                                                <button
                                                    onClick={() => { setExpenseToEdit(exp); setShowWizard(true); }}
                                                    className="shrink-0 p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all opacity-100 md:opacity-0 group-hover:opacity-100 shadow-sm"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(exp.id)}
                                                    className="shrink-0 p-2 md:p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-100 md:opacity-0 group-hover:opacity-100 shadow-sm"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ));
                })()}
            </div>

            {/* MODAL DE GESTOR DE CATEGORÍAS */}
            {
                showCategoryManager && (
                    <CategoryManager
                        categories={categories}
                        profileId={profileId}
                        onClose={() => setShowCategoryManager(false)}
                        onUpdate={() => {
                            onUpdate();
                        }}
                    />
                )
            }

            {/* MODAL DE ASISTENTE */}
            {
                showWizard && (
                    <ExpenseWizard
                        accounts={accounts}
                        creditCards={creditCards}
                        categories={categories}
                        profileId={profileId}
                        initialData={expenseToEdit}
                        isEditing={!!expenseToEdit}
                        onClose={() => { setShowWizard(false); setExpenseToEdit(null); }}
                        onInit={() => onUpdate()}
                        onSuccess={() => {
                            setShowWizard(false);
                            setExpenseToEdit(null);
                            onUpdate();
                        }}
                    />
                )
            }
        </div >
    );
}
