'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ProfileWithData } from '@/types';
import { handleGoalTransaction } from '@/app/actions/budget';
import { toast } from 'sonner';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';
import { PencilIcon, Trash2Icon, XIcon, PiggyBankIcon, CalendarIcon, PlusIcon, PauseIcon, PlayIcon, HistoryIcon } from '@animateicons/react/lucide';
import { getCategoryInfo, getStage } from './categories';

type Goal = ProfileWithData['goals'][number];
type Account = ProfileWithData['accounts'][number];

interface GoalCardProps {
    goal: Goal;
    accounts: Account[];
    isExpanded: boolean;
    onToggleExpand: (goalId: number | null) => void;
    onOpenHistory: (goal: Goal) => void;
    onPause: (goal: Goal) => void;
    onOpenEdit: (goal: Goal) => void;
    onSmartDelete: (goal: Goal) => void;
    onRefresh: () => void;
}

export default function GoalCard({ goal, accounts, isExpanded, onToggleExpand, onOpenHistory, onPause, onOpenEdit, onSmartDelete, onRefresh }: GoalCardProps) {
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState<string>(
        goal.type === 'FIXED' && goal.sourceAccountId ? goal.sourceAccountId.toString() : ''
    );
    const [submitting, setSubmitting] = useState(false);

    // Si se colapsa el panel sin enviar (se abrió otra meta, o se cerró a mano),
    // limpia el monto tecleado — si no, al reabrir esta misma tarjeta más tarde
    // aparecía el monto de la vez anterior en vez de un campo en blanco.
    useEffect(() => {
        if (!isExpanded) {
            setAmount('');
            setAccountId(goal.type === 'FIXED' && goal.sourceAccountId ? goal.sourceAccountId.toString() : '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExpanded]);

    const percentage = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    const catInfo = getCategoryInfo(goal.category);
    const CatIcon = catInfo.icon;
    const stage = getStage(percentage);
    const priorityColors: Record<string, string> = {
        'HIGH': 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
        'MEDIUM': 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        'LOW': 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    };
    const priorityLabel: Record<string, string> = { 'HIGH': 'Alta', 'MEDIUM': 'Media', 'LOW': 'Baja' };

    function resetForm() {
        setAmount('');
        setAccountId(goal.type === 'FIXED' && goal.sourceAccountId ? goal.sourceAccountId.toString() : '');
    }

    async function handleQuota() {
        if (submitting) return;
        if (!goal.sourceAccountId) {
            onToggleExpand(goal.id);
            setAmount(Number(goal.contributionAmount || 0).toFixed(2));
            return;
        }
        setSubmitting(true);
        try {
            await handleGoalTransaction(goal.id, Number(goal.contributionAmount), 'DEPOSIT', goal.sourceAccountId);
            toast.success(`Cuota de $${goal.contributionAmount} pagada 🚀`);
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
            onRefresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al pagar cuota');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleTransaction(type: 'DEPOSIT' | 'WITHDRAW') {
        if (submitting) return;
        const parsed = parseFloat(amount);
        if (!parsed || parsed <= 0) { toast.error("Monto inválido"); return; }
        if (type === 'WITHDRAW' && parsed > goal.currentAmount) { toast.error("Fondos insuficientes"); return; }
        if (type === 'WITHDRAW' && !accountId) { toast.error("Selecciona cuenta destino"); return; }

        setSubmitting(true);
        try {
            await handleGoalTransaction(goal.id, parsed, type, accountId ? parseInt(accountId) : undefined);
            toast.success(type === 'DEPOSIT' ? "¡Depósito registrado! 🚀" : "Retiro registrado 📉");
            resetForm();
            onToggleExpand(null);
            onRefresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error en transacción");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={`bg-surface dark:bg-zinc-900/50 border ${goal.isPaused ? 'border-zinc-300 dark:border-zinc-700 opacity-70' : percentage >= 100 ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'} p-6 rounded-[2.5rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all`}>
            {goal.isPaused && (
                <div className="absolute top-4 right-4 z-10">
                    <span className="text-[10px] font-black bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-2 py-1 rounded-full uppercase">Pausada</span>
                </div>
            )}

            <div className="flex justify-between items-start mb-4 gap-2">
                {/* min-w-0 en la columna del nombre: sin el, el bloque de texto
                    no puede encogerse por debajo de su contenido y empuja los
                    cuatro iconos fuera de la tarjeta en pantallas estrechas. */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${catInfo.color}`}>
                        <CatIcon size={18} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight wrap-break-word">{goal.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${priorityColors[goal.priority || 'MEDIUM']}`}>
                                {priorityLabel[goal.priority || 'MEDIUM']}
                            </span>
                            <span className={`text-[10px] font-bold ${stage.color}`}>{stage.label}</span>
                        </div>
                    </div>
                </div>
                {/* shrink-0 para que los cuatro iconos no se compriman ni se
                    salgan de la tarjeta cuando el nombre de la meta es largo en
                    pantallas estrechas (se desbordaban 7px a 360px). */}
                <div className="flex gap-1 shrink-0">
                    <button onClick={() => onOpenHistory(goal)} className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors" title="Historial">
                        <HistoryIcon size={16} />
                    </button>
                    <button onClick={() => onPause(goal)} className="p-2 text-zinc-400 hover:text-amber-500 transition-colors" title={goal.isPaused ? "Reanudar" : "Pausar"}>
                        {goal.isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
                    </button>
                    <button onClick={() => onOpenEdit(goal)} className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"><PencilIcon size={16} /></button>
                    <button onClick={() => onSmartDelete(goal)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2Icon size={16} /></button>
                </div>
            </div>

            <div className="flex items-end gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <PiggyBankIcon size={28} />
                </div>
                <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ahorrado</p>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white">${goal.currentAmount.toFixed(2)}</span>
                    <span className="text-sm text-zinc-400 ml-1">/ ${goal.targetAmount.toFixed(0)}</span>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs font-bold mb-2">
                    {percentage >= 100 ? (
                        <span className="text-emerald-500">¡COMPLETADA! 🏆</span>
                    ) : (
                        <span className="text-zinc-500">{percentage.toFixed(0)}%</span>
                    )}
                </div>
                <div className="relative h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${percentage >= 100 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-linear-to-r from-pink-500 to-rose-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                    {[25, 50, 75].map(milestone => (
                        <div
                            key={milestone}
                            className={`absolute top-0 h-full w-0.5 ${percentage >= milestone ? 'bg-white/50' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                            style={{ left: `${milestone}%` }}
                        />
                    ))}
                </div>
                <div className="flex justify-between mt-1">
                    {['25%', '50%', '75%', '100%'].map((m, i) => (
                        <span key={m} className={`text-[8px] font-bold ${percentage >= [25, 50, 75, 100][i] ? 'text-pink-500' : 'text-zinc-300 dark:text-zinc-600'}`}>{m}</span>
                    ))}
                </div>
            </div>

            {goal.notes && (
                <p className="text-xs text-zinc-400 mb-3 italic">&quot;{goal.notes}&quot;</p>
            )}

            {percentage < 100 && goal.deadline && (
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 mb-4">
                    <span>Fecha límite: {new Date(goal.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {(() => {
                        const remaining = goal.targetAmount - goal.currentAmount;
                        const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        if (daysLeft > 0 && remaining > 0) {
                            return <span className="text-zinc-500">${(remaining / daysLeft).toFixed(2)}/día</span>;
                        }
                        return <span className="text-red-500">Tiempo agotado</span>;
                    })()}
                </div>
            )}

            {percentage >= 100 && (
                <button onClick={() => onSmartDelete(goal)} className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-400 to-teal-500 text-white font-black hover:scale-105 transition-all shadow-lg animate-pulse flex items-center justify-center gap-2 mb-3">
                    🎉 ¡Reclamar!
                </button>
            )}

            {percentage < 100 && !goal.isPaused && (
                isExpanded ? (
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-zinc-500 uppercase">Gestionar Fondos</span>
                            <button onClick={() => { onToggleExpand(null); resetForm(); }} className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-800"><XIcon size={14} /></button>
                        </div>
                        <div className="mb-3">
                            <SmartMoneyInput value={amount} onMoneyChange={setAmount} className="w-full bg-surface dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-bold text-lg outline-none" placeholder="0.00" />
                        </div>
                        <div className="mb-3">
                            {goal.type === 'FIXED' && goal.sourceAccountId ? (
                                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex justify-between items-center opacity-75">
                                    <span className="text-xs font-bold text-zinc-400">De: {accounts.find(a => a.id === goal.sourceAccountId)?.name}</span>
                                    <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-500">Vinculada</span>
                                </div>
                            ) : (
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-3 rounded-xl bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none">
                                    <option value="">Cuenta...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.symbol || '$'}{acc.balance})</option>)}
                                </select>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button disabled={submitting} onClick={() => handleTransaction('DEPOSIT')} className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:pointer-events-none">Depositar</button>
                            <button disabled={submitting} onClick={() => handleTransaction('WITHDRAW')} className="p-3 bg-surface dark:bg-zinc-800 hover:bg-red-50 text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:pointer-events-none">Retirar</button>
                        </div>
                    </div>
                ) : (
                    goal.type === 'FIXED' && goal.contributionAmount ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button disabled={submitting} onClick={handleQuota} className="py-4 rounded-2xl bg-indigo-600 dark:bg-white text-white dark:text-black font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> Pagar Cuota</span>
                                <span className="text-xs opacity-80">${Number(goal.contributionAmount).toFixed(2)}</span>
                            </button>
                            <button onClick={() => { onToggleExpand(goal.id); setAmount(''); if (goal.sourceAccountId) setAccountId(goal.sourceAccountId.toString()); }} className="py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-bold text-sm transition-all flex flex-col items-center gap-1 border border-dashed border-zinc-200 dark:border-zinc-700">
                                <span className="flex items-center gap-1.5"><PlusIcon size={14} /> Abonar Extra</span>
                                <span className="text-xs opacity-80">Otra cantidad</span>
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => { onToggleExpand(goal.id); setAmount(''); }} className="w-full py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-dashed border-zinc-200 dark:border-zinc-700">
                            <PlusIcon size={18} /> Agregar / Retirar
                        </button>
                    )
                )
            )}
        </div>
    );
}
