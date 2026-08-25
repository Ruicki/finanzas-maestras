import { useState, useEffect } from 'react';
import { Profile } from '@prisma/client';
import { createProfile, deleteProfile, getProfiles, resetProfileData, getGlobalStats } from '@/app/actions/budget';
import { generateAccessCode, resetPassword } from '@/app/actions/auth';
import { toast } from 'sonner';
import { Trash2Icon, UserPlusIcon, KeyRoundIcon, EyeIcon, LockIcon, UsersIcon, DollarSignIcon, CreditCardIcon, TrendingUpIcon, FileTextIcon, HistoryIcon } from '@animateicons/react/lucide';
import { TriangleAlertIcon, ShieldXIcon, LoaderIcon } from '@animateicons/react/lucide';
import { getAuditLogs } from '@/app/actions/audit';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';

interface ProfileManagerProps {
    profiles: (Profile & { role: string; email?: string | null })[];
    currentProfileId: number | null;
    onUpdate: () => void;
    onClose: () => void;
    onImpersonate?: (profile: any) => void;
}

export default function ProfileManager({ profiles: initialProfiles, currentProfileId, onUpdate, onClose, onImpersonate }: ProfileManagerProps) {
    // INICIO: Lógica de Obtención
    const [profiles, setProfiles] = useState<any[]>(initialProfiles);
    const [stats, setStats] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newProfileName, setNewProfileName] = useState('');

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const [data, globalStats, auditLogs] = await Promise.all([
                getProfiles(),
                getGlobalStats(),
                getAuditLogs()
            ]);
            setProfiles(data);
            setStats(globalStats);
            setLogs(auditLogs);
        } catch (error) {
            console.error("Error fetching profiles:", error);
            toast.error("Error al cargar la lista de usuarios");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);
    // FIN: Lógica de Obtención

    async function handleCreate() {
        if (!newProfileName.trim()) return;

        try {
            await createProfile(newProfileName);
            await fetchProfiles(); // Actualizar lista local
            setNewProfileName('');
            toast.success("Perfil creado exitosamente");
        } catch (error) {
            toast.error("Error creando perfil");
        }
    }

    async function handleDelete(id: number) {
        if (id === currentProfileId) {
            toast.warning("No puedes eliminar el perfil activo. Cambia de perfil primero.");
            return;
        }

        confirmDelete(async () => {
            try {
                await deleteProfile(id);
                await fetchProfiles(); // Actualizar lista local
                toast.success("Perfil y todos sus datos eliminados");
            } catch (error) {
                toast.error("Error eliminando perfil");
            }
        });
    }

    async function handlePasswordReset(id: number, name: string) {
        // Prompt simple para restablecer contraseña
        const newPass = window.prompt(`Ingresa la nueva contraseña para ${name}:`, "1234");

        if (newPass === null) return; // Usuario canceló

        if (newPass.trim().length < 4) {
            toast.error("La contraseña debe tener al menos 4 caracteres");
            return;
        }

        const promise = resetPassword(id, newPass);

        toast.promise(promise, {
            loading: 'Actualizando contraseña...',
            success: 'Contraseña actualizada correctamente',
            error: 'Error al actualizar contraseña'
        });
    }

    // Asegurar que los IDs se comparen como números primitivos para evitar discrepancias de tipo
    const currentIdNum = Number(currentProfileId);

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">

                {/* ENCABEZADO */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="font-black text-2xl text-zinc-900 dark:text-white flex items-center gap-3">
                                <span className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <ShieldXIcon size={24} />
                                </span>
                                Panel de Administración
                            </h3>
                            <div className="flex items-center gap-2 mt-1 ml-1">
                                <p className="text-zinc-500 text-sm">Gestiona usuarios y accesos</p>
                                <button
                                    onClick={fetchProfiles}
                                    disabled={loading}
                                    className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors"
                                    title="Recargar lista"
                                >
                                    <LoaderIcon size={14} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-3 rounded-full transition-all hover:rotate-90"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">

                    {/* 0. STATS CARDS */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                icon={<UsersIcon size={18} className="text-blue-500" />}
                                label="Usuarios"
                                value={stats.users}
                                bg="bg-blue-50 dark:bg-blue-900/10"
                            />
                            <StatCard
                                icon={<DollarSignIcon size={18} className="text-emerald-500" />}
                                label="Dinero Total"
                                value={`$${stats.money.toLocaleString()}`}
                                bg="bg-emerald-50 dark:bg-emerald-900/10"
                            />
                            <StatCard
                                icon={<CreditCardIcon size={18} className="text-purple-500" />}
                                label="Deuda Total"
                                value={`$${stats.debt.toLocaleString()}`}
                                bg="bg-purple-50 dark:bg-purple-900/10"
                            />
                            <StatCard
                                icon={<TrendingUpIcon size={18} className="text-orange-500" />}
                                label="Gastos Totales"
                                value={`$${stats.expenses.toLocaleString()}`}
                                bg="bg-orange-50 dark:bg-orange-900/10"
                            />
                        </div>
                    )}

                    {/* 1. CREAR PERFIL */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block ml-1">Crear Perfil sin Correo (Ghost)</label>
                                <input
                                    placeholder="Nombre del nuevo perfil (ej. Socio, Hijo)"
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={!newProfileName.trim()}
                                className="w-full md:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <UserPlusIcon size={20} />
                                <span>Crear</span>
                            </button>
                        </div>
                        <p className="text-xs text-zinc-400 mt-3 ml-1">
                            * Estos perfiles se crean vacíos. Luego puedes generar un código para que el usuario real los reclame.
                        </p>
                    </div>

                    {/* 2. LISTA DE PERFILES */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Usuarios Registrados</h4>
                            <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-500">
                                Total: {profiles.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {profiles.map(profile => (
                                <div
                                    key={profile.id}
                                    className={`relative p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-lg ${Number(profile.id) === currentIdNum
                                        ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/30'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                        }`}
                                >
                                    {/* Info Usuario */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner ${profile.role === 'ADMIN'
                                            ? 'bg-linear-to-br from-amber-400 to-orange-500 text-white'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                            }`}>
                                            {profile.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-zinc-900 dark:text-white text-lg leading-none">
                                                    {profile.name}
                                                </p>
                                                {profile.role === 'ADMIN' && (
                                                    <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                        ADMIN
                                                    </span>
                                                )}
                                                {Number(profile.id) === currentIdNum && (
                                                    <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                        TÚ
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-500 font-medium mt-1">
                                                {profile.email || <span className="text-amber-500 italic flex items-center gap-1"><TriangleAlertIcon size={12} /> Sin correo vinculado</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-2">

                                        {/* IMPERSONAR (Solo otros) */}
                                        {Number(profile.id) !== currentIdNum && (
                                            <button
                                                onClick={() => {
                                                    if (onImpersonate) {
                                                        onImpersonate(profile);
                                                    } else {
                                                        toast.error("Error: Función de Impersonación no disponible");
                                                    }
                                                }}
                                                className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95 border border-indigo-100 dark:border-indigo-500/20"
                                                title="Ver como este usuario"
                                            >
                                                <EyeIcon size={14} />
                                                <span>Ver Como</span>
                                            </button>
                                        )}

                                        {/* RESTABLECER CONTRASEÑA (Solo otros con email) */}
                                        {Number(profile.id) !== currentIdNum && profile.email && (
                                            <button
                                                onClick={() => handlePasswordReset(profile.id, profile.name)}
                                                className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-3 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95 border border-zinc-200 dark:border-zinc-700"
                                                title="Restablecer Contraseña"
                                            >
                                                <LockIcon size={14} />
                                                <span>Reset</span>
                                            </button>
                                        )}

                                        {/* Generar Código (Solo otros sin email) */}
                                        {Number(profile.id) !== currentIdNum && !profile.email && (
                                            <button
                                                onClick={async () => {
                                                    // @ts-ignore
                                                    const res = await generateAccessCode(profile.id);
                                                    if (res.code) {
                                                        const msg = `CÓDIGO DE INVITACIÓN:\n\n${res.code}\n\nComparte este código con el usuario.`;
                                                        window.prompt("Copia este código:", res.code);
                                                    }
                                                }}
                                                className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-500 px-3 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95 border border-amber-100 dark:border-amber-500/20"
                                            >
                                                <KeyRoundIcon size={14} />
                                                <span>Código</span>
                                            </button>
                                        )}

                                        {/* RESET DATA BUTTON (Todos, incluido uno mismo) */}
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Estás seguro de que deseas BORRAR TODOS LOS DATOS de ${profile.name}? Esta acción no se puede deshacer.`)) {
                                                    toast.promise(resetProfileData(profile.id), {
                                                        loading: 'Reseteando datos...',
                                                        success: 'Datos eliminados correctamente',
                                                        error: 'Error al resetear datos'
                                                    });
                                                }
                                            }}
                                            className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-500 px-3 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95 border border-orange-100 dark:border-orange-500/20"
                                            title="Borrar transacciones y resetear saldos"
                                        >
                                            <Trash2Icon size={14} />
                                            <span>Reset Datos</span>
                                        </button>

                                        {/* ELIMINAR (Solo otros) */}
                                        {Number(profile.id) !== currentIdNum && (
                                            <button
                                                onClick={() => handleDelete(profile.id)}
                                                className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 px-3 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95 border border-red-100 dark:border-red-500/20"
                                            >
                                                <Trash2Icon size={14} />
                                                <span>Eliminar</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* 3. AUDIT LOGS */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors w-full"
                        >
                            <HistoryIcon size={16} />
                            <span className="font-bold text-sm">Registro de Auditoría</span>
                            <span className="ml-auto text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md hidden md:block">
                                {showLogs ? 'Ocultar' : 'Mostrar'} últimos eventos
                            </span>
                        </button>

                        {showLogs && (
                            <div className="mt-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="p-3 font-medium">Acción</th>
                                            <th className="p-3 font-medium">Detalles</th>
                                            <th className="p-3 font-medium text-right">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-4 text-center text-zinc-400">No hay registros recientes</td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-colors">
                                                    <td className="p-3 font-bold text-zinc-700 dark:text-zinc-300">
                                                        {log.action}
                                                    </td>
                                                    <td className="p-3 text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]" title={log.details}>
                                                        {log.details || '-'}
                                                    </td>
                                                    <td className="p-3 text-right text-zinc-400 font-mono">
                                                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, bg }: { icon: any, label: string, value: string | number, bg: string }) {
    return (
        <div className={`${bg} p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center gap-1`}>
            <div className="bg-white dark:bg-zinc-800 p-2 rounded-full shadow-sm mb-1">
                {icon}
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
            <p className="text-lg font-black text-zinc-900 dark:text-white">{value}</p>
        </div>
    );
}
