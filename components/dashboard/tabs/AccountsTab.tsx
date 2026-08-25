'use client';

import { useState, useRef, useEffect } from 'react';
import { ProfileWithData } from '@/types';
type Account = ProfileWithData['accounts'][number];

import { deleteAccount } from '@/app/actions/budget';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { PlusIcon, WalletIcon, PiggyBankIcon, BanknoteIcon, EyeIcon, PencilIcon, Trash2Icon, LockIcon } from '@animateicons/react/lucide';
import { ArrowLeftRightIcon, MessageCircleMoreIcon } from '@animateicons/react/lucide';
import { Landmark } from 'lucide-react';
import { toast } from 'sonner';
import AccountWizard from '@/components/accounts/AccountWizard';
import TransferModal from '@/components/accounts/TransferModal';
import AccountHistoryModal from '@/components/accounts/AccountHistoryModal';

interface AccountsTabProps {
    accounts: Account[];
    profileId: number;
    onUpdate: () => void;
}

// ── Menú contextual de 3 puntos ────────────────────────────────────────────
function AccountMenu({
    account,
    onView,
    onEdit,
    onDelete,
}: {
    account: Account;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/30 text-white transition-all backdrop-blur-md"
                title="Opciones"
            >
                <MessageCircleMoreIcon className="w-5 h-5" />
            </button>

            {open && (
                <div className="absolute right-0 top-10 z-50 w-44 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <button
                        onClick={() => { setOpen(false); onView(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <EyeIcon className="w-4 h-4 text-indigo-500" />
                        Ver movimientos
                    </button>
                    <button
                        onClick={() => { setOpen(false); onEdit(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <PencilIcon className="w-4 h-4 text-amber-500" />
                        Editar cuenta
                    </button>
                    {account.name !== 'Efectivo' && (
                        <>
                            <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />
                            <button
                                onClick={() => { setOpen(false); onDelete(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2Icon className="w-4 h-4" />
                                Eliminar
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function AccountsTab({ accounts, profileId, onUpdate }: AccountsTabProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    // modal unificado: null = cerrado, 'movements' | 'settings' = pestaña inicial
    const [modalAccount, setModalAccount] = useState<Account | null>(null);
    const [modalTab, setModalTab] = useState<'movements' | 'settings'>('movements');

    const openModal = (acc: Account, tab: 'movements' | 'settings') => {
        setModalAccount(acc);
        setModalTab(tab);
    };

    const handleDelete = async (id: number) => {
        confirmDelete(async () => {
            await deleteAccount(id);
            toast.success('Cuenta eliminada');
            onUpdate();
        }, 'Eliminar cuenta', '¿Seguro que deseas eliminar esta cuenta?');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'BANK':    return <Landmark className="w-6 h-6 lucide-animated" />;
            case 'CASH':    return <BanknoteIcon className="w-6 h-6" />;
            case 'SAVINGS': return <PiggyBankIcon className="w-6 h-6" />;
            case 'WALLET':  return <WalletIcon className="w-6 h-6" />;
            default:        return <WalletIcon className="w-6 h-6" />;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'BANK':    return 'Banco';
            case 'CASH':    return 'Efectivo';
            case 'SAVINGS': return 'Ahorro';
            case 'WALLET':  return 'Billetera';
            default:        return type;
        }
    };

    // Agrupar por propósito
    const spendingAccounts = accounts.filter(acc => acc.purpose !== 'SAVINGS');
    const savingsAccounts = accounts.filter(acc => acc.purpose === 'SAVINGS');

    const totalSpending = spendingAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalBalance = totalSpending + totalSavings;

    const renderAccountCard = (acc: Account) => (
        <div
            key={acc.id}
            onClick={() => openModal(acc, 'movements')}
            className={`
                relative group overflow-hidden rounded-[2.5rem] p-8 shadow-lg
                hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1
                ${acc.type === 'BANK'
                    ? 'bg-gradient-to-br from-[#d1ecf1] to-[#a8d4ec] dark:from-[#1591DC] dark:to-[#2C5EAD] text-[#2C5EAD] dark:text-white'
                    : ''}
                ${acc.type === 'CASH'
                    ? 'bg-gradient-to-br from-[#d4edda] to-[#b0d9ba] dark:from-[#519A66] dark:to-[#237227] text-[#237227] dark:text-white'
                    : ''}
                ${acc.type === 'WALLET'
                    ? 'bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] dark:from-[#0B0909] dark:to-[#1a1a1a] text-[#0B0909] dark:text-[#FFBF00]'
                    : ''}
                ${acc.type === 'SAVINGS'
                    ? 'bg-gradient-to-br from-[#ffe4f1] to-[#ffd6ea] dark:from-[#FF62BB] dark:to-[#FF97D0] text-[#d44d94] dark:text-white'
                    : ''}
                ${!['BANK','CASH','WALLET','SAVINGS'].includes(acc.type)
                    ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white' : ''}
            `}
        >
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/20 dark:bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/5 dark:bg-black/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                {/* Fila superior: ícono + menú */}
                <div className="flex justify-between items-start">
                    <div className="p-3 rounded-2xl bg-black/10 dark:bg-white/20 backdrop-blur-md">
                        {getIcon(acc.type)}
                    </div>
                    <AccountMenu
                        account={acc}
                        onView={() => openModal(acc, 'movements')}
                        onEdit={() => openModal(acc, 'settings')}
                        onDelete={() => handleDelete(acc.id)}
                    />
                </div>

                {/* Contenido */}
                <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                        {getTypeName(acc.type)}
                    </p>
                    <h3 className="text-xl font-bold truncate mb-2">{acc.name}</h3>
                    <p className="text-3xl font-black tracking-tight">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    {acc.lockDate && new Date(acc.lockDate) > new Date() && (
                        <p className="text-xs mt-2 opacity-70 flex items-center gap-1.5">
                            <LockIcon size={12} />
                            Bloqueado hasta {new Date(acc.lockDate).toLocaleDateString('es-ES')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pt-6">

            {/* ── Encabezado ── */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Cuentas y Efectivo</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Total disponible:
                        <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 text-xl">
                            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTransferring(true)}
                        className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700"
                    >
                        <ArrowLeftRightIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Transferir</span>
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-bold hover:opacity-80 transition-all"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Cuenta</span>
                        <span className="sm:hidden">Nueva</span>
                    </button>
                </div>
            </div>

            {/* ── Modales ── */}
            {isCreating && (
                <AccountWizard
                    profileId={profileId}
                    onClose={() => setIsCreating(false)}
                    onSuccess={() => { setIsCreating(false); onUpdate(); }}
                />
            )}

            {isTransferring && (
                <TransferModal
                    accounts={accounts}
                    onClose={() => setIsTransferring(false)}
                    onSuccess={onUpdate}
                />
            )}

            {modalAccount && (
                <AccountHistoryModal
                    account={modalAccount}
                    initialTab={modalTab}
                    onClose={() => setModalAccount(null)}
                    onUpdate={onUpdate}
                />
            )}

            {/* ── Sección: Cuentas (SPENDING) ── */}
            {spendingAccounts.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-200">Cuentas</h3>
                        <span className="text-sm font-bold text-zinc-400">
                            ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {spendingAccounts.map(renderAccountCard)}
                    </div>
                </div>
            )}

            {/* ── Sección: Ahorros (SAVINGS) ── */}
            {savingsAccounts.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-200">Ahorros</h3>
                        <span className="text-sm font-bold text-zinc-400">
                            ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {savingsAccounts.map(renderAccountCard)}
                    </div>
                </div>
            )}

            {/* Estado vacío */}
            {accounts.length === 0 && !isCreating && (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Landmark className="w-10 h-10 text-zinc-300 lucide-animated" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Sin cuentas activas</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mb-6">
                        Agrega tu primera cuenta bancaria o de efectivo para empezar a llevar el control.
                    </p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                        Crear Cuenta
                    </button>
                </div>
            )}
        </div>
    );
}
