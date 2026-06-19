'use client';

import { useState } from 'react';
import { calculateMinimumPayment } from '@/lib/financial-engine';
import { formatMoney } from '@/lib/utils';
import { X, CreditCard, Check } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

interface PaymentModalProps {
    card: {
        id: number;
        name: string;
        balance: number;
        interestRate: number;
        insuranceRate: number;
        minPaymentPercentage: number;
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
        card.minPaymentPercentage || 3.0
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                            <CreditCard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-zinc-900 dark:text-white">Pagar Tarjeta</h2>
                            <p className="text-xs text-zinc-500">{card.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Balance info */}
                <div className="px-6 pt-4 pb-2">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-zinc-500">Saldo actual</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatMoney(card.balance)}</span>
                    </div>
                </div>

                {/* Payment options */}
                <div className="p-6 space-y-3">
                    {/* Pago Mínimo */}
                    <button
                        onClick={() => setPaymentType('MINIMUM')}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                            paymentType === 'MINIMUM'
                                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    paymentType === 'MINIMUM' ? 'border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'
                                }`}>
                                    {paymentType === 'MINIMUM' && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white" />}
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900 dark:text-white">Pago Mínimo</p>
                                    <p className="text-xs text-zinc-500">Cubre interés + seguro + 3% capital</p>
                                </div>
                            </div>
                            <span className="font-bold text-zinc-900 dark:text-white">{formatMoney(minPayment)}</span>
                        </div>
                    </button>

                    {/* Pago Total */}
                    <button
                        onClick={() => setPaymentType('TOTAL')}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                            paymentType === 'TOTAL'
                                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    paymentType === 'TOTAL' ? 'border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'
                                }`}>
                                    {paymentType === 'TOTAL' && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white" />}
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900 dark:text-white">Pago Total</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">No generas intereses</p>
                                </div>
                            </div>
                            <span className="font-bold text-zinc-900 dark:text-white">{formatMoney(card.balance)}</span>
                        </div>
                    </button>

                    {/* Otro monto */}
                    <button
                        onClick={() => setPaymentType('CUSTOM')}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                            paymentType === 'CUSTOM'
                                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'CUSTOM' ? 'border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'
                            }`}>
                                {paymentType === 'CUSTOM' && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white" />}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-zinc-900 dark:text-white">Otro monto</p>
                                <div className="mt-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            onClick={(e) => { e.stopPropagation(); setPaymentType('CUSTOM'); }}
                                            placeholder="0.00"
                                            min="25"
                                            max={card.balance}
                                            className="w-full pl-8 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">Mínimo: $25.00</p>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Account selector */}
                <div className="px-6 pb-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Cuenta de origen</label>
                    <select
                        value={selectedAccountId ?? ''}
                        onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 font-bold text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
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

                {/* Actions */}
                <div className="p-6 pt-2 flex gap-3">
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
                                <Check className="w-4 h-4" />
                                Confirmar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
