'use client';

import React, { useState } from 'react';
import SubscriptionCalendar from '@/components/budgets/SubscriptionCalendar';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { deleteExpense, markSubscriptionPaid, markSubscriptionUnpaid } from '@/app/actions/budget';
import { getSubscriptionStatus } from '@/lib/subscription-status';
import { costeAnualDeSuscripciones, montoPendienteEsteMes } from '@/lib/budgets';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
import { PlusIcon, CalendarIcon, TrendingDownIcon, CreditCardIcon, PencilIcon, ClockIcon } from '@animateicons/react/lucide';
import { ProfileWithData } from '@/types';

type Expense = ProfileWithData['expenses'][number];

const RECURRENCE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensual',
    ANNUAL: 'Anual',
};

function pagadaEsteMes(exp: Expense): boolean {
    return getSubscriptionStatus(exp.dueDate || 1, exp.graceDays, exp.lastPaidAt) === 'PAID';
}

interface SubscriptionsPanelProps {
    /** Gastos recurrentes, ya ordenados por dia de cobro. */
    suscripciones: Expense[];
    totalIngresos: number;
    onNueva: () => void;
    onEditar: (exp: Expense) => void;
    onUpdate?: () => void;
}

/**
 * Las suscripciones: lo que se va solo cada mes.
 *
 * El estado de "esta suscripcion se esta procesando" se queda aqui, que es el
 * unico sitio que lo usa: en la pestaña estaba compartido con cosas que no
 * tienen nada que ver.
 */
export default function SubscriptionsPanel({ suscripciones, totalIngresos, onNueva, onEditar, onUpdate }: SubscriptionsPanelProps) {
    // Evita que un doble clic dispare dos veces marcar-pagado o cancelar.
    const [procesando, setProcesando] = useState<Set<number>>(new Set());

    const costeMensual = suscripciones.reduce((s, e) => s + Number(e.amount), 0);
    const proximoDia = suscripciones.length > 0 ? Math.min(...suscripciones.map(s => s.dueDate || 1)) : null;
    const porcentajeDeIngresos = totalIngresos > 0 ? (costeMensual / totalIngresos) * 100 : 0;
    const costeAnual = costeAnualDeSuscripciones(suscripciones);
    const pendienteEsteMes = montoPendienteEsteMes(suscripciones);
    const cantidadPendientes = suscripciones.filter(s => !pagadaEsteMes(s)).length;

    return (
    <div className="space-y-6">
        {suscripciones.length > 0 ? (
            <>
                {/* Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative overflow-hidden rounded-3xl bg-indigo-600 text-white p-6 shadow-lg shadow-indigo-500/20">
                        <div className="flex items-center gap-3 mb-3">
                            <CreditCardIcon size={18} className="text-indigo-200" />
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Costo Mensual</p>
                        </div>
                        <p className="text-3xl font-black">{formatMoney(costeMensual)}</p>
                        <p className="text-xs text-indigo-200 mt-1">{porcentajeDeIngresos.toFixed(0)}% de tus ingresos</p>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingDownIcon size={18} className="text-red-500" />
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Costo Anual</p>
                        </div>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">{formatMoney(costeAnual)}</p>
                        <p className="text-xs text-zinc-400 mt-1">{formatMoney(costeAnual / 12)}/mes × 12</p>
                    </div>

                    {proximoDia && (
                        <div className="relative overflow-hidden rounded-3xl bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <CalendarIcon size={18} className="text-purple-500" />
                                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Próximo Cobro</p>
                            </div>
                            <p className="text-3xl font-black text-zinc-900 dark:text-white">Día {proximoDia}</p>
                            <p className="text-xs text-zinc-400 mt-1">
                                {suscripciones.filter(s => s.dueDate === proximoDia).length} {suscripciones.filter(s => s.dueDate === proximoDia).length === 1 ? 'suscripción' : 'suscripciones'}
                            </p>
                        </div>
                    )}

                    <div className="relative overflow-hidden rounded-3xl bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <ClockIcon size={18} className="text-amber-500" />
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Proyección: Falta Este Mes</p>
                        </div>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">{formatMoney(pendienteEsteMes)}</p>
                        <p className="text-xs text-zinc-400 mt-1">
                            {cantidadPendientes === 0
                                ? 'Ya pagaste todas este ciclo'
                                : `${cantidadPendientes} ${cantidadPendientes === 1 ? 'suscripción pendiente' : 'suscripciones pendientes'} de cobrarse`}
                        </p>
                    </div>
                </div>

                {/* Calendar View */}
                <SubscriptionCalendar subscriptions={suscripciones} />

                {/* Subscription Cards — each one individually */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suscripciones.map((exp) => {
                        const catColor = exp.categoryRel?.color || 'bg-zinc-400';
                        const catIcon = exp.categoryRel?.icon || 'RefreshCw';
                        return (
                            <div key={exp.id} className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-indigo-500" />

                                <div className="p-5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catColor?.replace('text-', 'bg-').replace('500', '100') || 'bg-zinc-100'} ${catColor || 'text-zinc-500'}`}>
                                                <CategoryIcon iconName={catIcon} size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[140px]">{exp.name}</h4>
                                                <div className="flex items-center gap-1.5">
                                                    {exp.categoryRel && (
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">{exp.categoryRel.name}</p>
                                                    )}
                                                    {exp.recurrenceType && exp.recurrenceType !== 'MONTHLY' && (
                                                        <span className="text-[9px] font-bold text-purple-500 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full">
                                                            {RECURRENCE_LABELS[exp.recurrenceType] || 'Mensual'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {(() => {
                                                const status = getSubscriptionStatus(exp.dueDate || 1, exp.graceDays, exp.lastPaidAt);
                                                if (status === 'PAID') {
                                                    return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">Pagado</span>;
                                                }
                                                if (status === 'OVERDUE') {
                                                    return <span className="text-[9px] font-bold text-red-600 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-full">Vencido</span>;
                                                }
                                                return <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">Pendiente</span>;
                                            })()}
                                            <div className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500">
                                                Día {exp.dueDate || '1'}{exp.graceDays ? ` (+${exp.graceDays}d gracia)` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-3">
                                        <div>
                                            <p className="text-2xl font-black text-zinc-900 dark:text-white">-{formatMoney(Number(exp.amount))}</p>
                                            {exp.recurrenceType === 'ANNUAL' && (
                                                <p className="text-[10px] text-zinc-400">{formatMoney(Number(exp.amount) / 12)}/mes equivalente</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="px-5 pb-4 flex items-center justify-between">
                                        <button
                                            disabled={procesando.has(exp.id)}
                                            onClick={async () => {
                                                if (procesando.has(exp.id)) return;
                                                setProcesando(prev => new Set(prev).add(exp.id));
                                                try {
                                                    if (pagadaEsteMes(exp)) {
                                                        await markSubscriptionUnpaid(exp.id);
                                                        toast.success("Marcado como pendiente");
                                                    } else {
                                                        await markSubscriptionPaid(exp.id);
                                                        toast.success("Marcado como pagado");
                                                    }
                                                    onUpdate?.();
                                                } catch (error) {
                                                    toast.error(error instanceof Error ? error.message : "Error al actualizar");
                                                } finally {
                                                    setProcesando(prev => { const next = new Set(prev); next.delete(exp.id); return next; });
                                                }
                                            }}
                                            className={`py-2 px-4 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 disabled:pointer-events-none ${pagadaEsteMes(exp) ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30'}`}
                                        >
                                            {pagadaEsteMes(exp) ? 'Pagado ✓' : 'Marcar pagado'}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onEditar(exp)}
                                                className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Editar"
                                            >
                                                <PencilIcon size={12} />
                                            </button>
                                            <button
                                                disabled={procesando.has(exp.id)}
                                                onClick={() => {
                                                    confirmDelete(async () => {
                                                        if (procesando.has(exp.id)) return;
                                                        setProcesando(prev => new Set(prev).add(exp.id));
                                                        try {
                                                            await deleteExpense(exp.id);
                                                            toast.success("Suscripción cancelada");
                                                            onUpdate?.();
                                                        } catch (error) {
                                                            toast.error(error instanceof Error ? error.message : "Error al cancelar la suscripción");
                                                        } finally {
                                                            setProcesando(prev => { const next = new Set(prev); next.delete(exp.id); return next; });
                                                        }
                                                    });
                                                }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                            </div>
                        );
                    })}

                    {/* Add Subscription Button */}
                    <button
                        onClick={() => onNueva()}
                        className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-zinc-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                    >
                        <PlusIcon size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">Nueva Suscripción</span>
                    </button>
                </div>
            </>
        ) : (
            <div className="bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                <CreditCardIcon size={32} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-bold text-zinc-500 mb-1">No tienes suscripciones</p>
                <p className="text-xs text-zinc-400">Registra tus gastos recurrentes para controlar tu &quot;costo de vida&quot; base.</p>
                <button
                    onClick={() => onNueva()}
                    className="mt-4 px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors"
                >
                    Agregar Suscripción
                </button>
            </div>
        )}
    </div>
    );
}
