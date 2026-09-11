'use client';

import { useState } from 'react';
import { markOnboardingSeen } from '@/app/actions/onboarding';
import { Landmark, CreditCard, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingIntroProps {
    profileId: number;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

export default function OnboardingIntro({ profileId, onClose, onNavigate }: OnboardingIntroProps) {
    const [dismissing, setDismissing] = useState(false);

    async function dismiss() {
        if (dismissing) return;
        setDismissing(true);
        try {
            await markOnboardingSeen(profileId);
        } catch (error) {
            console.error('No se pudo marcar la introducción como vista:', error);
        }
        onClose();
    }

    async function goTo(tab: string) {
        await dismiss();
        onNavigate(tab);
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="w-16 h-16 bg-linear-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 rotate-3">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">
                        ¡Bienvenido a Finanzas Maestras! 👋
                    </h1>

                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                        Ya te creamos una cuenta de <strong className="text-zinc-700 dark:text-zinc-300">Efectivo</strong> para que empieces de una vez. Pero si además tienes cuenta de banco o tarjeta de crédito, agrégalas para desbloquear todas las opciones al registrar tus gastos:
                    </p>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                                <Landmark size={18} />
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                <strong className="text-zinc-800 dark:text-zinc-100">Cuenta bancaria:</strong> para pagar con débito o transferencia, no solo en efectivo.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                                <CreditCard size={18} />
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                <strong className="text-zinc-800 dark:text-zinc-100">Tarjeta de crédito:</strong> para llevar el control de tu deuda, fecha de corte y pago mínimo.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => goTo('accounts')}
                            disabled={dismissing}
                            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3.5 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Agregar cuenta bancaria <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={() => goTo('debts')}
                            disabled={dismissing}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 py-3.5 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Agregar tarjeta de crédito <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={dismiss}
                            disabled={dismissing}
                            className="w-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                        >
                            Lo haré después
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
