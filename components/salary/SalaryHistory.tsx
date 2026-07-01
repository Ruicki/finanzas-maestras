'use client';

import { deleteSalaryById } from "@/app/actions/salary";
import { deleteIncome } from "@/app/actions/budget";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, ChevronDown, ChevronUp } from "lucide-react";

import { confirmDelete } from "@/components/shared/DeleteConfirmation";
import { CategoryIcon } from "@/components/shared/CategoryIcon";


interface IncomeHistoryProps {
    salaries: any[];
    incomes: any[];
    onDataChange?: () => void;
    onEdit?: (item: any) => void;
}

export default function IncomeHistory({ salaries, incomes, onDataChange, onEdit }: IncomeHistoryProps) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const ITEMS_PER_PAGE = 5;

    const allItems = [
        ...salaries.map(s => ({ ...s, type: 'SALARY' as const })),
        ...incomes.map(i => ({ ...i, type: 'INCOME' as const }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    const currentItems = allItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    const toggleExpand = (key: string) => {
        setExpandedId(prev => prev === key ? null : key);
    };

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
            <div className="space-y-4">
                {currentItems.map((item) => {
                    const itemKey = `${item.type}-${item.id}`;
                    const isExpanded = expandedId === itemKey;
                    const isSalary = item.type === 'SALARY';

                    return (
                        <div key={itemKey} className="animate-in fade-in slide-in-from-bottom-2">
                            {/* Main Row */}
                            <div
                                onClick={() => isSalary && toggleExpand(itemKey)}
                                className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border transition-all group gap-4 md:gap-0 shadow-sm dark:shadow-none cursor-pointer ${
                                    isExpanded
                                        ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                                        : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30'
                                }`}
                            >
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${isSalary ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                        <CategoryIcon iconName={isSalary ? 'Building' : (item as any).icon || 'Wallet'} size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-zinc-800 dark:text-zinc-200 text-lg truncate">
                                            {isSalary ? (item.company || 'Salario Base') : item.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 font-medium mt-1">
                                            <span>{new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            <span className="hidden md:inline">•</span>
                                            <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg text-xs whitespace-nowrap">
                                                {isSalary ? (item.company || 'Personal') : (item.frequency || 'Pago Único')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end w-full md:w-auto gap-4 pl-16 md:pl-0">
                                    <span className={`block text-xl font-black blur-sensitive ${isSalary ? 'text-emerald-500 dark:text-emerald-400' : 'text-cyan-500 dark:text-cyan-400'}`}>
                                        ${isSalary ? Number(item.netVal).toFixed(2) : Number(item.amount).toFixed(2)}
                                    </span>

                                    {isSalary && (
                                        <span className="text-zinc-400 dark:text-zinc-500">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </span>
                                    )}

                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                        {onEdit && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                                className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); isSalary ? handleDeleteSalary(item.id) : handleDeleteIncome(item.id); }}
                                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Eliminar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2 2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Breakdown for Salaries */}
                            {isSalary && isExpanded && (
                                <div className="mx-2 mb-2 p-5 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/10 font-mono text-sm space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Bruto */}
                                    <div className="flex justify-between text-zinc-900 dark:text-zinc-100 font-semibold">
                                        <span>Salario Bruto</span>
                                        <span>${Number(item.grossVal).toFixed(2)}</span>
                                    </div>

                                    {/* Ausencias */}
                                    {item.absentDays > 0 && (
                                        <div className="flex justify-between text-red-500 dark:text-red-400 pl-4">
                                            <span>- Ausencias ({item.absentDays} día{item.absentDays > 1 ? 's' : ''})</span>
                                            <span>-${(Number(item.grossVal) - (Number(item.grossVal) - (Number(item.socialSec) + Number(item.eduIns) + Number(item.incomeTax)) - Number(item.netVal) + Number(item.bonus))).toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-zinc-200 dark:bg-white/10 my-2"></div>

                                    {/* Seguro Social */}
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span>Seguro Social (9.75%)</span>
                                        <span>-${Number(item.socialSec).toFixed(2)}</span>
                                    </div>

                                    {/* Seguro Educativo */}
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span>Seguro Educativo (1.25%)</span>
                                        <span>-${Number(item.eduIns).toFixed(2)}</span>
                                    </div>

                                    {/* ISR */}
                                    <div className="flex justify-between text-red-700 dark:text-red-300 font-bold">
                                        <span>ISR</span>
                                        <span>-${Number(item.incomeTax).toFixed(2)}</span>
                                    </div>

                                    <div className="h-px bg-zinc-200 dark:bg-white/10 my-2"></div>

                                    {/* Total Deducciones */}
                                    <div className="flex justify-between text-red-800 dark:text-red-300 font-bold">
                                        <span>TOTAL DEDUCCIONES</span>
                                        <span>-${Number(item.taxes).toFixed(2)}</span>
                                    </div>

                                    {/* Bonos */}
                                    {Number(item.bonus) > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                            <span>+ Bonos</span>
                                            <span>+${Number(item.bonus).toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-zinc-200 dark:bg-white/10 my-2"></div>

                                    {/* Neto */}
                                    <div className="flex justify-between text-lg font-black text-emerald-700 dark:text-emerald-400">
                                        <span>= NETO RECIBIDO</span>
                                        <span>${Number(item.netVal).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
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
