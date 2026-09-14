'use client';

import React from 'react';
import { XIcon, CalculatorIcon } from '@animateicons/react/lucide';
import { SmartMoneyInput } from '@/components/shared/SmartMoneyInput';
import { GOAL_CATEGORIES } from './categories';

/** Lo que el formulario de una meta mantiene en pantalla. */
export interface GoalFormState {
    name: string;
    targetAmount: string;
    deadline: string;
    priority: string;
    category: string;
    notes: string;
    type: string;
    frequency: string;
    contributionAmount: string;
    sourceAccountId: string;
    destinationAccountId: string;
}

interface CuentaOpcion {
    id: number;
    name: string;
    symbol?: string | null;
    balance: number;
}

interface GoalFormModalProps {
    editando: boolean;
    form: GoalFormState;
    setForm: (form: GoalFormState) => void;
    cuentas: CuentaOpcion[];
    /** Cuanto habria que apartar por periodo para llegar a tiempo, si se puede calcular. */
    recomendado: { monthly: number; biweekly: number; weekly: number } | null;
    onGuardar: () => void;
    onClose: () => void;
}

/**
 * Alta y edicion de una meta.
 *
 * El estado sigue siendo de la pestaña, que es quien lo guarda: esto recibe el
 * formulario y su setter. Es un cambio de sitio, no de comportamiento.
 */
export default function GoalFormModal({ editando, form, setForm, cuentas, recomendado, onGuardar, onClose }: GoalFormModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85dvh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{editando ? 'Editar Meta' : 'Nueva Meta'}</h3>
                    <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><XIcon size={20} /></button>
                </div>

                <div className="space-y-5">
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

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Notas</label>
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent focus:border-pink-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all mt-1 resize-none" rows={2} placeholder="¿Para qué es esta meta?" />
                    </div>

                    {form.targetAmount && form.deadline && recomendado && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                                <CalculatorIcon size={16} />
                                <span className="font-bold text-xs">Calculadora</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-surface dark:bg-zinc-900 p-2 rounded-xl"><p className="text-[9px] uppercase font-bold text-zinc-400">Mensual</p><p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">${recomendado.monthly.toFixed(2)}</p></div>
                                <div className="bg-surface dark:bg-zinc-900 p-2 rounded-xl"><p className="text-[9px] uppercase font-bold text-zinc-400">Quincenal</p><p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">${recomendado.biweekly.toFixed(2)}</p></div>
                                <div className="bg-surface dark:bg-zinc-900 p-2 rounded-xl"><p className="text-[9px] uppercase font-bold text-zinc-400">Semanal</p><p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">${recomendado.weekly.toFixed(2)}</p></div>
                            </div>
                        </div>
                    )}

                    {form.type === 'FIXED' && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl space-y-3 animate-in fade-in">
                            <p className="text-xs font-bold text-zinc-400 uppercase">Ahorro Automático</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 ml-2">Frecuencia</label>
                                    <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full mt-1 bg-surface dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none">
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="BIWEEKLY">Quincenal</option>
                                        <option value="MONTHLY">Mensual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 ml-2">Cuota ($)</label>
                                    <SmartMoneyInput selectOnFocus={false} value={form.contributionAmount} onMoneyChange={(val) => setForm({ ...form, contributionAmount: val })} className="w-full mt-1 bg-surface dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none" placeholder="100" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 ml-2">Cuenta Origen</label>
                                <select value={form.sourceAccountId} onChange={e => setForm({ ...form, sourceAccountId: e.target.value })} className="w-full mt-1 bg-surface dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none">
                                    <option value="">Seleccionar...</option>
                                    {cuentas.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.symbol || '$'}{acc.balance})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 ml-2">Cuenta Ahorro Destino</label>
                                <select value={form.destinationAccountId} onChange={e => setForm({ ...form, destinationAccountId: e.target.value })} className="w-full mt-1 bg-surface dark:bg-zinc-900 border-none rounded-xl p-2 font-bold text-sm outline-none">
                                    <option value="">Crear cuenta de ahorro automáticamente</option>
                                    {cuentas.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.symbol || '$'}{acc.balance})</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {form.type === 'VARIABLE' && !editando && (
                        <p className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl">
                            💡 Se creará automáticamente una cuenta de ahorro dedicada para esta meta, así el dinero que deposites se ve reflejado en Cuentas.
                        </p>
                    )}

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-2">Fecha Límite</label>
                        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900 border-transparent rounded-2xl px-5 py-3 font-bold text-lg outline-none mt-1" />
                    </div>

                    <button onClick={onGuardar} className="w-full py-4 rounded-2xl bg-indigo-600 dark:bg-white text-white dark:text-black font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                        {editando ? 'Guardar Cambios' : 'Crear Meta'}
                    </button>
                </div>
            </div>
        </div>
    );
}
