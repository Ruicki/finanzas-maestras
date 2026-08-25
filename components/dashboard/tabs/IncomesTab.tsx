import { useState } from 'react';
import { ProfileWithData } from '@/types';

type AdditionalIncome = ProfileWithData['incomes'][number];
type Salary = ProfileWithData['salaries'][number];
type Account = ProfileWithData['accounts'][number];
import { deleteIncome } from '@/app/actions/budget'; // Eliminada importación createIncome ya que se maneja por Wizard
import { toast } from 'sonner';
import { confirmDelete } from '@/components/shared/DeleteConfirmation';
import SalaryCalculator from '@/components/salary/SalaryCalculator';
import IncomeHistory from '@/components/salary/SalaryHistory';
import IncomeWizard from '@/components/incomes/IncomeWizard';
import { PlusIcon } from '@animateicons/react/lucide';

interface IncomesTabProps {
    incomes: AdditionalIncome[];
    salaries: Salary[];
    accounts: Account[];
    profileId: number;
    customDeductions?: string | null;
    onUpdate: () => void;
}

export default function IncomesTab({ incomes, salaries, accounts, profileId, customDeductions, onUpdate }: IncomesTabProps) {
    const [showIncomeWizard, setShowIncomeWizard] = useState(false);
    const [incomeToEdit, setIncomeToEdit] = useState<any | null>(null);

    const latestSalary = salaries && salaries.length > 0 ? salaries[0] : null;

    async function handleDelete(id: number) {
        confirmDelete(async () => {
            try {
                await deleteIncome(id);
                onUpdate();
                toast.success("Ingreso eliminado");
            } catch (error) {
                toast.error("Error eliminando ingreso");
            }
        });
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 pt-6">
            <div className="space-y-8">
                {/* Sección Hero / Acción */}
                <div className="relative overflow-hidden bg-white dark:bg-zinc-900 text-black dark:text-white p-10 rounded-[2.5rem] shadow-xl text-center space-y-6 border border-zinc-200 dark:border-zinc-800">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#519A66]/10 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#1591DC]/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div
                            onClick={() => { setIncomeToEdit(null); setShowIncomeWizard(true); }}
                            className="w-20 h-20 bg-zinc-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm cursor-pointer hover:scale-110 transition-transform"
                        >
                            <PlusIcon className="w-8 h-8 text-[#237227] dark:text-white" />
                        </div>
                        <h3 className="text-3xl font-black mb-2 tracking-tight">Nuevo Ingreso</h3>
                        <p className="text-zinc-500 dark:text-white/70 max-w-sm mx-auto text-lg leading-relaxed">
                            Registra salarios, bonos o dinero extra para mantener tus cuentas claras.
                        </p>
                    </div>

                    <button
                        onClick={() => { setIncomeToEdit(null); setShowIncomeWizard(true); }}
                        className="relative z-10 bg-[#519A66] dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg"
                    >
                        Registrar Ahora
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                    <div className="flex justify-between items-center mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                        <div>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Historial</h3>
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide mt-1">Últimos movimientos</p>
                        </div>
                    </div>

                    {/* Nuevo Modal de Asistente de Ingresos */}
                    {showIncomeWizard && (
                        <IncomeWizard
                            accounts={accounts}
                            profileId={profileId}
                            initialData={incomeToEdit}
                            isEditing={!!incomeToEdit}
                            onClose={() => { setShowIncomeWizard(false); setIncomeToEdit(null); }}
                            onSuccess={() => {
                                setShowIncomeWizard(false);
                                setIncomeToEdit(null);
                                onUpdate();
                            }}
                        />
                    )}

                    {/* Empty State Check */}
                    {(salaries.length === 0 && incomes.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-full mb-4">
                                <span className="text-4xl grayscale opacity-50">💰</span>
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Sin ingresos registrados</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mb-6 text-sm">
                                Comienza registrando tu salario o ingresos extra para calcular tu presupuesto.
                            </p>
                            <button
                                onClick={() => { setIncomeToEdit(null); setShowIncomeWizard(true); }}
                                className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-sm"
                            >
                                Añadir Ingreso
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <IncomeHistory
                                salaries={salaries}
                                incomes={incomes}
                                onDataChange={onUpdate}
                                onEdit={(item) => {
                                    setIncomeToEdit(item);
                                    setShowIncomeWizard(true);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
