import React, { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/utils';
import { updateCategoryLimit } from '@/app/actions/budget';
import { toast } from 'sonner';
import { CheckIcon, XIcon } from '@animateicons/react/lucide';
import { PencilIcon } from '@animateicons/react/lucide';
import { useRouter } from 'next/navigation';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';

interface BudgetCardProps {
    category: any;
    expenses: any[];
    onUpdate?: () => void;
}

export default function BudgetCard({ category, expenses, onUpdate }: BudgetCardProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [limitInput, setLimitInput] = useState(category.monthlyLimit?.toString() || '');

    // Calculate stats
    const catExpenses = expenses.filter(e => e.categoryId === category.id || e.category === category.name);
    const total = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const limit = category.monthlyLimit ? Number(category.monthlyLimit) : 0;
    const rollover = category.isRollover ? Number(category.rolloverBalance) : 0;
    const effectiveLimit = limit + rollover;

    const percentage = effectiveLimit > 0 ? Math.min((total / effectiveLimit) * 100, 100) : 0;
    const isOverLimit = effectiveLimit > 0 && total > effectiveLimit;
    const remaining = Math.max(0, effectiveLimit - total);

    useEffect(() => {
        setLimitInput(category.monthlyLimit?.toString() || '');
    }, [category.monthlyLimit]);

    async function handleSaveLimit() {
        const val = parseFloat(limitInput);
        if (isNaN(val)) return;

        if (val === limit) {
            setIsEditing(false);
            return;
        }

        const res = await updateCategoryLimit(category.id, val);
        if (res.success) {
            toast.success("Límite actualizado");
            setIsEditing(false);
            if (onUpdate) {
                onUpdate();
            } else {
                router.refresh();
            }
        } else {
            toast.error("Error al actualizar límite");
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between relative overflow-hidden">
            {/* Header */}
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${category.color?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${category.color || 'text-zinc-500'}`}>
                            {category.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-xl text-zinc-900 dark:text-white wrap-break-word leading-tight">{category.name}</h4>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{catExpenses.length} gastos</p>
                        </div>
                    </div>
                    {/* Edit Trigger - Only show when not editing */}
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-all hover:scale-110"
                            title="Editar Presupuesto"
                        >
                            <PencilIcon size={16} />
                        </button>
                    )}
                </div>

                <p className="text-3xl font-black text-zinc-900 dark:text-white mb-4">{formatMoney(total)}</p>

                {/* Barra de Presupuesto */}
                <div className={`bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl mb-4 transition-all ${isEditing ? 'ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                    <div className="flex justify-between items-end mb-3">
                        <div className="w-full">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">PRESUPUESTO</p>

                            {isEditing ? (
                                <div className="flex items-center gap-2 animate-in zoom-in-95">
                                    <div className="relative flex-1">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                                        <SmartMoneyInput
                                            value={limitInput}
                                            onMoneyChange={setLimitInput}
                                            className="w-full pl-5 pr-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveLimit()}
                                        />
                                    </div>
                                    <button onClick={handleSaveLimit} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                        <CheckIcon size={14} />
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="p-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                                        <XIcon size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                        {limit > 0 ? formatMoney(effectiveLimit) : 'Sin límite'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {!isEditing && (
                            <div className="text-right shrink-0 ml-2">
                                {effectiveLimit > 0 && (
                                    <p className={`text-xs font-bold ${isOverLimit ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {isOverLimit ? `Excedido ${formatMoney(total - effectiveLimit)}` : `Quedan ${formatMoney(remaining)}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            {effectiveLimit > 0 ? (
                                <div className={`h-full rounded-full transition-all duration-1000 ${isOverLimit ? 'bg-linear-to-r from-orange-400 to-red-500' : 'bg-linear-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${percentage}%` }} />
                            ) : (
                                <div className="w-full h-full opacity-20 bg-zinc-300 dark:bg-zinc-600" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
