'use client';

import { exportDatabase, toggleMaintenanceMode } from "@/app/actions/system";
import { Database, Download, ShieldAlert, Lock, Upload, Server, FileJson } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SystemPage() {
    const [exporting, setExporting] = useState(false);
    const [maintenance, setMaintenance] = useState(false);

    const handleBackup = async () => {
        try {
            setExporting(true);
            const jsonString = await exportDatabase();

            // Create Blob and trigger download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finanzas-maestras-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Backup generado y descargado correctamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar backup");
        } finally {
            setExporting(false);
        }
    };

    const handleMaintenance = async () => {
        const newState = !maintenance;
        try {
            await toggleMaintenanceMode(newState);
            setMaintenance(newState);
            toast.message(newState ? "Modo Mantenimiento ACTIVADO" : "Modo Mantenimiento DESACTIVADO", {
                description: newState ? "Solo los administradores pueden acceder." : "El acceso es público nuevamente."
            });
        } catch (error) {
            toast.error("Error al cambiar estado");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header>
                <div className="flex items-center gap-3 mb-2 opacity-50">
                    <Database size={20} />
                    <span className="font-bold uppercase tracking-wider text-sm">Sistema</span>
                </div>
                <h1 className="text-3xl font-black text-white">Mantenimiento y Datos</h1>
                <p className="text-zinc-400">Gestiona la integridad y disponibilidad de la plataforma.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* BACKUP CARD */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all"></div>

                    <div className="relative z-10 flex-1">
                        <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                            <FileJson size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Backup Completo (JSON)</h3>
                        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                            Genera un archivo JSON encriptado con toda la información de usuarios, transacciones, deudas y configuraciones. Útil para migraciones o seguridad.
                        </p>
                    </div>

                    <button
                        onClick={handleBackup}
                        disabled={exporting}
                        className="relative z-10 w-full py-4 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {exporting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Descargar Copia
                            </>
                        )}
                    </button>
                    <p className="text-center mt-3 text-xs font-mono text-zinc-600">v1.0 • Schema Latest</p>
                </div>

                {/* MAINTENANCE CARD */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-all"></div>

                    <div className="relative z-10 flex-1">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors ${maintenance ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                            {maintenance ? <Lock size={24} /> : <ShieldAlert size={24} />}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Modo Mantenimiento</h3>
                        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                            Cierra el acceso público a la aplicación. Solo los usuarios con rol <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 px-1 rounded">ADMIN</span> podrán iniciar sesión o realizar acciones.
                        </p>
                    </div>

                    <button
                        onClick={handleMaintenance}
                        className={`relative z-10 w-full py-4 font-black rounded-xl transition-all flex items-center justify-center gap-2 border-2 ${maintenance ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
                    >
                        {maintenance ? "DESACTIVAR BLOG" : "ACTIVAR MANTENIMIENTO"}
                    </button>
                </div>

                {/* RESTORE CARD (Proximamente) */}
                <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-8 flex items-center justify-center gap-4 opacity-50 cursor-not-allowed hover:opacity-75 transition-opacity">
                    <Upload className="text-zinc-600" />
                    <span className="font-bold text-zinc-600">Restaurar Backup (Próximamente)</span>
                </div>
            </div>
        </div>
    );
}
