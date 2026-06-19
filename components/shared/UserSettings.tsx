'use client';

import { useState } from 'react';
import { updateProfile } from '@/app/actions/auth';
import { toast } from 'sonner';
import { X, User, Mail, Lock, Save } from 'lucide-react';
import { Profile } from '@prisma/client';

interface UserSettingsProps {
    profile: Profile;
    onClose: () => void;
    onUpdate: () => void;
}

export default function UserSettings({ profile, onClose, onUpdate }: UserSettingsProps) {
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        // Verificación de validación para campos de contraseña vacíos para evitar hashear cadenas vacías si no es intencional
        const password = formData.get('password') as string;
        if (password && password.length < 4) {
            toast.error("La contraseña debe tener al menos 4 caracteres");
            setLoading(false);
            return;
        }

        const res = await updateProfile(profile.id, formData);

        if (res?.error) {
            toast.error(res.error);
        } else {
            toast.success("Perfil actualizado correctamente");
            onUpdate();
            onClose();
        }
        setLoading(false);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-black text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl">⚙️</span>
                        Ajustes de Usuario
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form action={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <User size={14} /> Nombre
                        </label>
                        <input
                            name="name"
                            defaultValue={profile.name}
                            required
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white font-bold transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Mail size={14} /> Correo Electrónico
                        </label>
                        <input
                            name="email"
                            type="email"
                            defaultValue={profile.email || ''}
                            required
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white font-bold transition-all"
                        />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                        <label className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-2">
                            <Lock size={14} /> Cambiar Contraseña
                        </label>
                        <input
                            name="password"
                            type="password"
                            placeholder="Dejar en blanco para mantener actual"
                            className="w-full bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 font-bold transition-all placeholder:font-normal placeholder:text-zinc-400"
                        />
                    </div>

                    {/* ZONA DE PELIGRO */}
                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-xs font-black text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            Zona de Peligro
                        </h4>
                        <button
                            type="button"
                            onClick={async () => {
                                if (confirm("¿ESTÁS SEGURO? Esto borrará TODOS tus gastos, ingresos, metas y cuentas (excepto Efectivo). Esta acción NO se puede deshacer.")) {
                                    if (confirm("¿De verdad? Se perderán todos los datos permanentemente.")) {
                                        setLoading(true);
                                        const { resetProfileData } = await import('@/app/actions/budget');
                                        await resetProfileData(profile.id);
                                        toast.success("Cuenta reseteada correctamente");
                                        onUpdate();
                                        onClose();
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Resetear Todos los Datos
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div> : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
