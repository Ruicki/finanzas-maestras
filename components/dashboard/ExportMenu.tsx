'use client';

import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ProfileWithData } from '@/types';
import { generateTransactionsCSV, downloadCSV } from '@/lib/export';
import { toast } from 'sonner';

interface ExportMenuProps {
    profile: ProfileWithData;
}

export default function ExportMenu({ profile }: ExportMenuProps) {

    const handleExport = () => {
        try {
            const csv = generateTransactionsCSV(profile);
            const filename = `finanzas_master_export_${new Date().toISOString().split('T')[0]}.csv`;
            downloadCSV(csv, filename);
            toast.success("Archivo CSV generado exitosamente");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error al generar el reporte");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
                    title="Exportar Datos"
                >
                    <Download className="w-5 h-5" />
                    <span className="hidden md:inline">Exportar</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <DropdownMenuLabel>Opciones de Exportación</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleExport}
                    className="cursor-pointer rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-800 py-2.5 px-3 flex items-center gap-2"
                >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span>Transacciones (CSV)</span>
                </DropdownMenuItem>
                {/* 
                <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed py-2.5 px-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Reporte PDF (Próximamente)</span>
                </DropdownMenuItem> 
                */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
