'use client';

import { useState, useEffect } from 'react';
import {
    getAccountTransactions,
    adjustAccountBalance,
    updateAccount,
} from '@/app/actions/budget';
import {
    X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, DollarSign,
    Calendar, RefreshCw, ListOrdered, SlidersHorizontal, AlertCircle,
    TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useScrollLock } from '@/hooks/useScrollLock';

interface AccountHistoryModalProps {
    account: any;
    initialTab?: 'movements' | 'settings';
    onClose: () => void;
    onUpdate: () => void;
}

export default function AccountHistoryModal({
    account,
    initialTab = 'movements',
    onClose,
    onUpdate,
}: AccountHistoryModalProps) {
    const [activeTab, setActiveTab] = useState<'movements' | 'settings'>(initialTab);

    // ── Movimientos ────────────────────────────────────────────────────────
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // ── Corrección de saldo ────────────────────────────────────────────────
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [newBalance, setNewBalance] = useState(account.balance.toString());
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [savingAdjust, setSavingAdjust] = useState(false);

    // ── Configuración ──────────────────────────────────────────────────────
    const [editName, setEditName] = useState(account.name);
    const [editLockDate, setEditLockDate] = useState(
        account.lockDate ? new Date(account.lockDate).toISOString().split('T')[0] : ''
    );
    const [savingEdit, setSavingEdit] = useState(false);

    useScrollLock(true);

    useEffect(() => {
        loadHistory();
    }, [account.id]);

    async function loadHistory() {
        setLoadingHistory(true);
        try {
            const data = await getAccountTransactions(account.id);
            setTransactions(data);
        } catch {
            toast.error('No se pudo cargar el historial');
        } finally {
            setLoadingHistory(false);
        }
    }

    async function handleAdjustBalance() {
        const val = parseFloat(newBalance);
        if (isNaN(val) || val < 0) { toast.error('Ingresa un monto válido'); return; }
        if (!adjustmentReason.trim()) { toast.error('Escribe una razón para el ajuste'); return; }
        setSavingAdjust(true);
        try {
            await adjustAccountBalance(account.id, val, adjustmentReason);
            toast.success('Saldo corregido correctamente');
            setIsAdjusting(false);
            onUpdate();
            onClose();
        } catch {
            toast.error('No se pudo corregir el saldo');
        } finally {
            setSavingAdjust(false);
        }
    }

    async function handleSaveEdit() {
        if (!editName.trim()) { toast.error('El nombre no puede estar vacío'); return; }
        const val = parseFloat(newBalance);
        if (isNaN(val) || val < 0) { toast.error('Ingresa un saldo válido'); return; }
        setSavingEdit(true);
        try {
            await updateAccount(account.id, {
                name: editName,
                balance: val,
                lockDate: editLockDate ? new Date(editLockDate) : undefined,
            });
            toast.success('Cuenta actualizada');
            onUpdate();
            onClose();
        } catch {
            toast.error('No se pudo actualizar la cuenta');
        } finally {
            setSavingEdit(false);
        }
    }

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });

    const txTypeLabel: Record<string, string> = {
        INCOME: 'Ingreso', EXPENSE: 'Gasto', SALARY: 'Salario',
        TRANSFER_IN: 'Transferencia recibida', TRANSFER_OUT: 'Transferencia enviada',
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'INCOME':       return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
            case 'EXPENSE':      return <ArrowUpRight className="w-5 h-5 text-red-500" />;
            case 'TRANSFER_IN':  return <ArrowRightLeft className="w-5 h-5 text-emerald-500" />;
            case 'TRANSFER_OUT': return <ArrowRightLeft className="w-5 h-5 text-red-500" />;
            case 'SALARY':       return <DollarSign className="w-5 h-5 text-emerald-500" />;
            default:             return <RefreshCw className="w-5 h-5 text-zinc-400" />;
        }
    };

    const isIncome = (type: string) =>
        type === 'INCOME' || type === 'SALARY' || type === 'TRANSFER_IN';

    // Color de fondo de la cabecera según tipo de cuenta
    const headerBg: Record<string, string> = {
        BANK:    'from-zinc-900 to-zinc-700',
        CASH:    'from-emerald-500 to-teal-700',
        WALLET:  'from-purple-600 to-indigo-800',
        SAVINGS: 'from-pink-500 to-rose-700',
    };
    const bg = headerBg[account.type] || 'from-zinc-700 to-zinc-900';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

                {/* ── Cabecera con gradiente ── */}
                <div className={`bg-gradient-to-br ${bg} p-6 text-white relative overflow-hidden shrink-0`}>
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                                {account.type === 'BANK' ? 'Banco' :
                                 account.type === 'CASH' ? 'Efectivo' :
                                 account.type === 'WALLET' ? 'Billetera' : 'Ahorro'}
                            </p>
                            <h2 className="text-2xl font-black mb-1">{account.name}</h2>
                            <p className="text-3xl font-black">
                                ${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Pestañas ── */}
                <div className="flex border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${
                            activeTab === 'movements'
                                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                    >
                        <ListOrdered className="w-4 h-4" />
                        Movimientos
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${
                            activeTab === 'settings'
                                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Configuración
                    </button>
                </div>

                {/* ── Contenido ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ══ PESTAÑA: MOVIMIENTOS ══ */}
                    {activeTab === 'movements' && (
                        <div className="flex flex-col h-full">

                            {/* Corrección de saldo */}
                            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                                {!isAdjusting ? (
                                    <button
                                        onClick={() => setIsAdjusting(true)}
                                        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors"
                                    >
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        ¿El saldo no coincide con tu banco? Corrígelo aquí
                                    </button>
                                ) : (
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 animate-in slide-in-from-top-2">
                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
                                            Corrección de saldo
                                        </p>
                                        <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mb-3">
                                            Usa esto solo si el saldo real en tu banco es diferente al que aparece aquí.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={newBalance}
                                                    onChange={e => setNewBalance(e.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2.5 pl-7 font-bold outline-none focus:ring-2 ring-amber-400"
                                                    placeholder="Saldo real"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={adjustmentReason}
                                                onChange={e => setAdjustmentReason(e.target.value)}
                                                className="flex-1 bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-amber-400"
                                                placeholder="Razón (ej: Corrección banco)"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setIsAdjusting(false)}
                                                className="text-xs font-bold text-zinc-500 hover:text-zinc-700 px-3 py-2"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleAdjustBalance}
                                                disabled={savingAdjust}
                                                className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                {savingAdjust ? 'Guardando...' : 'Guardar corrección'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Lista de transacciones */}
                            <div className="flex-1 bg-zinc-50 dark:bg-black/10">
                                {loadingHistory ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                                        <Calendar className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="font-semibold">Sin movimientos aún</p>
                                        <p className="text-xs mt-1 opacity-70">Los gastos e ingresos de esta cuenta aparecerán aquí</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {transactions.map((tx, idx) => (
                                            <div
                                                key={`${tx.type}-${tx.id}-${idx}`}
                                                className="flex items-center justify-between px-5 py-4 hover:bg-white dark:hover:bg-zinc-800/60 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                        isIncome(tx.type)
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/20'
                                                            : 'bg-red-100 dark:bg-red-900/20'
                                                    }`}>
                                                        {getIcon(tx.type)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">
                                                            {tx.name || tx.description || 'Movimiento'}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <span className="text-xs text-zinc-400">{formatDate(tx.date)}</span>
                                                            <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                                            <span className="text-xs text-zinc-400">{txTypeLabel[tx.type] || tx.type}</span>
                                                            {tx.relatedAccountName && (
                                                                <>
                                                                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                                                    <span className="text-xs text-zinc-400">
                                                                        {tx.type === 'TRANSFER_IN' ? '← ' : '→ '}{tx.relatedAccountName}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`font-bold tabular-nums text-sm shrink-0 ml-4 ${
                                                    isIncome(tx.type)
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-red-500 dark:text-red-400'
                                                }`}>
                                                    {isIncome(tx.type) ? '+' : '-'}${tx.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ PESTAÑA: CONFIGURACIÓN ══ */}
                    {activeTab === 'settings' && (
                        <div className="p-6 space-y-5 animate-in fade-in duration-200">

                            {/* Nombre */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    Nombre de la cuenta
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    disabled={account.name === 'Efectivo'}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-4 text-lg font-bold outline-none focus:border-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Ej: Banco General"
                                />
                                {account.name === 'Efectivo' && (
                                    <p className="text-xs text-amber-500">
                                        El nombre de la cuenta de efectivo no se puede cambiar.
                                    </p>
                                )}
                            </div>

                            {/* Saldo — editable para todas las cuentas */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    Saldo actual
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
                                    <input
                                        type="number"
                                        value={newBalance}
                                        onChange={e => setNewBalance(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-4 pl-8 text-lg font-bold outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                                {(() => {
                                    const original = Number(account.balance);
                                    const current = parseFloat(newBalance);
                                    if (isNaN(current)) return null;
                                    const diff = current - original;
                                    if (Math.abs(diff) < 0.01) return (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1.5">
                                            <Minus className="w-3.5 h-3.5" />
                                            Sin cambios
                                        </div>
                                    );
                                    const isUp = diff > 0;
                                    return (
                                        <div className={`flex items-center gap-1.5 text-xs font-bold mt-1.5 ${
                                            isUp ? 'text-emerald-600' : 'text-red-500'
                                        }`}>
                                            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            <span>{isUp ? '+' : ''}{diff.toFixed(2)}</span>
                                            <span className="font-normal opacity-70">
                                                {isUp ? 'más que antes' : 'menos que antes'}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Fecha de bloqueo — solo SAVINGS */}
                            {account.type === 'SAVINGS' && (
                                <div className="space-y-1.5 bg-pink-50 dark:bg-pink-900/10 p-4 rounded-2xl border border-pink-100 dark:border-pink-900/30">
                                    <label className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                                        🔒 Bloquear retiros hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={editLockDate}
                                        onChange={e => setEditLockDate(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border-2 border-pink-200 dark:border-pink-900/50 rounded-xl p-4 font-bold outline-none focus:border-pink-500 transition-colors"
                                    />
                                    <p className="text-xs text-pink-500">
                                        No podrás usar este dinero para gastos hasta esa fecha. Solo depósitos.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
