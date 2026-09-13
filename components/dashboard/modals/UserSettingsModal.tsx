'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '../../ui/Input';
import { ProfileWithData } from '@/types';
import { toast } from 'sonner';
import { useScrollLock } from '@/hooks/useScrollLock';
import { EyeIcon, EyeOffIcon, ShieldCheckIcon } from '@animateicons/react/lucide';
import { resetProfileData } from '@/app/actions/budget';
import { updateProfile } from '@/app/actions/auth';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import { useColorTheme } from '@/components/color-theme-provider';
import { COLOR_THEMES } from '@/lib/color-themes';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: ProfileWithData;
    onUpdate: () => void;
}

export default function UserSettingsModal({ isOpen, onClose, profile, onUpdate }: UserSettingsModalProps) {
    useScrollLock(isOpen);
    const { colorTheme, setColorTheme } = useColorTheme();
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [strength, setStrength] = useState(0);
    const [saving, setSaving] = useState(false);

    const checkStrength = (pass: string) => {
        let s = 0;
        if (pass.length > 7) s += 1;
        if (/[A-Z]/.test(pass)) s += 1;
        if (/[0-9]/.test(pass)) s += 1;
        if (/[^a-zA-Z0-9]/.test(pass)) s += 1;
        setStrength(s); // 0-4
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPasswords({ ...passwords, new: val });
        checkStrength(val);
    };

    const handleSave = async () => {
        if (!passwords.new) {
            onClose();
            return;
        }

        if (passwords.new !== passwords.confirm) {
            toast.error("Las contraseñas no coinciden");
            return;
        }
        if (strength < 2) {
            toast.warning("La contraseña es muy débil");
            return;
        }
        if (!passwords.current) {
            toast.error("Escribe tu contraseña actual para confirmar el cambio");
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.set('password', passwords.new);
            formData.set('currentPassword', passwords.current);
            const res = await updateProfile(profile.id, formData);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success("Contraseña actualizada");
            onUpdate();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al guardar los ajustes");
        } finally {
            setSaving(false);
        }
    };

    const handleResetProfile = async () => {
        try {
            await resetProfileData(profile.id);
            toast.success("Perfil reseteado exitosamente");
            onUpdate();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al resetear el perfil");
        }
    };

    // Helper for bar coloring logic
    const getBarColor = (barIndex: number) => {
        if (strength === 0) return 'bg-zinc-200 dark:bg-zinc-700';
        // 1: Red (1 bar)
        if (strength === 1 && barIndex === 0) return 'bg-red-500';
        if (strength === 1) return 'bg-zinc-200 dark:bg-zinc-700';

        // 2: Yellow (2 bars)
        if (strength === 2 && barIndex <= 1) return 'bg-yellow-500';
        if (strength === 2) return 'bg-zinc-200 dark:bg-zinc-700';

        // 3: Blue (3 bars)
        if (strength === 3 && barIndex <= 2) return 'bg-blue-500';
        if (strength === 3) return 'bg-zinc-200 dark:bg-zinc-700';

        // 4: Green (4 bars)
        if (strength === 4) return 'bg-emerald-500';

        return 'bg-zinc-200 dark:bg-zinc-700';
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajustes de Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-500">Nombre</label>
                        <Input defaultValue={profile.name} disabled className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" />
                    </div>

                    <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <label className="text-sm font-bold">Tema de color</label>
                        <div className="grid grid-cols-3 gap-2">
                            {COLOR_THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => setColorTheme(theme.id)}
                                    title={`${theme.label} · títulos en ${theme.fontLabel}`}
                                    className={`group flex flex-col items-center gap-1.5 rounded-xl p-1.5 border-2 transition-all ${colorTheme === theme.id ? 'border-indigo-500' : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'}`}
                                >
                                    <div className="w-full h-10 rounded-lg overflow-hidden flex flex-col shadow-inner">
                                        {[theme.accent, theme.secondary, theme.surface, theme.background].map((hex, i) => (
                                            <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 truncate w-full text-center">
                                        {theme.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold flex items-center gap-2">
                                <ShieldCheckIcon size={16} className="text-indigo-500" />
                                Seguridad
                            </label>
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
                            >
                                {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                                {showPassword ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña Actual"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            />
                            <div className="relative group">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nueva Contraseña"
                                    value={passwords.new}
                                    onChange={handlePasswordChange}
                                    className={strength > 0 ? "border-b-0 rounded-b-none focus-visible:ring-0 focus-visible:border-zinc-300" : ""}
                                />
                                {/* Strength Bar attached to input */}
                                {passwords.new && (
                                    <div className="flex h-1 gap-0.5 mt-0 overflow-hidden rounded-b-md">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div key={i} className={`flex-1 transition-all duration-300 ${getBarColor(i)}`} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirmar Nueva Contraseña"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* DANGER ZONE */}
                    <div className="border-t border-red-100 dark:border-red-900/30 pt-6 mt-6">
                        <h4 className="text-sm font-bold text-red-500 mb-2 uppercase tracking-wider">Zona de Peligro</h4>
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
                            <h5 className="font-bold text-zinc-900 dark:text-red-200">Resetear Perfil</h5>
                            <p className="text-xs text-zinc-500 dark:text-red-300/70 mt-1 mb-4">
                                Esta acción eliminará permanentemente todas tus cuentas, gastos, metas y tarjetas. Esta acción no se puede deshacer.
                            </p>
                            <Button
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold"
                                onClick={() => confirmDelete(
                                    handleResetProfile,
                                    '¿Borrar todos tus datos?',
                                    'Esta acción borrará TODOS tus datos financieros de este perfil (Cuentas, Gastos, Tarjetas, Metas) y no se puede deshacer.',
                                )}
                            >
                                Borrar Todos mis Datos
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
