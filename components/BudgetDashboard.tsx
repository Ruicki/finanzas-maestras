'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getProfiles } from '@/app/actions/budget';
import { logout, stopImpersonation } from '@/app/actions/auth';
import MonthSelector from '@/components/dashboard/MonthSelector';
import ExportMenu from '@/components/dashboard/ExportMenu';
import { ProfileWithData } from '@/types';
import { SettingsIcon, LogOutIcon, EyeIcon, EyeOffIcon, WalletIcon, TrendingUpIcon, DollarSignIcon, CreditCardIcon as CardIcon } from '@animateicons/react/lucide';
import { Briefcase, Landmark, Target } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

// Tabs
import IncomesTab from '@/components/dashboard/tabs/IncomesTab';
import ExpensesTab from '@/components/dashboard/tabs/ExpensesTab';
import GoalsTab from '@/components/dashboard/tabs/GoalsTab';
import DebtsTab from '@/components/dashboard/tabs/DebtsTab';
import BudgetsTab from '@/components/dashboard/tabs/BudgetsTab';
import AccountsTab from '@/components/dashboard/tabs/AccountsTab';
import InsightsTab from '@/components/dashboard/tabs/InsightsTab';
import UserSettingsModal from '@/components/dashboard/modals/UserSettingsModal';
import ProfileManagerModal from '@/components/dashboard/modals/ProfileManagerModal';

interface BudgetDashboardProps {
    initialProfile: ProfileWithData;
    isImpersonating?: boolean;
}

export default function BudgetDashboard({ initialProfile, isImpersonating = false }: BudgetDashboardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const currentTab = searchParams.get('tab') || 'accounts';
    const [activeTab, setActiveTab] = useState(currentTab);
    const [activeProfile, setActiveProfile] = useState<ProfileWithData>(initialProfile);
    const [showUserSettings, setShowUserSettings] = useState(false);
    const [showProfileManager, setShowProfileManager] = useState(false);
    const [isPrivateMode, setIsPrivateMode] = useState(false);

    // Date State (New)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        setSelectedDate(new Date());
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (params.get('tab') !== activeTab) {
            params.set('tab', activeTab);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [activeTab, searchParams, pathname, router]);

    // Sync state with props (Server Actions + router.refresh())
    useEffect(() => {
        if (initialProfile) {
            setActiveProfile(initialProfile);
        }
    }, [initialProfile]);

    const refreshData = async () => {
        try {
            const profiles = await getProfiles();
            const updated = profiles.find(p => p.id === activeProfile.id);
            if (updated) setActiveProfile(updated);
        } catch (error) {
            console.error("Error refreshing data:", error);
            toast.error("Error al actualizar datos");
        }
    };

    const handleLogout = async () => {
        try {
            await logout(); // Server Action
        } catch (error) {
            console.error("Logout failed", error);
            // Fallback: force hard reload to login
            window.location.href = '/login';
        }
    };

    const updateTab = (tab: string) => setActiveTab(tab);

    // --- CÁLCULOS GLOBALES (Filtrados por FECHA) ---
    const currentDate = selectedDate ?? new Date(2000, 0, 1);
    const selectedMonth = currentDate.getMonth();
    const selectedYear = currentDate.getFullYear();

    // Helper: Filter by selected month
    // Helper: Filter by selected month using ISO String (UTC) to match database storage
    const isInSelectedMonth = (dateStr: Date | string) => {
        if (!dateStr) return false;
        // Ensure we are working with an ISO string (UTC)
        const iso = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
        // Construct target YYYY-MM
        const targetMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
        // Compare strictly with the start of the ISO string (e.g., "2024-02")
        // This relies on our logic of saving dates as Noon UTC, so the UTC date IS the intended date.
        return iso.startsWith(targetMonth);
    };

    // Filtered Lists
    // Recurring expenses appear in ALL months; one-time expenses only in their creation month
    const expensesList = activeProfile?.expenses?.filter((e) => {
        if (e.category === 'Deudas' || e.category === 'Pagos Tarjeta') return false;
        if (e.isRecurring) return true;
        return isInSelectedMonth(e.createdAt);
    }) || [];

    // Monthly Totals (Filtered)
    const totalExpenses = expensesList.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Debt Payments: use actual credit card minimums + loan payments (not expense category)
    const totalCCPayments = (activeProfile?.creditCards || []).reduce((sum, cc) => {
        const balance = Number(cc.balance);
        if (balance <= 0) return sum;
        const rate = Number(cc.interestRate || 0);
        const insurance = Number(cc.insuranceRate || 0.25);
        const minPct = Number(cc.minPaymentPercentage || 3);
        const interest = balance * (rate / 100);
        const ins = balance * (insurance / 100);
        const capital = balance * (minPct / 100);
        return sum + interest + ins + capital;
    }, 0);
    const totalLoanPayments = (activeProfile?.loans || []).reduce((sum, loan) => sum + Number(loan.monthlyPayment || 0), 0);
    const totalDebtPayments = totalCCPayments + totalLoanPayments;

    // Goals: only count goals WITHOUT destination account (money already in accounts with destination is counted in totalAssets)
    const goalsWithoutDestination = activeProfile?.goals?.filter(g => !g.destinationAccountId) || [];
    const totalGoalsSaved = goalsWithoutDestination.reduce((sum, g) => sum + Number(g.currentAmount), 0) || 0;

    // Income Calculation (Filtered)
    const allSalaries = activeProfile?.salaries || [];
    const currentMonthSalaries = allSalaries.filter((s) => isInSelectedMonth(s.createdAt));
    const baseIncome = currentMonthSalaries.reduce((sum, s) => sum + Number(s.netVal), 0);

    const additionalIncomes = activeProfile?.incomes || [];
    const monthlyAdditionalIncome = additionalIncomes.reduce((acc, inc) => {
        // ONE_TIME -> Only the month of the income date (fallback a createdAt)
        if (inc.type === 'ONE_TIME') {
            return isInSelectedMonth(inc.date || inc.createdAt) ? acc + Number(inc.amount) : acc;
        }
        // Recurring -> Always count (Assume active)
        if (inc.frequency === 'MONTHLY') return acc + Number(inc.amount);
        if (inc.frequency === 'BIWEEKLY') return acc + (Number(inc.amount) * 2);
        if (inc.frequency === 'WEEKLY') return acc + (Number(inc.amount) * 4);
        return acc;
    }, 0);

    const totalMonthlyIncome = baseIncome + monthlyAdditionalIncome;

    // --- GLOBAL SNAPSHOTS (All Time) ---
    // Balance: only SPENDING accounts (operational money)
    const spendingAccounts = activeProfile?.accounts?.filter(acc => acc.purpose !== 'SAVINGS') || [];
    const balance = spendingAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    // Total assets: all accounts (for net worth)
    const totalAssets = activeProfile?.accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

    // Spending breakdown by type
    const bankBalance = spendingAccounts.filter(a => a.type === 'BANK').reduce((s, a) => s + Number(a.balance), 0);
    const cashBalance = spendingAccounts.filter(a => a.type === 'CASH').reduce((s, a) => s + Number(a.balance), 0);
    const walletBalance = spendingAccounts.filter(a => a.type === 'WALLET').reduce((s, a) => s + Number(a.balance), 0);

    // Net Worth Calc
    const totalLoans = activeProfile?.loans?.reduce((sum, loan) => sum + Number(loan.currentBalance), 0) || 0;
    const totalCreditDebt = (activeProfile?.creditCards?.reduce((sum, card) => sum + Number(card.balance), 0) || 0) + totalLoans;
    // Net Worth = Assets (All accounts + Goals) - Liabilities (Debt)
    const netWorth = totalAssets + totalGoalsSaved - totalCreditDebt;

    return (
        <div className={`w-full max-w-[1400px] mx-auto space-y-12 p-6 md:p-12 pb-32 ${isPrivateMode ? 'private-mode' : ''}`}>
            {/* IMPERSONATION BANNER */}
            {isImpersonating && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-indigo-400">
                        <div className="flex items-center gap-2">
                            <EyeIcon size={18} />
                            <span className="font-bold text-sm">Viendo como: {activeProfile.name}</span>
                        </div>
                        <button
                            onClick={async () => {
                                await stopImpersonation();
                                toast.success("Volviendo a tu perfil...");
                                router.refresh();
                            }}
                            className="bg-white text-indigo-600 px-3 py-1 rounded-full text-xs font-black hover:bg-indigo-50 transition-colors"
                        >
                            SALIR
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-10">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-400 dark:to-zinc-600 mb-4">
                        Finanzas Maestras
                    </h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <p className="text-zinc-500 dark:text-white/70 font-bold text-lg">Control total de tu flujo.</p>

                        {/* Month Selector */}
                        <MonthSelector
                            currentDate={selectedDate}
                            onMonthChange={setSelectedDate}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <button
                        onClick={() => setIsPrivateMode(!isPrivateMode)}
                        className={`p-3 rounded-2xl border transition-all relative group overflow-hidden ${isPrivateMode ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-400'}`}
                        title="Modo Privado (Blur)"
                    >
                        {isPrivateMode ? <EyeOffIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                    </button>

                    <ThemeToggle />

                    <ExportMenu profile={activeProfile} />

                    <button
                        onClick={() => setShowUserSettings(true)}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span className="hidden md:inline">Ajustes</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
                    >
                        <LogOutIcon className="w-5 h-5" />
                        <span className="hidden md:inline">Salir</span>
                    </button>

                    {activeProfile?.role === 'ADMIN' && (
                        <button
                            onClick={() => setShowProfileManager(true)}
                            className="bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Briefcase className="w-5 h-5 lucide-animated" />
                            <span className="hidden md:inline">Gestionar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {showUserSettings && (
                <UserSettingsModal
                    isOpen={showUserSettings}
                    onClose={() => setShowUserSettings(false)}
                    profile={activeProfile}
                    onUpdate={refreshData}
                />
            )}
            {showProfileManager && activeProfile?.role === 'ADMIN' && (
                <ProfileManagerModal
                    isOpen={showProfileManager}
                    onClose={() => setShowProfileManager(false)}
                    currentUser={activeProfile}
                />
            )}

            {/* DASHBOARD CONTENT */}
            {activeProfile ? (
                <>
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* 1. Cash Available */}
                        <div className="bg-white dark:bg-[#0d1b2a] border border-zinc-200 dark:border-[#1591DC]/30 p-6 rounded-4xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <WalletIcon className="w-20 h-20 text-[#1591DC]" />
                            </div>
                            <p className="text-zinc-500 font-bold mb-1 uppercase text-xs tracking-wider">Dinero disponible</p>
                            <p className={`text-3xl md:text-4xl font-black relative z-10 blur-sensitive ${balance >= 0 ? 'text-[#1591DC] dark:text-[#5ba8e0]' : 'text-red-500'}`}>
                                ${balance.toFixed(2)}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                                {bankBalance > 0 && <span className="text-[#1591DC]">Banco ${bankBalance.toFixed(0)}</span>}
                                {cashBalance > 0 && <span className="text-[#519A66]">Efectivo ${cashBalance.toFixed(0)}</span>}
                                {walletBalance > 0 && <span className="text-zinc-600 dark:text-zinc-400">Billetera ${walletBalance.toFixed(0)}</span>}
                            </div>
                        </div>

                        {/* 2. Net Worth */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-6 rounded-4xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUpIcon className={`w-20 h-20 ${netWorth >= 0 ? 'text-[#519A66]' : 'text-red-500'}`} />
                            </div>
                            <p className="text-zinc-500 font-bold mb-1 uppercase text-xs tracking-wider">Patrimonio Neto</p>
                            <p className={`text-3xl md:text-4xl font-black relative z-10 blur-sensitive ${netWorth >= 0 ? 'text-[#519A66] dark:text-[#6dc28a]' : 'text-red-500'}`}>
                                ${netWorth.toFixed(2)}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-[#519A66]">Ingresos ${totalMonthlyIncome.toFixed(0)}</span>
                                <span className="text-zinc-300 dark:text-zinc-600">vs</span>
                                <span className="text-red-400">Gastos ${totalExpenses.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* 3. Monthly Income (Filtered) */}
                        <div className="bg-white dark:bg-[#0f2318] border border-zinc-200 dark:border-[#519A66]/30 p-6 rounded-4xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSignIcon className="w-20 h-20 text-[#519A66]" />
                            </div>
                            <p className="text-zinc-500 font-bold mb-1 uppercase text-xs tracking-wider">Ingresos (Mes)</p>
                            <p className="text-3xl md:text-4xl font-black text-[#519A66] dark:text-[#6dc28a] relative z-10 blur-sensitive">
                                +${totalMonthlyIncome.toFixed(2)}
                            </p>
                        </div>

                        {/* 4. Total Debt */}
                        <div className="bg-white dark:bg-[#2a0f14] border border-zinc-200 dark:border-red-500/30 p-6 rounded-4xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUpIcon className="w-20 h-20 text-red-500" />
                            </div>
                            <p className="text-zinc-500 font-bold mb-1 uppercase text-xs tracking-wider">Deuda Total</p>
                            <p className="text-3xl md:text-4xl font-black text-red-500 relative z-10 blur-sensitive">
                                -${totalCreditDebt.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* TABS NAVIGATION */}
                    <div className="bg-white dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-xl relative md:sticky md:top-6 z-40 mb-8 md:mb-0 shadow-xl shadow-zinc-200/50 dark:shadow-none mx-auto max-w-5xl">
                        <div className="grid grid-cols-3 md:flex md:justify-between gap-1">
                            {/* Accounts */}
                            <button onClick={() => updateTab('accounts')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'accounts' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                <Landmark className="lucide-animated" size={18} />
                                <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Cuentas</span>
                            </button>
                            {/* Incomes */}
                            <button onClick={() => updateTab('incomes')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'incomes' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                <DollarSignIcon size={18} />
                                <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Ingresos</span>
                            </button>
                            {/* Expenses */}
                            <button onClick={() => updateTab('expenses')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'expenses' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                <TrendingUpIcon size={18} />
                                <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Gastos</span>
                            </button>
                            {/* Goals */}
                            <button onClick={() => updateTab('goals')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'goals' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                <Target className="lucide-animated" size={18} />
                                <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Metas</span>
                            </button>
                            {/* Debts */}
                            <button onClick={() => updateTab('debts')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'debts' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                <CardIcon size={18} />
                                <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Deudas</span>
                            </button>
                            {/* Budgets */}
                            <button onClick={() => updateTab('budgets')} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-3 px-2 md:px-6 rounded-xl transition-all duration-300 md:flex-1 ${activeTab === 'budgets' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                <TrendingUpIcon size={18} />
                                <span className="text-[10px] md:text-sm font-bold uppercase md:normal-case tracking-wide">Presupuesto</span>
                            </button>
                        </div>
                    </div>

                    {/* TABS CONTENT */}
                    <div className="min-h-[500px]">
                        {activeTab === 'accounts' && (
                            <AccountsTab
                                accounts={activeProfile.accounts || []}
                                profileId={activeProfile.id}
                                onUpdate={refreshData}
                            />
                        )}

                        {activeTab === 'incomes' && (
                            <IncomesTab
                                incomes={activeProfile.incomes || []}
                                salaries={allSalaries}
                                accounts={activeProfile.accounts || []}
                                profileId={activeProfile.id}
                                onUpdate={refreshData}
                            />
                        )}

                        {activeTab === 'expenses' && (
                            <ExpensesTab
                                expenses={expensesList}
                                creditCards={activeProfile.creditCards || []}
                                accounts={activeProfile.accounts || []}
                                categories={activeProfile.categories || []}
                                profileId={activeProfile.id}
                                profileName={activeProfile.name}
                                onUpdate={refreshData}
                            />
                        )}

                        {activeTab === 'goals' && (
                            <GoalsTab
                                goals={activeProfile.goals || []}
                                accounts={activeProfile.accounts || []}
                                profileId={activeProfile.id}
                                onUpdate={refreshData}
                            />
                        )}

                        {activeTab === 'debts' && (
                            <DebtsTab
                                creditCards={activeProfile.creditCards || []}
                                loans={activeProfile.loans || []}
                                accounts={activeProfile.accounts || []}
                                profileId={activeProfile.id}
                                profileName={activeProfile.name}
                                onUpdate={refreshData}
                            />
                        )}

                        {activeTab === 'budgets' && (
                            <BudgetsTab
                                categories={activeProfile.categories || []}
                                expenses={expensesList}
                                allExpenses={activeProfile?.expenses?.filter((e) => e.category !== 'Deudas' && e.category !== 'Pagos Tarjeta') || []}
                                creditCards={activeProfile.creditCards || []}
                                accounts={activeProfile.accounts || []}
                                profileId={activeProfile.id}
                                totalIncome={totalMonthlyIncome}
                                totalDebtPayments={totalDebtPayments}
                                totalSavings={totalGoalsSaved}
                                totalCash={balance}
                                currentMonth={selectedMonth}
                                currentYear={selectedYear}
                                onUpdate={refreshData}
                            />
                        )}

                        {activeTab === 'insights' && (
                            <InsightsTab
                                expenses={expensesList}
                                allExpenses={activeProfile?.expenses?.filter((e) => e.category !== 'Deudas' && e.category !== 'Pagos Tarjeta') || []}
                                categories={activeProfile.categories || []}
                                incomes={additionalIncomes}
                                salaries={allSalaries}
                            />
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="h-4 w-32 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    );
}
