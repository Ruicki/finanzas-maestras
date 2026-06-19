'use client';

import { Salary, AdditionalIncome } from "@prisma/client";
import { deleteSalaryById } from "@/app/actions/salary";
import { deleteIncome } from "@/app/actions/budget";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";

import { confirmDelete } from "@/components/shared/DeleteConfirmation";
import { CategoryIcon } from "@/components/shared/CategoryIcon";


interface IncomeHistoryProps {
    salaries: any[];
    incomes: any[];
    onDataChange?: () => void;
    onEdit?: (item: any) => void; // New Prop
}

type HistoryItem = any;

export default function IncomeHistory({ salaries, incomes, onDataChange, onEdit }: IncomeHistoryProps) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Combinar y ordenar
    const allItems = [
        ...salaries.map(s => ({ ...s, type: 'SALARY' })),
        ...incomes.map(i => ({ ...i, type: 'INCOME' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginación
    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    const currentItems = allItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    // Handlers
    async function handleDeleteSalary(id: number) {
        confirmDelete(async () => {
            try {
                await deleteSalaryById(id);
                toast.success("Salario eliminado");
                if (onDataChange) onDataChange();
                router.refresh();
            } catch (error) {
                toast.error("Error al eliminar");
            }
        });
    }

    async function handleDeleteIncome(id: number) {
        confirmDelete(async () => {
            try {
                await deleteIncome(id);
                toast.success("Ingreso eliminado");
                if (onDataChange) onDataChange();
                router.refresh();
            } catch (error) {
                toast.error("Error al eliminar");
            }
        });
    }

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Lista Paginada */}
            <div className="space-y-4">
                {currentItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30 transition-all group gap-4 md:gap-0 shadow-sm dark:shadow-none animate-in fade-in slide-in-from-bottom-2">
                        {/* ... Existing Item Content ... */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${item.type === 'SALARY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                <CategoryIcon iconName={item.type === 'SALARY' ? 'Building' : (item as any).icon || 'Wallet'} size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-zinc-800 dark:text-zinc-200 text-lg truncate">
                                    {item.type === 'SALARY' ? 'Salario Base' : item.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 font-medium mt-1">
                                    <span>{new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    <span className="hidden md:inline">•</span>
                                    <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg text-xs whitespace-nowrap">
                                        {item.type === 'SALARY'
                                            ? (item.company || 'Personal')
                                            : (item.frequency || 'Pago Único')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end w-full md:w-auto gap-4 pl-16 md:pl-0">
                            <span className={`block text-xl font-black blur-sensitive ${item.type === 'SALARY' ? 'text-emerald-500 dark:text-emerald-400' : 'text-cyan-500 dark:text-cyan-400'}`}>
                                ${item.type === 'SALARY' ? Number(item.netVal).toFixed(2) : Number(item.amount).toFixed(2)}
                            </span>

                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(item)}
                                        className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => item.type === 'SALARY' ? handleDeleteSalary(item.id) : handleDeleteIncome(item.id)}
                                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Eliminar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2 2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        &larr; Anterior
                    </button>
                    <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        Siguiente &rarr;
                    </button>
                </div>
            )}
        </div>
    );
}
