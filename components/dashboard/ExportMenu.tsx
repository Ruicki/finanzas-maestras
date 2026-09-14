'use client';

import React, { useState } from 'react';
import { DownloadIcon, FileSpreadsheetIcon } from '@animateicons/react/lucide';
import { Wallet } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ProfileWithData } from '@/types';
import { getExportData } from '@/app/actions/export';
import { generateTransactionsCSV, generateSnapshotCSV, downloadCSV } from '@/lib/export';
import { toast } from 'sonner';

interface ExportMenuProps {
    profile: ProfileWithData;
}

export default function ExportMenu({ profile }: ExportMenuProps) {
    const [exportando, setExportando] = useState(false);

    /**
     * Los datos se piden al servidor en el momento de exportar, no vienen con
     * el perfil del dashboard: las transferencias cuelgan de las cuentas y
     * traerlas en cada visita seria pagar en toda la app por algo que se usa de
     * vez en cuando.
     */
    async function exportar(tipo: 'movimientos' | 'situacion') {
        if (exportando) return;
        setExportando(true);
        try {
            const datos = await getExportData(profile.id);
            const fecha = new Date().toISOString().split('T')[0];
            if (tipo === 'movimientos') {
                downloadCSV(generateTransactionsCSV(datos), `finanzas-movimientos-${fecha}.csv`);
            } else {
                downloadCSV(generateSnapshotCSV(datos), `finanzas-situacion-${fecha}.csv`);
            }
            toast.success('Archivo CSV generado');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? `No se pudo exportar: ${error.message}`
                    : 'No se pudo generar el archivo',
            );
        } finally {
            setExportando(false);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    title="Exportar Datos"
                    disabled={exportando}
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span className="hidden md:inline">{exportando ? 'Generando…' : 'Exportar'}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                <DropdownMenuLabel>Exportar tus datos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => exportar('movimientos')}
                    className="cursor-pointer rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-800 py-2.5 px-3 flex items-start gap-2"
                >
                    <FileSpreadsheetIcon className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span className="flex flex-col">
                        <span>Movimientos</span>
                        <span className="text-xs text-zinc-500">Salarios, ingresos, gastos y transferencias</span>
                    </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => exportar('situacion')}
                    className="cursor-pointer rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-800 py-2.5 px-3 flex items-start gap-2"
                >
                    <Wallet className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <span className="flex flex-col">
                        <span>Situación actual</span>
                        <span className="text-xs text-zinc-500">Cuentas, tarjetas, préstamos y metas</span>
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
