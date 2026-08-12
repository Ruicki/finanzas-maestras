'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { claimProfile } from '@/app/actions/auth';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Lock, Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function ClaimPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await claimProfile(formData);

        if (res?.error) {
            toast.error(res.error);
            setLoading(false);
        } else {
            toast.success("¡Cuenta reclamada exitosamente!");
            router.push('/');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
            {/* Decoraciones de Fondo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl p-8 md:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
                        Reclamar Cuenta
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Ingresa el código que te dio el administrador para acceder a tus datos.
                    </p>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Código de Acceso</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                            <input
                                name="code"
                                type="text"
                                placeholder="XXXXXX"
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 uppercase tracking-widest font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Tu Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                            <input
                                name="email"
                                type="email"
                                placeholder="tu@correo.com"
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-linear-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                            <>
                                <span>Activar Cuenta</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <Link href="/login" className="text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
