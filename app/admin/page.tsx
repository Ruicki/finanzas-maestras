import { getGlobalStats } from "@/app/actions/budget";
import { Users, DollarSign, CreditCard, Activity } from "lucide-react";

export default async function AdminDashboard() {
    const stats = await getGlobalStats();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header>
                <h1 className="text-3xl font-black text-white mb-2">Panel de Control</h1>
                <p className="text-zinc-400">Visión global del sistema en tiempo real.</p>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Usuarios Totales"
                    value={stats.users.toString()}
                    icon={Users}
                    trend="+2 this week"
                    color="text-indigo-400"
                    bg="bg-indigo-500/10"
                />
                <StatCard
                    title="Dinero Gestionado"
                    value={`$${stats.money.toLocaleString()}`}
                    icon={DollarSign}
                    trend="System Wide"
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <StatCard
                    title="Deuda Total"
                    value={`$${stats.debt.toLocaleString()}`}
                    icon={CreditCard}
                    trend="Global Liability"
                    color="text-rose-400"
                    bg="bg-rose-500/10"
                />
                <StatCard
                    title="Transacciones"
                    value={stats.expenses.toString()}
                    icon={Activity}
                    trend="Expenses Tracked"
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
            </div>

            {/* Placeholder for future widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 min-h-[300px] flex items-center justify-center border-dashed">
                    <p className="text-zinc-600 font-bold">Gráfico de Actividad (Próximamente)</p>
                </div>
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 min-h-[300px] flex items-center justify-center border-dashed">
                    <p className="text-zinc-600 font-bold">Distribución de Usuarios (Próximamente)</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, trend, color, bg }: any) {
    return (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bg} ${color}`}>
                    <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-zinc-500 py-1 px-2 rounded-full bg-zinc-800/50">{trend}</span>
            </div>
            <div>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
        </div>
    );
}
