'use client';

import { useState } from 'react';
import { calculateMinimumPayment } from '@/lib/financial-engine';
import { formatMoney } from '@/lib/utils';
import { XIcon, CreditCardIcon, CheckIcon } from '@animateicons/react/lucide';
import { useScrollLock } from '@/hooks/useScrollLock';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';

interface PaymentModalProps {
    card: {
        id: number;
        name: string;
        balance: number;
        interestRate: number;
        insuranceRate: number;
        minPaymentPercentage: number;
        itbmsRate: number;
        minPaymentFloor: number;
    };
    accounts: Array<{
        id: number;
        name: string;
        balance: number;
    }>;
    onConfirm: (cardId: number, amount: number, accountId: number) => Promise<void>;
    onClose: () => void;
}

export default function PaymentModal({ card, accounts, onConfirm, onClose }: PaymentModalProps) {
    const [paymentType, setPaymentType] = useState<'MINIMUM' | 'TOTAL' | 'CUSTOM'>('MINIMUM');
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useScrollLock(true);

    const minPayment = calculateMinimumPayment(
        card.balance,
        card.interestRate,
        card.insuranceRate,
        card.minPaymentPercentage || 3.0,
        card.itbmsRate || 0.07,
        card.minPaymentFloor || 0
    );

    const getAmount = () => {
        switch (paymentType) {
            case 'MINIMUM': return minPayment;
            case 'TOTAL': return card.balance;
            case 'CUSTOM': return parseFloat(customAmount) || 0;
        }
    };

    const amount = getAmount();
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const hasEnoughFunds = selectedAccount ? selectedAccount.balance >= amount : false;
    const isValid = amount > 0 && amount <= card.balance && selectedAccountId && hasEnoughFunds;

    const handleConfirm = async () => {
        if (!isValid || !selectedAccountId) return;
        setLoading(true);
        try {
            await onConfirm(card.id, amount, selectedAccountId);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 max-h-[95vh] sm:max-h-[85vh] flex flex-col">

                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                            <CreditCardIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-zinc-900 dark:text-white">Pagar Tarjeta</h2>
                            <p className="text-xs text-zinc-500">{card.name} · Saldo {formatMoney(card.balance)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <XIcon className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content - no scroll needed */}
                <div className="flex-1 px-5 py-4 space-y-3">

                    {/* Payment type - horizontal row on small screens */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setPaymentType('MINIMUM')}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                                paymentType === 'MINIMUM'
                                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                            }`}
                        >
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Mínimo</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">{formatMoney(minPayment)}</p>
                        </button>
                        <button
                            onClick={() => setPaymentType('TOTAL')}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                                paymentType === 'TOTAL'
                                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                            }`}
                        >
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">Total</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">{formatMoney(card.balance)}</p>
                        </button>
                        <button
                            onClick={() => setPaymentType('CUSTOM')}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                                paymentType === 'CUSTOM'
                                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                            }`}
                        >
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Otro</p>
                            {paymentType === 'CUSTOM' ? (
                                <div className="mt-1 relative">
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">$</span>
                                    <SmartMoneyInput
                                        value={customAmount}
                                        onMoneyChange={setCustomAmount}
                                        onClick={(e) => { e.stopPropagation(); setPaymentType('CUSTOM'); }}
                                        placeholder="0"
                                        className="w-full pl-5 pr-1 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-sm text-zinc-900 dark:text-white outline-none focus:border-zinc-400 text-center"
                                    />
                                </div>
                            ) : (
                                <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">...</p>
                            )}
                        </button>
                    </div>

                    {/* Account selector */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Cuenta de origen</label>
                        <select
                            value={selectedAccountId ?? ''}
                            onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 font-bold text-sm text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                        >
                            <option value="">Seleccionar cuenta...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({formatMoney(acc.balance)})
                                </option>
                            ))}
                        </select>
                        {selectedAccount && !hasEnoughFunds && (
                            <p className="text-xs text-red-500 mt-1">Fondos insuficientes</p>
                        )}
                    </div>

                    {/* Summary */}
                    {amount > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-zinc-500">Vas a pagar</span>
                            <span className="text-lg font-black text-zinc-900 dark:text-white">{formatMoney(amount)}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-2 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid || loading}
                        className="flex-1 py-3 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckIcon className="w-4 h-4" />
                                Confirmar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
