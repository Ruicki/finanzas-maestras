'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ProfileWithData } from '@/types';

type Goal = ProfileWithData['goals'][number];
type Account = ProfileWithData['accounts'][number];
import { createGoal, deleteGoal, updateGoal, deleteGoalWithReclaim, toggleGoalPaused, getGoalTransactions } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import EmptyState from '@/components/shared/EmptyState';
import { useScrollLock } from '@/hooks/useScrollLock';
import { PiggyBankIcon, PlusIcon } from '@animateicons/react/lucide';
import GoalCard from '@/components/goals/GoalCard';
import GoalHistoryModal, { type GoalTransactionRow } from '@/components/goals/GoalHistoryModal';
import GoalReclaimModal from '@/components/goals/GoalReclaimModal';
import GoalFormModal from '@/components/goals/GoalFormModal';
import { parseDateOnly, formatDateOnly } from '@/lib/dates';

interface GoalsTabProps {
    goals: Goal[];
    accounts: Account[];
    profileId: number;
    onUpdate: () => void;
}

export default function GoalsTab({ goals, accounts, profileId, onUpdate }: GoalsTabProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reclaimModal, setReclaimModal] = useState<{ isOpen: boolean; goal: Goal | null }>({ isOpen: false, goal: null });
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; goal: Goal | null }>({ isOpen: false, goal: null });
    const [transactions, setTransactions] = useState<GoalTransactionRow[]>([]);
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
    const [reclaimAccountId, setReclaimAccountId] = useState('');
    const [isReclaiming, setIsReclaiming] = useState(false);

    const [recommended, setRecommended] = useState<{ monthly: number; biweekly: number; weekly: number } | null>(null);

    useEffect(() => {
        if (form.targetAmount && form.deadline) {
            const target = parseFloat(form.targetAmount) || 0;
            const deadlineDate = parseDateOnly(form.deadline);
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
            deadline: formatDateOnly(goal.deadline),
            type: goal.type,
            frequency: goal.frequency || 'MONTHLY',
            contributionAmount: Number(goal.contributionAmount || 0).toFixed(2),
            priority: goal.priority || 'MEDIUM',
            category: goal.category || 'SAVINGS',
            notes: goal.notes || '',
            sourceAccountId: goal.sourceAccountId?.toString() || '',
            destinationAccountId: goal.destinationAccountId?.toString() || ''
        });
        setIsModalOpen(true);
    }

    async function openHistory(goal: Goal) {
        setHistoryModal({ isOpen: true, goal });
        setLoadingHistory(true);
        try {
            const txs = await getGoalTransactions(goal.id);
            setTransactions(txs);
        } catch (error) {
            setTransactions([]);
            toast.error(error instanceof Error ? error.message : 'No se pudo cargar el historial');
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
            deadline: form.deadline ? parseDateOnly(form.deadline) : undefined,
            profileId,
            type: form.type,
            frequency: form.type === 'FIXED' ? form.frequency : null,
            contributionAmount: form.type === 'FIXED' && form.contributionAmount ? parseFloat(form.contributionAmount) : null,
            priority: form.priority,
            category: form.category,
            notes: form.notes || null,
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
        } catch {
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-linear-to-br from-indigo-600 to-indigo-500 dark:from-indigo-800 dark:to-indigo-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden border border-indigo-200 dark:border-indigo-900/40">
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="font-title text-2xl md:text-3xl font-semibold mb-2">Tus Metas</h2>
                    <p className="text-white/75 font-medium">Visualiza, planea y alcanza tus sueños.</p>
                </div>
                <button onClick={openNewGoalModal} className="relative z-10 mt-6 md:mt-0 bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <PlusIcon size={24} /> Nueva Meta
                </button>
                <PiggyBankIcon className="absolute -bottom-6 -right-6 w-48 h-48 text-white opacity-10 rotate-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        accounts={accounts}
                        isExpanded={expandedGoalId === goal.id}
                        onToggleExpand={setExpandedGoalId}
                        onOpenHistory={openHistory}
                        onPause={handlePause}
                        onOpenEdit={openEditGoalModal}
                        onSmartDelete={handleSmartDelete}
                        onRefresh={onUpdate}
                    />
                ))}
                {goals.length === 0 && (
                    <EmptyState
                        icon={<PiggyBankIcon size={36} />}
                        title="Sin metas todavía"
                        description="Una meta es una alcancía virtual: le pones nombre, cuánto quieres juntar y de qué cuenta sale el dinero. La app lleva la cuenta de cuánto te falta."
                        actionLabel="Crear mi primera meta"
                        onAction={openNewGoalModal}
                    />
                )}
            </div>
            {historyModal.isOpen && historyModal.goal && (
                <GoalHistoryModal
                    nombreMeta={historyModal.goal.name}
                    movimientos={transactions}
                    cargando={loadingHistory}
                    onClose={() => setHistoryModal({ isOpen: false, goal: null })}
                />
            )}

            {reclaimModal.isOpen && reclaimModal.goal && (
                <GoalReclaimModal
                    meta={reclaimModal.goal}
                    cuentas={accounts}
                    cuentaId={reclaimAccountId}
                    onCuentaId={setReclaimAccountId}
                    procesando={isReclaiming}
                    onConfirmar={executeReclaim}
                    onClose={() => setReclaimModal({ isOpen: false, goal: null })}
                />
            )}

            {isModalOpen && (
                <GoalFormModal
                    editando={editingGoalId !== null}
                    form={form}
                    setForm={setForm}
                    cuentas={accounts}
                    recomendado={recommended}
                    onGuardar={handleSave}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
}
