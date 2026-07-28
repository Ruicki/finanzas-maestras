'use client';

import { useState } from 'react';
import { ProfileWithData } from '@/types';
import { deleteCreditCard, payCreditCard, updateCreditCardDetails } from '@/app/actions/budget';
import { toast } from 'sonner';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { Plus } from 'lucide-react';
import UltimateCreditCard from '@/components/cards/UltimateCreditCard';
import CreditCardWizard from '@/components/shared/CreditCardWizard';
import PaymentModal from '@/components/shared/PaymentModal';
import { createCreditCard } from '@/app/actions/budget';

type CreditCard = ProfileWithData['creditCards'][number];
type Account = ProfileWithData['accounts'][number];

interface CreditCardsTabProps {
    creditCards: CreditCard[];
    accounts: Account[];
    profileId: number;
    profileName: string;
    onUpdate: () => void;
}

export default function CreditCardsTab({ creditCards, accounts, profileId, profileName, onUpdate }: CreditCardsTabProps) {
    const [showWizard, setShowWizard] = useState(false);
    const [payingCard, setPayingCard] = useState<CreditCard | null>(null);
    const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

    // Strategy
    const [strategy, setStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('SNOWBALL');

    // Sort cards
    const activeCards = creditCards.filter(c => Number(c.balance) > 0);
    const inactiveCards = creditCards.filter(c => Number(c.balance) <= 0);

    const sortedActiveCards = [...activeCards].sort((a, b) => {
        if (strategy === 'SNOWBALL') return Number(a.balance) - Number(b.balance);
        return Number(b.interestRate || 0) - Number(a.interestRate || 0);
    });

    const finalSortedCards = [...sortedActiveCards, ...inactiveCards];

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteCreditCard(id);
                onUpdate();
                toast.success("Tarjeta eliminada");
            } catch {
                toast.error("Error eliminando tarjeta");
            }
        });
    }

    async function handlePayment(cardId: number, amount: number, accountId: number) {
        await payCreditCard(cardId, amount, accountId);
        onUpdate();
        toast.success("Pago realizado con éxito");
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-1">Tus Tarjetas</h3>
                    <p className="text-zinc-500 text-sm">Gestiona tus límites y fechas de corte.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Strategy toggle */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl">
                        <button
                            onClick={() => setStrategy('SNOWBALL')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${strategy === 'SNOWBALL' ? 'bg-white dark:bg-black shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            ❄️ Bola de Nieve
                        </button>
                        <button
                            onClick={() => setStrategy('AVALANCHE')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${strategy === 'AVALANCHE' ? 'bg-white dark:bg-black shadow-sm text-orange-600 dark:text-orange-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            🏔️ Avalancha
                        </button>
                    </div>

                    {/* Add button */}
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva</span>
                    </button>
                </div>
            </div>

            {/* Strategy explanation */}
            <div className={`p-4 rounded-2xl border mb-6 flex items-start gap-3 ${strategy === 'SNOWBALL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-800 dark:text-orange-200'}`}>
                <div className="text-2xl">{strategy === 'SNOWBALL' ? '❄️' : '🏔️'}</div>
                <div>
                    <h4 className="font-bold">Estrategia: {strategy === 'SNOWBALL' ? 'Bola de Nieve' : 'Avalancha'}</h4>
                    <p className="text-sm opacity-80 mt-1">
                        {strategy === 'SNOWBALL'
                            ? "Ataca primero la tarjeta con menor saldo para eliminar deudas rápidamente."
                            : "Ataca primero la tarjeta con mayor tasa de interés para pagar menos a largo plazo."}
                    </p>
                </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {finalSortedCards.map((card) => (
                    <UltimateCreditCard
                        key={card.id}
                        card={card}
                        cardholderName={profileName}
                        onPay={(c) => setPayingCard(c)}
                        onDelete={(id) => handleDelete(id)}
                        onEdit={() => setEditingCard(card)}
                    />
                ))}

                {/* Empty state */}
                {finalSortedCards.length === 0 && (
                    <div className="col-span-1 md:col-span-2 text-center py-20 text-zinc-600 bg-zinc-100 dark:bg-zinc-900/20 rounded-4xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <p className="text-4xl mb-4">💳</p>
                        <p className="text-xl font-bold text-zinc-900 dark:text-white">Sin tarjetas registradas</p>
                        <p className="text-sm mt-2 text-zinc-500">Agrega tus tarjetas para visualizar deudas y fechas de corte.</p>
                        <button
                            onClick={() => setShowWizard(true)}
                            className="mt-6 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                            Crear Primera Tarjeta
                        </button>
                    </div>
                )}
            </div>

            {/* Wizard modal */}
            {(showWizard || editingCard) && (
                <CreditCardWizard
                    profileId={profileId}
                    onClose={() => { setShowWizard(false); setEditingCard(null); }}
                    onSuccess={() => { onUpdate(); setEditingCard(null); }}
                    onCreate={createCreditCard}
                    onUpdate={updateCreditCardDetails}
                    editingCard={editingCard ? {
                        id: editingCard.id,
                        name: editingCard.name,
                        limit: Number(editingCard.limit),
                        balance: Number(editingCard.balance),
                        cutoffDay: editingCard.cutoffDay,
                        paymentDay: editingCard.paymentDay,
                        interestRate: Number(editingCard.interestRate),
                        annualFee: editingCard.annualFee ? Number(editingCard.annualFee) : undefined,
                        annualFeeMonth: editingCard.annualFeeMonth,
                    } : undefined}
                />
            )}

            {/* Payment modal */}
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
                    accounts={accounts.filter(a => (a as any).purpose !== 'SAVINGS').map(a => ({
                        id: a.id,
                        name: a.name,
                        balance: Number(a.balance),
                    }))}
                    onConfirm={handlePayment}
                    onClose={() => setPayingCard(null)}
                />
            )}
        </div>
    );
}
