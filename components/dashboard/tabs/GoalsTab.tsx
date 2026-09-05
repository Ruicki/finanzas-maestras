'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ProfileWithData } from '@/types';
import { formatMoney } from '@/lib/utils';

type Goal = ProfileWithData['goals'][number];
type Account = ProfileWithData['accounts'][number];
import { createGoal, deleteGoal, handleGoalTransaction, updateGoal, deleteGoalWithReclaim, toggleGoalPaused, getGoalTransactions } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { useScrollLock } from '@/hooks/useScrollLock';
import { PencilIcon, Trash2Icon, XIcon, PiggyBankIcon, CalculatorIcon, PlusIcon, EyeIcon, EyeOffIcon, CalendarIcon, PauseIcon, PlayIcon, HistoryIcon, FlagIcon, CarIcon, HouseIcon, BookOpenIcon, HeartIcon, RocketIcon, ShieldCheckIcon, WalletIcon } from '@animateicons/react/lucide';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';

const GOAL_CATEGORIES = [
    { id: 'SAVINGS', label: 'Ahorro General', icon: WalletIcon, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20' },
    { id: 'EMERGENCY', label: 'Fondo de Emergencia', icon: ShieldCheckIcon, color: 'text-blue-500 bg-blue-100 dark:bg-blue-500/20' },
    { id: 'CAR', label: 'Carro', icon: CarIcon, color: 'text-orange-500 bg-orange-100 dark:bg-orange-500/20' },
    { id: 'HOUSE', label: 'Casa', icon: HouseIcon, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-500/20' },
    { id: 'EDUCATION', label: 'Educación', icon: BookOpenIcon, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20' },
    { id: 'TRAVEL', label: 'Viaje', icon: RocketIcon, color: 'text-purple-500 bg-purple-100 dark:bg-purple-500/20' },
    { id: 'HEALTH', label: 'Salud', icon: HeartIcon, color: 'text-red-500 bg-red-100 dark:bg-red-500/20' },
    { id: 'OTHER', label: 'Otro', icon: FlagIcon, color: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-500/20' },
];

function getCategoryInfo(categoryId: string | null | undefined) {
    return GOAL_CATEGORIES.find(c => c.id === categoryId) || GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
}

function getStage(percentage: number): { label: string; color: string } {
    if (percentage >= 100) return { label: '¡Completa!', color: 'text-emerald-500' };
    if (percentage >= 75) return { label: 'Casi lista', color: 'text-emerald-400' };
    if (percentage >= 50) return { label: 'En progreso', color: 'text-blue-500' };
    if (percentage >= 25) return { label: 'Construyendo', color: 'text-amber-500' };
    return { label: 'Empezando', color: 'text-zinc-400' };
}

interface GoalsTabProps {
    goals: Goal[];
    accounts: any[];
    profileId: number;
    onUpdate: () => void;
}

export default function GoalsTab({ goals, accounts, profileId, onUpdate }: GoalsTabProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reclaimModal, setReclaimModal] = useState<{ isOpen: boolean; goal: Goal | null }>({ isOpen: false, goal: null });
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; goal: Goal | null }>({ isOpen: false, goal: null });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useScrollLock(isModalOpen || reclaimModal.isOpen || historyModal.isOpen);

    const [form, setForm] = useState({
        name: '',
        targetAmount: '',
        deadline: '',
        type: 'VARIABLE',
        frequency: 'MONTHLY',
        contributionAmount: '',
        priority: 'MEDIUM',
        category: 'SAVINGS',
        notes: '',
        sourceAccountId: '',
        destinationAccountId: ''
    });

    const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
    const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
    const [transactionAmount, setTransactionAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [reclaimAccountId, setReclaimAccountId] = useState('');
    const [isReclaiming, setIsReclaiming] = useState(false);

    // Calculator
    const [recommended, setRecommended] = useState<{ monthly: number; biweekly: number; weekly: number } | null>(null);

    useEffect(() => {
        if (form.targetAmount && form.deadline) {
            const target = parseFloat(form.targetAmount) || 0;
            const deadlineDate = new Date(form.deadline);
            const now = new Date();
            const daysLeft = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const monthsLeft = Math.max(1, daysLeft / 30);
            setRecommended({
                monthly: target / monthsLeft,
                biweekly: target / (monthsLeft * 2),
                weekly: target / (monthsLeft * 4.33),
            });
        } else {
            setRecommended(null);
        }
    }, [form.targetAmount, form.deadline]);

    function openNewGoalModal() {
        setEditingGoalId(null);
        setForm({
            name: '', targetAmount: '', deadline: '', type: 'VARIABLE',
            frequency: 'MONTHLY', contributionAmount: '', priority: 'MEDIUM',
            category: 'SAVINGS', notes: '', sourceAccountId: '', destinationAccountId: ''
        });
        setIsModalOpen(true);
    }

    function openEditGoalModal(goal: Goal) {
        setEditingGoalId(goal.id);
        setForm({
            name: goal.name,
            targetAmount: Number(goal.targetAmount).toFixed(2),
            deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
            type: goal.type,
            frequency: goal.frequency || 'MONTHLY',
            contributionAmount: Number(goal.contributionAmount || 0).toFixed(2),
            priority: goal.priority || 'MEDIUM',
            category: (goal as any).category || 'SAVINGS',
            notes: (goal as any).notes || '',
            sourceAccountId: goal.sourceAccountId?.toString() || '',
            destinationAccountId: (goal as any).destinationAccountId?.toString() || ''
        });
        setIsModalOpen(true);
    }

    async function openHistory(goal: Goal) {
        setHistoryModal({ isOpen: true, goal });
        setLoadingHistory(true);
        try {
            const txs = await getGoalTransactions(goal.id);
            setTransactions(txs);
        } catch {
            setTransactions([]);
        }
        setLoadingHistory(false);
    }

    async function handleSave() {
        if (!form.name || !form.targetAmount) {
            toast.error("Nombre y monto son requeridos");
            return;
        }
        const data = {
            name: form.name,
            targetAmount: parseFloat(form.targetAmount),
            deadline: form.deadline ? new Date(form.deadline) : undefined,
            profileId,
            type: form.type,
            frequency: form.type === 'FIXED' ? form.frequency : undefined,
            contributionAmount: form.type === 'FIXED' && form.contributionAmount ? parseFloat(form.contributionAmount) : undefined,
            priority: form.priority,
            category: form.category,
            notes: form.notes || undefined,
            sourceAccountId: form.sourceAccountId ? parseInt(form.sourceAccountId) : undefined,
            destinationAccountId: form.destinationAccountId ? parseInt(form.destinationAccountId) : undefined,
        };

        try {
            if (editingGoalId) {
                await updateGoal(editingGoalId, data);
                toast.success("Meta actualizada");
            } else {
                await createGoal(data);
                toast.success("Meta creada");
            }
            setIsModalOpen(false);
            onUpdate();
        } catch (error) {
            toast.error("Error al guardar");
        }
    }

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteGoal(id);
                toast.success("Meta eliminada");
                onUpdate();
            } catch {
                toast.error("Error al eliminar");
            }
        }, "¿Borrar meta?", "Esta acción no se puede deshacer");
    }

    async function handleTransaction(goalId: number, currentAmount: number, type: 'DEPOSIT' | 'WITHDRAW') {
        const amount = parseFloat(transactionAmount);
        if (!amount || amount <= 0) { toast.error("Monto inválido"); return; }
        if (type === 'WITHDRAW' && amount > currentAmount) { toast.error("Fondos insuficientes"); return; }
        if (type === 'WITHDRAW' && !selectedAccountId) { toast.error("Selecciona cuenta destino"); return; }

        try {
            await handleGoalTransaction(goalId, amount, type, selectedAccountId ? parseInt(selectedAccountId) : undefined);
            toast.success(type === 'DEPOSIT' ? "¡Depósito registrado! 🚀" : "Retiro registrado 📉");
            setTransactionAmount('');
            setExpandedGoalId(null);
            onUpdate();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error en transacción");
        }
    }

    async function handleSmartDelete(goal: Goal) {
        if (goal.currentAmount > 0) {
            setReclaimModal({ isOpen: true, goal });
            setReclaimAccountId('');
        } else {
            handleDelete(goal.id);
        }
    }

    async function executeReclaim() {
        if (!reclaimModal.goal || !reclaimAccountId) { toast.error("Selecciona una cuenta"); return; }
        setIsReclaiming(true);
        try {
            await deleteGoalWithReclaim(reclaimModal.goal.id, parseInt(reclaimAccountId));
            const isSuccess = (reclaimModal.goal.currentAmount / reclaimModal.goal.targetAmount) >= 0.99;
            if (isSuccess) {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#fdf2f8', '#f472b6'] });
                toast.success("¡Meta alcanzada y fondos reclamados 🎉");
            } else {
                toast.success("Fondos recuperados 💰");
            }
            onUpdate();
            setReclaimModal({ isOpen: false, goal: null });
        } catch {
            toast.error("Error al reclamar");
        } finally {
            setIsReclaiming(false);
        }
    }

    async function handlePause(goal: Goal) {
        try {
            await toggleGoalPaused(goal.id);
            toast.success(goal.isPaused ? "Meta reanudada ▶️" : "Meta pausada ⏸️");
            onUpdate();
        } catch {
            toast.error("Error al pausar");
        }
    }

    // ─── GOAL CARD ────────────────────────────────────────────────────
    function GoalCard({ goal }: { goal: Goal }) {
        const percentage = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
        const catInfo = getCategoryInfo((goal as any).category);
        const CatIcon = catInfo.icon;
        const stage = getStage(percentage);
        const priorityColors: Record<string, string> = {
            'HIGH': 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
            'MEDIUM': 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
            'LOW': 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        };
        const priorityLabel: Record<string, string> = { 'HIGH': 'Alta', 'MEDIUM': 'Media', 'LOW': 'Baja' };

        return (
            <div className={`bg-white dark:bg-zinc-900/50 border ${goal.isPaused ? 'border-zinc-300 dark:border-zinc-700 opacity-70' : percentage >= 100 ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'} p-6 rounded-[2.5rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all`}>
                {/* Paused overlay */}
                {goal.isPaused && (
                    <div className="absolute top-4 right-4 z-10">
                        <span className="text-[10px] font-black bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-2 py-1 rounded-full uppercase">Pausada</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catInfo.color}`}>
                            <CatIcon size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight">{goal.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${priorityColors[goal.priority || 'MEDIUM']}`}>
                                    {priorityLabel[goal.priority || 'MEDIUM']}
                                </span>
                                <span className={`text-[10px] font-bold ${stage.color}`}>{stage.label}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => openHistory(goal)} className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors" title="Historial">
                            <HistoryIcon size={16} />
                        </button>
                        <button onClick={() => handlePause(goal)} className="p-2 text-zinc-400 hover:text-amber-500 transition-colors" title={goal.isPaused ? "Reanudar" : "Pausar"}>
                            {goal.isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
                        </button>
                        <button onClick={() => openEditGoalModal(goal)} className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"><PencilIcon size={16} /></button>
                        <button onClick={() => handleSmartDelete(goal)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2Icon size={16} /></button>
                    </div>
                </div>

                {/* Amount */}
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

                {/* Progress bar with milestones */}
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
                        {/* Milestones */}
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

                {/* Notes */}
                {(goal as any).notes && (
                    <p className="text-xs text-zinc-400 mb-3 italic">"{(goal as any).notes}"</p>
                )}

                {/* Deadline */}
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

                {/* Completed button */}
                {percentage >= 100 && (
                    <button onClick={() => handleSmartDelete(goal)} className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-400 to-teal-500 text-white font-black hover:scale-105 transition-all shadow-lg animate-pulse flex items-center justify-center gap-2 mb-3">
                        🎉 ¡Reclamar!
                    </button>
                )}

                {/* Actions */}
                {percentage < 100 && !goal.isPaused && (
                    expandedGoalId === goal.id ? (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl animate-in fade-in slide-in-from-top-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase">Gestionar Fondos</span>
                                <button onClick={() => setExpandedGoalId(null)} className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-800"><XIcon size={14} /></button>
                            </div>
                            <div className="flex items-center gap-2 mb-3 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                                <span className="text-zinc-400 font-bold pl-2">$</span>
                                <SmartMoneyInput selectOnFocus={false} value={transactionAmount} onMoneyChange={setTransactionAmount} className="w-full bg-transparent outline-none font-bold text-lg text-zinc-900 dark:text-white" placeholder="0.00" />
                            </div>
                            <div className="mb-3">
                                {goal.type === 'FIXED' && goal.sourceAccountId ? (
                                    <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex justify-between items-center opacity-75">
                                        <span className="text-xs font-bold text-zinc-400">De: {accounts.find(a => a.id === goal.sourceAccountId)?.name}</span>
                                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-500">Vinculada</span>
                                    </div>
                                ) : (
                                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none">
                                        <option value="">Cuenta...</option>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleTransaction(goal.id, goal.currentAmount, 'DEPOSIT')} className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all">Depositar</button>
                                <button onClick={() => handleTransaction(goal.id, goal.currentAmount, 'WITHDRAW')} className="p-3 bg-white dark:bg-zinc-800 hover:bg-red-50 text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl font-bold text-sm transition-all">Retirar</button>
                            </div>
                        </div>
                    ) : (
                        goal.type === 'FIXED' && goal.contributionAmount ? (
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { if (goal.sourceAccountId) { handleGoalTransaction(goal.id, Number(goal.contributionAmount), 'DEPOSIT', goal.sourceAccountId).then(() => { toast.success(`Cuota de $${goal.contributionAmount} pagada 🚀`); confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } }); onUpdate(); }).catch((err: any) => toast.error(err.message)); } else { setExpandedGoalId(goal.id); setTransactionAmount(Number(goal.contributionAmount || 0).toFixed(2)); } }} className="py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-lg hover:scale-[1.02] active:scale-[0.98]">
                                    <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> Pagar Cuota</span>
                                    <span className="text-xs opacity-80">${Number(goal.contributionAmount).toFixed(2)}</span>
                                </button>
                                <button onClick={() => { setExpandedGoalId(goal.id); setTransactionAmount(''); if (goal.sourceAccountId) setSelectedAccountId(goal.sourceAccountId.toString()); }} className="py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-bold text-sm transition-all flex flex-col items-center gap-1 border border-dashed border-zinc-200 dark:border-zinc-700">
                                    <span className="flex items-center gap-1.5"><PlusIcon size={14} /> Abonar Extra</span>
                                    <span className="text-xs opacity-80">Otra cantidad</span>
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => { setExpandedGoalId(goal.id); setTransactionAmount(''); }} className="w-full py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-dashed border-zinc-200 dark:border-zinc-700">
                                <PlusIcon size={18} /> Agregar / Retirar
                            </button>
                        )
                    )
                )}
            </div>
        );
    }

    // ─── MAIN RETURN ──────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-linear-to-br from-[#FF62BB] to-[#FF97D0] dark:from-[#3a1528] dark:to-[#2a1020] p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden border border-pink-200 dark:border-pink-900/40">
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-3xl font-black mb-2">Tus Metas</h2>
                    <p className="text-pink-100 dark:text-pink-300/60 font-medium">Visualiza, planea y alcanza tus sueños.</p>
                </div>
                <button onClick={openNewGoalModal} className="relative z-10 mt-6 md:mt-0 bg-white dark:bg-[#FF62BB] text-[#FF62BB] dark:text-white px-6 py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <PlusIcon size={24} /> Nueva Meta
                </button>
                <PiggyBankIcon className="absolute -bottom-6 -right-6 w-48 h-48 text-white opacity-10 rotate-12" />
            </div>

            {/* Goals grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                {goals.length === 0 && (
                    <div className="col-span-full py-20 text-center text-zinc-400">
                        <PiggyBankIcon size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-bold">Sin metas activas</p>
                        <p>¡Crea tu primera alcancía virtual hoy!</p>
                    </div>
                )}
            </div>

            {/* HISTORY MODAL */}
            {historyModal.isOpen && historyModal.goal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white">Historial</h3>
                                <p className="text-xs text-zinc-400">{historyModal.goal.name}</p>
                            </div>
                            <button onClick={() => setHistoryModal({ isOpen: false, goal: null })} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><XIcon size={16} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 min-h-0">
                            {loadingHistory ? (
                                <div className="text-center py-8 text-zinc-400">Cargando...</div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-8 text-zinc-400">
                                    <HistoryIcon size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Sin transacciones aún</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${tx.type === 'DEPOSIT' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-red-100 dark:bg-red-500/20 text-red-600'}`}>
                                                    {tx.type === 'DEPOSIT' ? '+' : '-'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                                        {tx.type === 'DEPOSIT' ? 'Depósito' : 'Retiro'}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-400">
                                                        {new Date(tx.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-black text-sm ${tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* RECLAIM MODAL */}
            {reclaimModal.isOpen && reclaimModal.goal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-200">
                        <div className="mb-6 flex justify-center">
                            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full animate-bounce"><PiggyBankIcon size={48} /></div>
                        </div>
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">¡Romper Alcancía!</h3>
                        <p className="text-zinc-500 mb-6 font-medium">Eliminar meta <strong>{reclaimModal.goal.name}</strong> con fondos acumulados.</p>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl mb-6">
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Monto a Recuperar</p>
                            <p className="text-4xl font-black text-emerald-500">${reclaimModal.goal.currentAmount.toFixed(2)}</p>
                        </div>
                        <div className="mb-8 text-left">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-2 mb-2 block">¿A dónde?</label>
                            <select value={reclaimAccountId} onChange={e => setReclaimAccountId(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none">
                                <option value="">Cuenta...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setReclaimModal({ isOpen: false, goal: null })} className="p-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">Cancelar</button>
                            <button onClick={executeReclaim} disabled={!reclaimAccountId || isReclaiming} className="p-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isReclaiming ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>Procesando...</span></> : <span>Reclamar</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{editingGoalId ? 'Editar Meta' : 'Nueva Meta'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><XIcon size={20} /></button>
                        </div>

                        <div className="space-y-5">
                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-2 mb-2 block">Categoría</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {GOAL_CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <button key={cat.id} onClick={() => setForm({ ...form, category: cat.id })} className={`p-3 rounded-xl text-center transition-all border-2 ${form.category === cat.id ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300'}`}>
                                                <Icon size={18} className={`mx-auto mb-1 ${form.category === cat.id ? 'text-pink-500' : 'text-zinc-400'}`} />
                                                <span className={`text-[10px] font-bold block ${form.category === cat.id ? 'text-pink-600' : 'text-zinc-400'}`}>{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Name + Amount */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Nombre</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent focus:border-pink-500 focus:bg-white dark:focus:bg-zinc-950 rounded-2xl px-5 py-3 font-bold text-lg outline-none transition-all mt-1" placeholder="Ej: Auto Nuevo" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Monto Objetivo</label>
                                    <SmartMoneyInput value={form.targetAmount} onMoneyChange={(val) => setForm({ ...form, targetAmount: val })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent focus:border-pink-500 focus:bg-white dark:focus:bg-zinc-950 rounded-2xl px-5 py-3 font-bold text-lg outline-none transition-all mt-1" placeholder="0.00" />
                                </div>
                            </div>

                            {/* Priority + Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2 mb-1 block">Prioridad</label>
                                    <div className="flex gap-2">
                                        {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                                            <button key={p} onClick={() => setForm({ ...form, priority: p })} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border-2 ${form.priority === p ? (p === 'HIGH' ? 'bg-red-500 border-red-500 text-white' : p === 'MEDIUM' ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}>
                                                {p === 'HIGH' ? 'Alta' : p === 'MEDIUM' ? 'Media' : 'Baja'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-2 mb-1 block">Tipo</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setForm({ ...form, type: 'VARIABLE' })} className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${form.type === 'VARIABLE' ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-black' : 'border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}>🐖 Flexible</button>
                                        <button onClick={() => setForm({ ...form, type: 'FIXED' })} className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${form.type === 'FIXED' ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-black' : 'border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}>📅 Fijo</button>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Notas</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent focus:border-pink-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all mt-1 resize-none" rows={2} placeholder="¿Para qué es esta meta?" />
                            </div>

                            {/* Calculator preview */}
                            {form.targetAmount && form.deadline && recommended && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                                        <CalculatorIcon size={16} />
                                        <span className="font-bold text-xs">Calculadora</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl"><p className="text-[9px] uppercase font-bold text-zinc-400">Mensual</p><p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">${recommended.monthly.toFixed(2)}</p></div>
                                        <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl"><p className="text-[9px] uppercase font-bold text-zinc-400">Quincenal</p><p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">${recommended.biweekly.toFixed(2)}</p></div>
                                        <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl"><p className="text-[9px] uppercase font-bold text-zinc-400">Semanal</p><p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">${recommended.weekly.toFixed(2)}</p></div>
                                    </div>
                                </div>
                            )}

                            {/* FIXED options */}
                            {form.type === 'FIXED' && (
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl space-y-3 animate-in fade-in">
                                    <p className="text-xs font-bold text-zinc-400 uppercase">Ahorro Automático</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 ml-2">Frecuencia</label>
                                            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full mt-1 bg-white dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none">
                                                <option value="WEEKLY">Semanal</option>
                                                <option value="BIWEEKLY">Quincenal</option>
                                                <option value="MONTHLY">Mensual</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 ml-2">Cuota ($)</label>
                                            <SmartMoneyInput selectOnFocus={false} value={form.contributionAmount} onMoneyChange={(val) => setForm({ ...form, contributionAmount: val })} className="w-full mt-1 bg-white dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none" placeholder="100" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 ml-2">Cuenta Origen</label>
                                        <select value={form.sourceAccountId} onChange={e => setForm({ ...form, sourceAccountId: e.target.value })} className="w-full mt-1 bg-white dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none">
                                            <option value="">Seleccionar...</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 ml-2">Cuenta Ahorro Destino</label>
                                        <select value={form.destinationAccountId} onChange={e => setForm({ ...form, destinationAccountId: e.target.value })} className="w-full mt-1 bg-white dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none">
                                            <option value="">Sin destino</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Deadline */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Fecha Límite</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent rounded-2xl px-5 py-3 font-bold text-lg outline-none mt-1" />
                            </div>

                            <button onClick={handleSave} className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                                {editingGoalId ? 'Guardar Cambios' : 'Crear Meta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
