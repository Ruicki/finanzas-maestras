'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/app/actions/auth';
import { toast } from 'sonner';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await register(formData);

        if (res?.error) {
            toast.error(res.error);
            setLoading(false);
        } else {
            toast.success("¡Bienvenido! Cuenta creada.");
            router.push('/');
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-black font-sans">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-lg rotate-3 hover:rotate-6 transition-transform">
                        $
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Crear Cuenta</h1>
                    <p className="text-zinc-500 font-medium text-sm mt-2">Únete y toma el control de tu dinero.</p>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Tu Nombre</label>
                        <input
                            name="name"
                            type="text"
                            required
                            placeholder="Ej: Ricardo"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-zinc-900 dark:focus:border-white rounded-2xl px-4 py-3 outline-none font-bold transition-all text-zinc-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="hola@ejemplo.com"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-zinc-900 dark:focus:border-white rounded-2xl px-4 py-3 outline-none font-bold transition-all text-zinc-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-zinc-900 dark:focus:border-white rounded-2xl px-4 py-3 pr-12 outline-none font-bold transition-all text-zinc-900 dark:text-white"
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
                        type="submit"
                        disabled={loading}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 mt-4"
                    >
                        {loading ? 'Creando cuenta...' : 'Registrarse'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm font-bold text-zinc-400">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="text-zinc-900 dark:text-white hover:underline decoration-2 underline-offset-4">
                            Inicia Sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
