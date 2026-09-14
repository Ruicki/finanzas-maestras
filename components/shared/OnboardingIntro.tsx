'use client';

import { useState } from 'react';
import { markOnboardingSeen } from '@/app/actions/onboarding';
import { Landmark, CreditCard, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingIntroProps {
    profileId: number;
    /**
     * Si el perfil ya tiene la cuenta de Efectivo que ensureProfileIntegrity
     * deberia haber creado. Se pasa desde fuera en vez de darlo por hecho:
     * esa funcion se traga sus propios errores, asi que puede no haber creado
     * nada, y el texto no debe afirmar algo que quiza no ocurrio.
     */
    hasCashAccount: boolean;
    onClose: () => void;
    /**
     * Ademas de cambiar de pestaña, lleva la intencion de lo que el usuario
     * venia a hacer, para que el asistente se abra solo al llegar. Sin esto los
     * botones dejaban al recien llegado en una pestaña vacia.
     */
    onNavigate: (tab: string, intent?: 'new-account' | 'new-card') => void;
}

export default function OnboardingIntro({ profileId, hasCashAccount, onClose, onNavigate }: OnboardingIntroProps) {
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

    async function goTo(tab: string, intent: 'new-account' | 'new-card') {
        await dismiss();
        onNavigate(tab, intent);
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* max-h + cuerpo desplazable, el mismo patron que ExpenseWizard. Sin
                esto el panel no tiene tope de alto y ademas recorta (overflow-hidden)
                dentro de un overlay centrado: en una pantalla corta el contenido se
                centra, se corta arriba y abajo, y los botones quedan inalcanzables.
                El overflow-hidden se queda solo en el borde redondeado del marco. */}
            <div className="max-w-md w-full max-h-[90dvh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 z-20" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 overflow-y-auto p-6 md:p-10 pb-2 md:pb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-linear-to-tr from-indigo-500 to-purple-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4 md:mb-6 rotate-3">
                        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>

                    <h1 className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white mb-2 md:mb-3 tracking-tight text-balance">
                        ¡Bienvenido a Finanzas Maestras! 👋
                    </h1>

                    <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 md:mb-6">
                        {hasCashAccount ? (
                            <>
                                Ya tienes una cuenta de <strong className="text-zinc-700 dark:text-zinc-300">Efectivo</strong> lista para que empieces de una vez. Si además tienes cuenta de banco o tarjeta de crédito, agrégalas para desbloquear todas las opciones al registrar tus gastos:
                            </>
                        ) : (
                            <>
                                Para registrar tu primer gasto necesitas al menos una cuenta. Agrega la que uses a diario y desbloquearás todas las opciones:
                            </>
                        )}
                    </p>

                    <div className="space-y-2 md:space-y-3 mb-2 md:mb-4">
                        <div className="flex items-start gap-3 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                                <Landmark size={18} />
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                <strong className="text-zinc-800 dark:text-zinc-100">Cuenta bancaria:</strong> para pagar con débito o transferencia, no solo en efectivo.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                                <CreditCard size={18} />
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                <strong className="text-zinc-800 dark:text-zinc-100">Tarjeta de crédito:</strong> para llevar el control de tu deuda, fecha de corte y pago mínimo.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Los botones viven fuera del area que se desplaza: en una pantalla
                    de 320x568 el contenido no cabe entero, y si viajaran con el
                    scroll la accion principal quedaria bajo el pliegue justo en el
                    primer momento de uso de la app. */}
                <div className="relative z-10 shrink-0 space-y-2 px-6 md:px-10 pb-5 md:pb-10 pt-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => goTo('accounts', 'new-account')}
                            disabled={dismissing}
                            className="w-full bg-indigo-600 dark:bg-white text-white dark:text-zinc-900 py-3 md:py-3.5 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Agregar cuenta bancaria <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={() => goTo('debts', 'new-card')}
                            disabled={dismissing}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 py-3 md:py-3.5 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
    );
}
