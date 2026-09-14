'use client';

import React, { useState } from 'react';
import { ProfileWithData } from '@/types';

type CreditCard = ProfileWithData['creditCards'][number];
type Loan = ProfileWithData['loans'][number];
type Account = ProfileWithData['accounts'][number];
import { CreditCardIcon as CardIcon } from '@animateicons/react/lucide';
import { Building } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { createLoan, deleteLoan, payLoan, updateLoan, CreateLoanInput } from '@/app/actions/debts';
import { createCreditCard, deleteCreditCard, payCreditCard, updateCreditCardDetails } from '@/app/actions/budget';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { useScrollLock } from '@/hooks/useScrollLock';
import UltimateCreditCard from '@/components/cards/UltimateCreditCard';
import BankLoanCard from '@/components/cards/BankLoanCard';
import FriendLoanCard from '@/components/cards/FriendLoanCard';
import PaymentModal from '@/components/shared/PaymentModal';
import CreditCardWizard from '@/components/shared/CreditCardWizard';
import DebtFreedomHeader from '@/components/debts/DebtFreedomHeader';
import DebtWizard from '@/components/debts/DebtWizard';
import LoanPaymentModal from '@/components/debts/LoanPaymentModal';
import {
    esPrestamoBancario,
    calcularFechaDeLibertad,
    calcularDeudaTotal,
    cuentaPreferidaParaPagar,
} from '@/lib/debts';

type DebtsTabProps = {
    creditCards: CreditCard[];
    loans: Loan[];
    accounts: Account[];
    profileId: number;
    profileName: string;
    onUpdate: () => void;
    /** La bienvenida pide abrir el alta de tarjeta nada mas entrar aqui. */
    autoOpenCardWizard?: boolean;
};

export default function DebtsTab({ creditCards, loans, accounts, profileId, profileName, onUpdate, autoOpenCardWizard = false }: DebtsTabProps) {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<'CARD' | 'LOAN'>('CARD');
    const [editingId, setEditingId] = useState<number | null>(null); // EDIT STATE
    // Arranca abierto si la bienvenida mando aqui a crear una tarjeta. Mismo
    // motivo que en AccountsTab: estado inicial, no efecto. Los formularios ya
    // estan en blanco en el primer montaje, asi que no hace falta resetearlos.
    const [showCardWizard, setShowCardWizard] = useState(autoOpenCardWizard);

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
        // Campos que este formulario simplificado no expone en su UI, pero que
        // hay que preservar al editar — si no, cada edición los pisaba con
        // valores fijos (minPaymentPercentage 3.0, insuranceRate 0.0) sin
        // importar los reales de la tarjeta.
        bank: undefined as string | undefined,
        insuranceRate: undefined as number | undefined,
        itbmsRate: undefined as number | undefined,
        minPaymentFloor: undefined as number | undefined,
        minPaymentPercentage: undefined as number | undefined,
    });

    const [submitting, setSubmitting] = useState(false);

    // --- MANEJADORES DE EDICIÓN ---
    function openEditLoan(loan: Loan) {
        setEditingId(loan.id);
        // Misma regla que usa la lista para decidir BankLoanCard vs FriendLoanCard,
        // para que el editor abra en el modo que realmente corresponde a esta deuda.
        const isBank = esPrestamoBancario(loan);
        setWizardType('LOAN');
        setLoanWizardMode(isBank ? 'BANK' : 'FRIEND');
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
            initialBalance: card.balance.toString(),
            cutoffDay: card.cutoffDay.toString(),
            paymentDay: card.paymentDay.toString(),
            interestRate: card.interestRate?.toString() || '',
            hasAnnualFee: !!card.annualFee,
            annualFee: card.annualFee?.toString() || '',
            annualFeeMonth: card.annualFeeMonth?.toString() || '1',
            bank: card.bank ?? undefined,
            insuranceRate: card.insuranceRate != null ? Number(card.insuranceRate) : undefined,
            itbmsRate: card.itbmsRate != null ? Number(card.itbmsRate) : undefined,
            minPaymentFloor: card.minPaymentFloor != null ? Number(card.minPaymentFloor) : undefined,
            minPaymentPercentage: card.minPaymentPercentage != null ? Number(card.minPaymentPercentage) : undefined,
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
            bank: undefined, insuranceRate: undefined, itbmsRate: undefined,
            minPaymentFloor: undefined, minPaymentPercentage: undefined,
        });
    }


    // --- CÁLCULOS GLOBALES ---
    // Las cuentas viven en lib/debts.ts, con pruebas: de aquí sale la fecha que
    // la app le enseña a alguien como el día que sale de deudas.
    const { total: totalDebt } = calcularDeudaTotal(loans, creditCards);
    const freedomDate = calcularFechaDeLibertad(loans, creditCards);

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
                    interestRate: cardForm.interestRate ? parseFloat(cardForm.interestRate) : null,
                    annualFee: cardForm.hasAnnualFee && cardForm.annualFee ? parseFloat(cardForm.annualFee) : null,
                    annualFeeMonth: cardForm.hasAnnualFee ? (parseInt(cardForm.annualFeeMonth) || null) : null,
                    // Este formulario simplificado no expone estos campos en su UI —
                    // se preservan los de la tarjeta si se está editando, y solo se
                    // usa un default sensato al crear una tarjeta nueva.
                    minPaymentPercentage: cardForm.minPaymentPercentage ?? 3.0,
                    insuranceRate: cardForm.insuranceRate ?? 0.0,
                    itbmsRate: cardForm.itbmsRate ?? 0.07,
                    minPaymentFloor: cardForm.minPaymentFloor ?? 0,
                    bank: cardForm.bank ?? null,
                    initialBalance: parseFloat(cardForm.initialBalance) || 0,
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
                    // Se persiste explícitamente BANK/FRIEND (antes `type` quedaba
                    // fijo en 'PERSONAL' y la UI adivinaba con interestRate > 0,
                    // lo cual clasificaba mal un préstamo de amigo CON interés).
                    type: loanWizardMode,
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
            toast.error(error instanceof Error ? error.message : "Error guardando registro");
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
            } catch (error) { toast.error(error instanceof Error ? error.message : "Error al eliminar"); }
        });
    }

    // --- MANEJADORES: PAGAR ---
    // Abre el modal de pago reseteando monto/cuenta — si no, al pagar el
    // préstamo A, cancelar, y abrir el préstamo B, quedaba el monto y la
    // cuenta que se habían tecleado para A.
    function openPaymentModal(type: 'CARD' | 'LOAN', id: number, name: string, maxAmount: number) {
        setPaymentAmount('');
        setPaymentAccountId('');
        setPaymentModal({ isOpen: true, type, id, name, maxAmount });
    }

    function closePaymentModal() {
        setPaymentModal(null);
        setPaymentAmount('');
        setPaymentAccountId('');
    }

    async function handlePay() {
        if (!paymentModal || !paymentAmount) {
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
            closePaymentModal();
            toast.success("Pago registrado");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error en el pago");
        } finally {
            setSubmitting(false);
        }
    }

    function quickPay(loan: Loan, amount: number) {
        // Preferir una cuenta de gasto normal, no bloqueada y no de ahorro —
        // antes tomaba accounts[0] a ciegas, pudiendo drenar una cuenta de
        // ahorro bloqueada solo por ser la primera de la lista.
        const candidate = cuentaPreferidaParaPagar(accounts);
        if (!candidate) return toast.error("Necesitas una cuenta para pagar");

        toast.promise(payLoan(loan.id, amount, candidate.id).then(() => onUpdate()), {
            loading: 'Procesando Abono Rápido...',
            success: `Abonados $${amount} a ${loan.name}`,
            error: (error) => error instanceof Error ? error.message : 'Error al abonar',
        });
    }
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-6">
            <DebtFreedomHeader
                deudaTotal={totalDebt}
                fechaLibertad={freedomDate}
                onNuevaTarjeta={() => { resetForms(); setShowCardWizard(true); }}
                onNuevoPrestamo={() => startCreate('LOAN')}
            />

            {/* --- SECCIÓN ULTIMATE LOANS --- */}
            {loans.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Building className="text-indigo-500 lucide-animated" /> Mis Préstamos
                    </h3>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {loans.map(loan => {
                            const isBank = esPrestamoBancario(loan);
                            if (isBank) {
                                return (
                                    <BankLoanCard
                                        key={loan.id}
                                        loan={loan}
                                        onPay={() => openPaymentModal('LOAN', loan.id, loan.name, Number(loan.currentBalance))}
                                        onDelete={() => handleDelete(loan.id, 'LOAN')}
                                        onEdit={() => openEditLoan(loan)}
                                    />
                                );
                            } else {
                                return (
                                    <FriendLoanCard
                                        key={loan.id}
                                        loan={loan}
                                        onPay={() => openPaymentModal('LOAN', loan.id, loan.name, Number(loan.currentBalance))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {creditCards.length === 0 && loans.length === 0 && (
                        <EmptyState
                            icon={<CardIcon />}
                            title="Todavía no registras deudas"
                            description="Aquí llevas el control de tus tarjetas y préstamos: cuánto debes, cuándo corta cada una y cuál es el pago mínimo. Si no debes nada, puedes dejar esta pestaña vacía."
                            actionLabel="Agregar tarjeta"
                            onAction={() => { resetForms(); setShowCardWizard(true); }}
                            secondaryLabel="Agregar préstamo"
                            onSecondary={() => startCreate('LOAN')}
                        />
                    )}
                    {creditCards.map(card => (
                        <div key={card.id}>
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

            {isWizardOpen && (
                <DebtWizard
                    tipo={wizardType}
                    editando={editingId !== null}
                    modoPrestamo={loanWizardMode}
                    onModoPrestamo={setLoanWizardMode}
                    amigoConInteres={friendHasInterest}
                    onAmigoConInteres={setFriendHasInterest}
                    cardForm={cardForm}
                    setCardForm={setCardForm}
                    loanForm={loanForm}
                    setLoanForm={setLoanForm}
                    guardando={submitting}
                    onGuardar={handleSave}
                    onClose={() => setIsWizardOpen(false)}
                />
            )}

            {paymentModal && (
                <LoanPaymentModal
                    nombre={paymentModal.name}
                    cuentas={accounts}
                    monto={paymentAmount}
                    onMonto={setPaymentAmount}
                    cuentaId={paymentAccountId}
                    onCuentaId={setPaymentAccountId}
                    pagando={submitting}
                    onConfirmar={handlePay}
                    onClose={closePaymentModal}
                />
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
                        itbmsRate: Number(payingCard.itbmsRate) || 0.07,
                        minPaymentFloor: Number(payingCard.minPaymentFloor) || 0,
                    }}
                    accounts={accounts.filter(a => a.purpose !== 'SAVINGS').map(a => ({
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
