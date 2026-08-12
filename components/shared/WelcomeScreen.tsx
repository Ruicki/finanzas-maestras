'use client';

import { useState } from 'react';
import { createProfile } from '@/app/actions/budget';
import { toast } from 'sonner';
import { UserPlus, Sparkles, ShieldCheck } from "lucide-react";

interface WelcomeScreenProps {
    onProfileCreated: () => void;
}

export default function WelcomeScreen({ onProfileCreated }: WelcomeScreenProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("Por favor escribe tu nombre");
            return;
        }

        setLoading(true);
        try {
            // El primer perfil será ADMIN por defecto según la lógica que implementaremos en el backend o por ser el primero
            await createProfile(name);
            toast.success("¡Bienvenido a bordo! 🚀");
            onProfileCreated();
        } catch (error) {
            console.error(error);
            toast.error("Error creando perfil inicial");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white/50 dark:bg-zinc-950/90 backdrop-blur-xl z-100 flex items-center justify-center p-6 animate-in fade-in duration-700">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] p-10 text-center relative overflow-hidden">

                {/* Decoración */}
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="mb-8 flex justify-center">
                    <div className="w-24 h-24 bg-linear-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30 rotate-3 transform transition-transform hover:rotate-6">
                        <Sparkles className="w-12 h-12 text-white" />
                    </div>
                </div>

                <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
                    ¡Hola! 👋
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-8 leading-relaxed">
                    Bienvenido a <strong>Finanzas Maestras</strong>.<br />
                    Para comenzar, necesitamos crear tu perfil de <strong>Administrador</strong>.
                </p>

                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="¿Cómo te llamas?"
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl px-6 py-4 text-xl font-bold text-center outline-none focus:border-indigo-500 transition-colors dark:text-white placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="w-6 h-6 border-4 border-zinc-500 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <ShieldCheck className="w-6 h-6" />
                                Crear Perfil Admin
                            </>
                        )}
                    </button>

                    <p className="text-xs text-zinc-400 dark:text-zinc-600 font-medium pt-4">
                        Tus datos se guardan localmente de forma segura.
                    </p>
                </div>
            </div>
        </div>
    );
}
