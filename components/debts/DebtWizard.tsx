'use client';

import React from 'react';
import { XIcon } from '@animateicons/react/lucide';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';
import type { CreateLoanInput } from '@/app/actions/debts';

/** Lo que el formulario simplificado de tarjeta mantiene en pantalla. */
export interface CardFormState {
    name: string;
    limit: string;
    initialBalance: string;
    cutoffDay: string;
    paymentDay: string;
    interestRate: string;
    hasAnnualFee: boolean;
    annualFee: string;
    annualFeeMonth: string;
    // Campos que este formulario no expone, pero que hay que preservar al
    // editar: sin ellos cada edicion los pisaba con valores fijos sin importar
    // los reales de la tarjeta.
    bank: string | undefined;
    insuranceRate: number | undefined;
    itbmsRate: number | undefined;
    minPaymentFloor: number | undefined;
    minPaymentPercentage: number | undefined;
}

interface DebtWizardProps {
    tipo: 'CARD' | 'LOAN';
    editando: boolean;
    modoPrestamo: 'BANK' | 'FRIEND';
    onModoPrestamo: (modo: 'BANK' | 'FRIEND') => void;
    amigoConInteres: boolean;
    onAmigoConInteres: (valor: boolean) => void;
    cardForm: CardFormState;
    setCardForm: (form: CardFormState) => void;
    loanForm: CreateLoanInput;
    setLoanForm: (form: CreateLoanInput) => void;
    guardando: boolean;
    onGuardar: () => void;
    onClose: () => void;
}

/**
 * El alta y la edicion de una deuda, sea tarjeta o prestamo.
 *
 * Vivia dentro de DebtsTab como 200 lineas de JSX en medio del resto de la
 * pestaña. El estado sigue siendo de la pestaña —es quien lo guarda—, asi que
 * esto recibe los valores y sus setters: es un cambio de sitio, no de
 * comportamiento.
 */
export default function DebtWizard({
    tipo,
    editando,
    modoPrestamo,
    onModoPrestamo,
    amigoConInteres,
    onAmigoConInteres,
    cardForm,
    setCardForm,
    loanForm,
    setLoanForm,
    guardando,
    onGuardar,
    onClose,
}: DebtWizardProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[85dvh] flex flex-col overflow-y-auto">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200"><XIcon size={20} /></button>

                <h3 className="text-2xl font-black mb-1">
                    {editando
                        ? (tipo === 'CARD' ? 'Editar Tarjeta' : 'Editar Préstamo')
                        : (tipo === 'CARD' ? 'Nueva Tarjeta' : 'Nuevo Préstamo')}
                </h3>
                <p className="text-zinc-500 text-sm font-bold mb-6">Registra tu pasivo para tomar control.</p>

                {/* LOAN MODE SWITCHER */}
                {tipo === 'LOAN' && (
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-6">
                        <button onClick={() => onModoPrestamo('BANK')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${modoPrestamo === 'BANK' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-zinc-400'}`}>
                            🏛️ Banco / Entidad
                        </button>
                        <button onClick={() => onModoPrestamo('FRIEND')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${modoPrestamo === 'FRIEND' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-zinc-400'}`}>
                            👤 Amigo / Familia
                        </button>
                    </div>
                )}

                {tipo === 'CARD' ? (
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
                                    {modoPrestamo === 'BANK' ? "Institución Financiera" : "Nombre del Prestamista"}
                                </label>
                                <input
                                    type="text"
                                    placeholder={modoPrestamo === 'BANK' ? "Ej: Banco General" : "Ej: Mamá, Tío Juan"}
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

                        {modoPrestamo === 'BANK' && (
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

                        {modoPrestamo === 'FRIEND' && (
                            <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                    <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">¿Cobra Intereses?</span>
                                    <button
                                        onClick={() => onAmigoConInteres(!amigoConInteres)}
                                        className={`w-12 h-7 rounded-full transition-colors relative ${amigoConInteres ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${amigoConInteres ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {amigoConInteres && (
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

                <button onClick={onGuardar} disabled={guardando} className={`w-full mt-6 py-4 rounded-xl font-black text-lg hover:scale-[1.02] transition-transform text-white ${tipo === 'CARD' ? 'bg-pink-500' : modoPrestamo === 'BANK' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                    {guardando ? 'Guardando...' : (editando ? 'Guardar Cambios' : 'Crear Registro')}
                </button>
            </div>
        </div>
    );
}
