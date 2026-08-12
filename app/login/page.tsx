'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await login(formData);
            if (result?.error) {
                toast.error(result.error);
                setLoading(false);
            } else {
                toast.success('¡Bienvenido!');
                router.refresh(); // Refrescar para actualizar estado de sesión/middleware
                // Usar window.location como respaldo para asegurar recarga completa si es necesario
                window.location.href = '/';
            }
        } catch (err) {
            toast.error('Ocurrió un error inesperado');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
            {/* Decoraciones de Fondo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl p-8 md:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
                        Finanzas Maestras
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Inicia sesión para controlar tu flujo.
                    </p>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                            <input
                                name="email"
                                type="email"
                                placeholder="tu@correo.com"
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-12 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        align-item="center"
                        type="submit"
                        disabled={loading}
                        className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                            <>
                                <span>Ingresar</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="flex flex-col gap-4 mt-8">
                        {/* ¿Divisor eliminado o mantenido dentro del formulario? Mejor dentro para espaciado, ¿pero Link fuera? 
                           Realmente, si lo muevo fuera, necesito cerrar el formulario primero.
                        */}
                    </div>

                    <p className="text-center text-xs text-zinc-400 mt-6">
                        Si olvidaste tu contraseña, contacta al administrador.
                    </p>
                </form>

                <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-center text-xs font-medium text-zinc-500">¿No tienes una cuenta aún?</p>
                    <a
                        href="/register"
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        Crear cuenta nueva
                    </a>

                    <a
                        href="/claim"
                        className="text-center text-xs text-indigo-500 hover:text-indigo-400 font-bold mt-4 block"
                    >
                        ¿Tienes un código de invitación? Canjéalo aquí.
                    </a>
                </div>
            </div>
        </div>
    );
}
