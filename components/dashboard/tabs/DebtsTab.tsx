'use client';

import React, { useState } from 'react';
import { ProfileWithData } from '@/types';

type CreditCard = ProfileWithData['creditCards'][number];
type Loan = ProfileWithData['loans'][number];
type Account = ProfileWithData['accounts'][number];
import { Plus, CreditCard as CardIcon, Building, Flag, X, Calendar, TrendingDown, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { createLoan, deleteLoan, payLoan, updateLoan, CreateLoanInput } from '@/app/actions/debts';
import { createCreditCard, deleteCreditCard, payCreditCard, updateCreditCardDetails } from '@/app/actions/budget';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';
import { useScrollLock } from '@/hooks/useScrollLock';
import UltimateCreditCard from '@/components/cards/UltimateCreditCard';
import BankLoanCard from '@/components/cards/BankLoanCard';
import FriendLoanCard from '@/components/cards/FriendLoanCard';
import PaymentModal from '@/components/shared/PaymentModal';
import CreditCardWizard from '@/components/shared/CreditCardWizard';
import { formatMoney } from '@/lib/utils';
import {
    calculateLoanPayoffDate
} from '@/lib/financial-engine';

type DebtsTabProps = {
    creditCards: CreditCard[];
    loans: Loan[];
    accounts: Account[];
    profileId: number;
    profileName: string;
    onUpdate: () => void;
};

export default function DebtsTab({ creditCards, loans, accounts, profileId, profileName, onUpdate }: DebtsTabProps) {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<'CARD' | 'LOAN'>('CARD');
    const [editingId, setEditingId] = useState<number | null>(null); // EDIT STATE
    const [showCardWizard, setShowCardWizard] = useState(false);

    // For Loans Wizard
    const [loanWizardMode, setLoanWizardMode] = useState<'BANK' | 'FRIEND'>('BANK');
    const [friendHasInterest, setFriendHasInterest] = useState(false);

    // Modal de Pago
    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; type: 'CARD' | 'LOAN'; id: number; name: string; maxAmount: number } | null>(null);
    const [payingCard, setPayingCard] = useState<CreditCard | null>(null);

    useScrollLock(isWizardOpen || !!paymentModal?.isOpen);

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');

    // Estado del Formulario del Asistente
    const [loanForm, setLoanForm] = useState<CreateLoanInput>({
        name: '', lender: '', type: 'PERSONAL', totalAmount: 0, currentBalance: 0,
        interestRate: 0, termMonths: 12, monthlyPayment: 0, paymentDay: 15, isAutomatic: false, profileId
    });

    // Formulario Tarjeta Simplificado
    const [cardForm, setCardForm] = useState({
        name: '',
        limit: '',
        initialBalance: '',
        cutoffDay: '',
        paymentDay: '',
        interestRate: '',
        hasAnnualFee: false,
        annualFee: '',
        annualFeeMonth: '1',
    });

    const [submitting, setSubmitting] = useState(false);

    // --- MANEJADORES DE EDICIÓN ---
    function openEditLoan(loan: Loan) {
        setEditingId(loan.id);
        const isFriend = loan.type === 'PERSONAL' || loan.lender !== loan.name; // Simple heuristic
        setWizardType('LOAN');
        setLoanWizardMode(isFriend ? 'FRIEND' : 'BANK');
        setFriendHasInterest(Number(loan.interestRate) > 0);

        setLoanForm({
            name: loan.name,
            lender: loan.lender || loan.name,
            type: loan.type,
            totalAmount: Number(loan.totalAmount),
            currentBalance: Number(loan.currentBalance),
            interestRate: Number(loan.interestRate) || 0,
            termMonths: Number(loan.termMonths) || 0,
            monthlyPayment: Number(loan.monthlyPayment) || 0,
            paymentDay: loan.paymentDay || 15,
            isAutomatic: loan.isAutomatic || false,
            profileId
        });
        setIsWizardOpen(true);
    }

    function openEditCard(card: CreditCard) {
        setEditingId(card.id);
        setWizardType('CARD');
        setCardForm({
            name: card.name,
            limit: card.limit.toString(),
            initialBalance: '', // No editar saldo inicial al editar
            cutoffDay: card.cutoffDay.toString(),
            paymentDay: card.paymentDay.toString(),
            interestRate: card.interestRate?.toString() || '',
            hasAnnualFee: !!card.annualFee,
            annualFee: card.annualFee?.toString() || '',
            annualFeeMonth: card.annualFeeMonth?.toString() || '1',
        });
        setIsWizardOpen(true);
    }

    function resetForms() {
        setEditingId(null);
        setLoanForm({
            name: '', lender: '', type: 'PERSONAL', totalAmount: 0, currentBalance: 0,
            interestRate: 0, termMonths: 12, monthlyPayment: 0, paymentDay: 15, isAutomatic: false, profileId
        });
        setCardForm({
            name: '', limit: '', initialBalance: '', cutoffDay: '', paymentDay: '',
            interestRate: '', hasAnnualFee: false, annualFee: '', annualFeeMonth: '1',
        });
    }


    // --- CÁLCULOS GLOBALES ---
    const totalCardDebt = creditCards.reduce((acc, c) => acc + c.balance, 0);
    const totalLoanDebt = loans.reduce((acc, l) => acc + l.currentBalance, 0);
    const totalDebt = totalCardDebt + totalLoanDebt;

    // Calcular Fecha de Libertad (Max Payoff Date)
    const getFreedomDate = () => {
        let maxDate = new Date();

        loans.forEach(loan => {
            const payoff = calculateLoanPayoffDate(Number(loan.currentBalance), Number(loan.interestRate) || 0, Number(loan.monthlyPayment) || 0);
            if (payoff && payoff > maxDate) maxDate = payoff;
        });

        if (totalDebt === 0) return new Date();

        return maxDate;
    };

    const freedomDate = getFreedomDate();
    const isDebtFree = totalDebt === 0;


    // --- MANEJADORES: CREAR / EDITAR ---
    async function handleSave() {
        if (!profileId) return;
        setSubmitting(true);
        try {
            if (wizardType === 'CARD') {
                if (!cardForm.name || !cardForm.limit) { toast.error("Nombre y Límite requeridos"); return; }

                const cardData = {
                    name: cardForm.name,
                    limit: parseFloat(cardForm.limit),
                    cutoffDay: parseInt(cardForm.cutoffDay || '1'),
                    paymentDay: parseInt(cardForm.paymentDay || '1'),
                    interestRate: cardForm.interestRate ? parseFloat(cardForm.interestRate) : undefined,
                    annualFee: cardForm.hasAnnualFee && cardForm.annualFee ? parseFloat(cardForm.annualFee) : undefined,
                    annualFeeMonth: cardForm.hasAnnualFee ? parseInt(cardForm.annualFeeMonth) : undefined,
                    minPaymentPercentage: 3.0,
                    insuranceRate: 0.0,
                    // initialBalance only for create
                    initialBalance: (!editingId && cardForm.initialBalance) ? parseFloat(cardForm.initialBalance) : 0,
                    profileId
                };

                if (editingId) {
                    await updateCreditCardDetails(editingId, cardData);
                    toast.success("Tarjeta actualizada");
                } else {
                    await createCreditCard(cardData);
                    toast.success("Tarjeta creada");
                }

            } else {
                // LOAN
                if (!loanForm.name || !loanForm.totalAmount) { toast.error("Nombre y Monto requeridos"); return; }

                // Adjust input based on Mode
                const finalInterest = loanWizardMode === 'BANK'
                    ? loanForm.interestRate
                    : (friendHasInterest ? loanForm.interestRate : 0);

                const finalTerm = loanWizardMode === 'BANK'
                    ? loanForm.termMonths
                    : (friendHasInterest ? loanForm.termMonths : 0);

                const loanData = {
                    ...loanForm,
                    totalAmount: parseFloat(loanForm.totalAmount.toString()),
                    interestRate: finalInterest,
                    termMonths: finalTerm,
                    startDate: new Date(),
                    profileId
                };

                if (editingId) {
                    await updateLoan(editingId, loanData);
                    toast.success("Préstamo actualizado");
                } else {
                    await createLoan({
                        ...loanData,
                        currentBalance: parseFloat(loanForm.totalAmount.toString()), // Init balance = Total only on create
                    });
                    toast.success("Préstamo creado");
                }
            }
            onUpdate();
            setIsWizardOpen(false);
            resetForms();
        } catch (error) {
            toast.error("Error guardando registro");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    }

    // Wrapper for Create button click
    const startCreate = (type: 'CARD' | 'LOAN') => {
        resetForms();
        setWizardType(type);
        setIsWizardOpen(true);
    };

    // --- MANEJADORES: ELIMINAR ---
    async function handleDelete(id: number, type: 'CARD' | 'LOAN') {
        confirmDelete(async () => {
            // ...
            try {
                if (type === 'CARD') await deleteCreditCard(id);
                else await deleteLoan(id);
                onUpdate();
                toast.success("Eliminado correctamente");
            } catch (error) { toast.error("Error al eliminar"); }
        });
    }

    // --- MANEJADORES: PAGAR ---
    async function handlePay() {
        if (!paymentModal || (!paymentAmount && !['QuickPay'].includes(''))) {
            toast.warning("Ingresa un monto");
            return;
        }
        setSubmitting(true);
        try {
            const amount = parseFloat(paymentAmount);
            if (paymentModal.type === 'CARD') {
                if (!paymentAccountId) {
                    toast.error("Selecciona cuenta para tarjeta");
                    setSubmitting(false);
                    return;
                }
                await payCreditCard(paymentModal.id, amount, parseInt(paymentAccountId));
            } else {
                // Allow null account for Loans (Manual/Cash payment)
                await payLoan(paymentModal.id, amount, paymentAccountId ? parseInt(paymentAccountId) : null);
            }
            onUpdate();
            setPaymentModal(null);
            setPaymentAmount('');
            toast.success("Pago registrado");
        } catch (error) {
            toast.error("Error en el pago");
        } finally {
            setSubmitting(false);
        }
    }

    function quickPay(loan: Loan, amount: number) {
        // Find main account (fallback)
        if (accounts.length === 0) return toast.error("Necesitas una cuenta para pagar");
        const defaultAcc = accounts[0].id;

        // Auto-pay
        toast.promise(payLoan(loan.id, amount, defaultAcc).then(() => onUpdate()), {
            loading: 'Procesando Abono Rápido...',
            success: `Abonados $${amount} a ${loan.name}`,
            error: 'Error al abonar'
        });
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-6">
            {/* HERITAGE & FREEDOM HEADER */}
            <div className="flex flex-col xl:flex-row gap-6">
                {/* GLOBAL FREEDOM WIDGET */}
                <div className="flex-1 bg-zinc-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-1000"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-1">Tu Libertad Financiera</h3>
                                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-white to-zinc-400">
                                    {isDebtFree ? "¡Eres Libre!" : (isNaN(freedomDate.getTime()) ? "Calculando..." : freedomDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
                                </h2>
                            </div>
                            <div className="bg-zinc-800 p-3 rounded-2xl">
                                <Flag className={isDebtFree ? "text-emerald-400" : "text-purple-400"} />
                            </div>
                        </div>

                        <p className="text-zinc-500 font-medium max-w-md">
                            {isDebtFree
                                ? "¡Felicidades! No tienes deudas registradas."
                                : `Basado en tus pagos actuales, serás totalmente libre de deudas en esta fecha. ¡Sigue así!`}
                        </p>

                        {!isDebtFree && (
                            <div className="mt-6 flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-zinc-500 uppercase">Deuda Total</p>
                                    <p className="text-2xl font-black text-red-400">{formatMoney(totalDebt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-col justify-center gap-4">
                    <button onClick={() => { resetForms(); setShowCardWizard(true); }} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-4xl font-black hover:scale-105 transition-transform shadow-xl">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-full"><Plus size={20} /></div>
                        Nueva Tarjeta
                    </button>
                    <button onClick={() => startCreate('LOAN')} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-4xl font-black hover:scale-105 transition-transform shadow-xl">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full"><Plus size={20} /></div>
                        Nuevo Préstamo
                    </button>
                </div>
            </div>

            {/* --- SECCIÓN ULTIMATE LOANS --- */}
            {loans.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Building className="text-indigo-500" /> Mis Préstamos
                    </h3>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {loans.map(loan => {
                            const isBank = Number(loan.interestRate) > 0;
                            if (isBank) {
                                return (
                                    <BankLoanCard
                                        key={loan.id}
                                        loan={loan}
                                        onPay={() => setPaymentModal({ isOpen: true, type: 'LOAN', id: loan.id, name: loan.name, maxAmount: Number(loan.currentBalance) })}
                                        onDelete={() => handleDelete(loan.id, 'LOAN')}
                                        onEdit={() => openEditLoan(loan)}
                                    />
                                );
                            } else {
                                return (
                                    <FriendLoanCard
                                        key={loan.id}
                                        loan={loan}
                                        onPay={() => setPaymentModal({ isOpen: true, type: 'LOAN', id: loan.id, name: loan.name, maxAmount: Number(loan.currentBalance) })}
                                        onDelete={() => handleDelete(loan.id, 'LOAN')}
                                        onQuickPay={(l, amount) => quickPay(l, amount)}
                                        onEdit={() => openEditLoan(loan)}
                                    />
                                );
                            }
                        })}
                    </div>
                </div>
            )}


            {/* --- SECCIÓN DE TARJETAS (Existente) --- */}
            <div className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 opacity-50">
                    <CardIcon /> Tarjetas de Crédito
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
                    {creditCards.map(card => (
                        <div key={card.id} className="scale-90 origin-top-left">
                            <UltimateCreditCard
                                card={card}
                                cardholderName={profileName}
                                onPay={(c) => setPayingCard(c)}
                                onDelete={(id) => handleDelete(id, 'CARD')}
                                onEdit={() => openEditCard(card)}
                            />
                        </div>
                    ))}
                </div>
            </div>


            {/* --- WIZARD UNIFICADO --- */}
            {isWizardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col overflow-y-auto">
                        <button onClick={() => setIsWizardOpen(false)} className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200"><X size={20} /></button>

                        <h3 className="text-2xl font-black mb-1">
                            {editingId
                                ? (wizardType === 'CARD' ? 'Editar Tarjeta' : 'Editar Préstamo')
                                : (wizardType === 'CARD' ? 'Nueva Tarjeta' : 'Nuevo Préstamo')}
                        </h3>
                        <p className="text-zinc-500 text-sm font-bold mb-6">Registra tu pasivo para tomar control.</p>

                        {/* LOAN MODE SWITCHER */}
                        {wizardType === 'LOAN' && (
                            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-6">
                                <button onClick={() => setLoanWizardMode('BANK')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${loanWizardMode === 'BANK' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-zinc-400'}`}>
                                    🏛️ Banco / Entidad
                                </button>
                                <button onClick={() => setLoanWizardMode('FRIEND')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${loanWizardMode === 'FRIEND' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-zinc-400'}`}>
                                    👤 Amigo / Familia
                                </button>
                            </div>
                        )}

                        {wizardType === 'CARD' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Nombre (Ej: Visa)" value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none border-2 border-transparent focus:border-zinc-300" />
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                                        <SmartMoneyInput
                                            placeholder="Límite"
                                            value={cardForm.limit}
                                            onMoneyChange={(val) => setCardForm({ ...cardForm, limit: val })}
                                            className="w-full p-3 pl-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none border-2 border-transparent focus:border-zinc-300"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Deuda Anterior (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                                        <SmartMoneyInput
                                            placeholder="0.00"
                                            value={cardForm.initialBalance}
                                            onMoneyChange={(val) => setCardForm({ ...cardForm, initialBalance: val })}
                                            className="w-full p-3 pl-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none border-2 border-transparent focus:border-zinc-300"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Día Corte" value={cardForm.cutoffDay} onChange={e => setCardForm({ ...cardForm, cutoffDay: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none" />
                                    <input type="number" placeholder="Día Pago" value={cardForm.paymentDay} onChange={e => setCardForm({ ...cardForm, paymentDay: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none" />
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Tasa Interés"
                                        value={cardForm.interestRate}
                                        onChange={e => setCardForm({ ...cardForm, interestRate: e.target.value })}
                                        className="w-full p-3 pr-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">%</span>
                                </div>
                            </div>
                        ) : (
                            // LOAN DUAL FORM
                            <div className="space-y-6">
                                {/* Common Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">
                                            {loanWizardMode === 'BANK' ? "Institución Financiera" : "Nombre del Prestamista"}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={loanWizardMode === 'BANK' ? "Ej: Banco General" : "Ej: Mamá, Tío Juan"}
                                            value={loanForm.name}
                                            onChange={e => setLoanForm({ ...loanForm, name: e.target.value, lender: e.target.value })}
                                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Monto Total de la Deuda</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                                            <SmartMoneyInput
                                                placeholder="0.00"
                                                value={loanForm.totalAmount}
                                                onMoneyChange={(val) => setLoanForm({ ...loanForm, totalAmount: parseFloat(val) })}
                                                className="w-full p-3 pl-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500/20"
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-400 font-medium ml-1 mt-1">
                                            La cantidad original que te prestaron.
                                        </p>
                                    </div>
                                </div>

                                {loanWizardMode === 'BANK' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Tasa Anual</label>
                                                <div className="relative">
                                                    <SmartMoneyInput
                                                        placeholder="0.0"
                                                        value={loanForm.interestRate || ''}
                                                        onMoneyChange={(val) => setLoanForm({ ...loanForm, interestRate: parseFloat(val) })}
                                                        className="w-full p-3 pr-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Plazo</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        placeholder="12"
                                                        value={loanForm.termMonths}
                                                        onChange={e => setLoanForm({ ...loanForm, termMonths: parseFloat(e.target.value) })}
                                                        className="w-full p-3 pr-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-zinc-400">Meses</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Cuota Mensual (Letra)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                                                <SmartMoneyInput
                                                    placeholder="0.00"
                                                    value={loanForm.monthlyPayment || ''}
                                                    onMoneyChange={(val) => setLoanForm({ ...loanForm, monthlyPayment: parseFloat(val) })}
                                                    className="w-full p-3 pl-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none"
                                                />
                                            </div>
                                            <p className="text-[10px] text-zinc-400 font-medium ml-1 mt-1">
                                                Lo que pagas mensualmente al banco.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {loanWizardMode === 'FRIEND' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">¿Cobra Intereses?</span>
                                            <button
                                                onClick={() => setFriendHasInterest(!friendHasInterest)}
                                                className={`w-12 h-7 rounded-full transition-colors relative ${friendHasInterest ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${friendHasInterest ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {friendHasInterest && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Tasa Aproximada</label>
                                                    <div className="relative">
                                                        <SmartMoneyInput
                                                            placeholder="0.0"
                                                            value={loanForm.interestRate || ''}
                                                            onMoneyChange={(val) => setLoanForm({ ...loanForm, interestRate: parseFloat(val) })}
                                                            className="w-full p-3 pr-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Plazo Estimado</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="Meses"
                                                            value={loanForm.termMonths}
                                                            onChange={e => setLoanForm({ ...loanForm, termMonths: parseFloat(e.target.value) })}
                                                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-bold outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={handleSave} disabled={submitting} className={`w-full mt-6 py-4 rounded-xl font-black text-lg hover:scale-[1.02] transition-transform text-white ${wizardType === 'CARD' ? 'bg-pink-500' : loanWizardMode === 'BANK' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                            {submitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Registro')}
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL DE PAGO (Reutilizado) --- */}
            {paymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">Abonar a {paymentModal.name}</h3>
                            <button onClick={() => setPaymentModal(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-500">Cuenta de Origen</label>
                                <select
                                    value={paymentAccountId}
                                    onChange={e => setPaymentAccountId(e.target.value)}
                                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-bold"
                                >
                                    <option value="">Seleccionar Cuenta...</option>
                                    <option value="">-- Pago Externo / Otro --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-500">Monto a Pagar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-xl">$</span>
                                    <SmartMoneyInput
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        onMoneyChange={(val) => setPaymentAmount(val)}
                                        className="w-full p-4 pl-10 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none font-black text-2xl text-center"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handlePay} disabled={submitting}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg transition-transform flex items-center justify-center gap-2"
                            >
                                {submitting ? "Procesando..." : "Confirmar Pago"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE PAGO TARJETA --- */}
            {payingCard && (
                <PaymentModal
                    card={{
                        id: payingCard.id,
                        name: payingCard.name,
                        balance: Number(payingCard.balance),
                        interestRate: Number(payingCard.interestRate) || 0,
                        insuranceRate: Number(payingCard.insuranceRate) || 0.25,
                        minPaymentPercentage: Number(payingCard.minPaymentPercentage) || 3.0,
                    }}
                    accounts={accounts.map(a => ({
                        id: a.id,
                        name: a.name,
                        balance: Number(a.balance),
                    }))}
                    onConfirm={async (cardId, amount, accountId) => {
                        await payCreditCard(cardId, amount, accountId);
                        onUpdate();
                        toast.success("Pago registrado");
                    }}
                    onClose={() => setPayingCard(null)}
                />
            )}

            {/* --- WIZARD NUEVO DE TARJETA --- */}
            {showCardWizard && (
                <CreditCardWizard
                    profileId={profileId}
                    onClose={() => setShowCardWizard(false)}
                    onSuccess={() => { setShowCardWizard(false); onUpdate(); }}
                    onCreate={createCreditCard}
                />
            )}
        </div>
    );
}
