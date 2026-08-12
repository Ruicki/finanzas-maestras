import Link from 'next/link';
import { ArrowRight, CheckCircle, Smartphone, Shield, BarChart3, PieChart, Wallet } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white selection:bg-indigo-500 selection:text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-black text-xl rotate-3">
                            $
                        </div>
                        <span className="font-black text-xl tracking-tight hidden sm:block">Finanzas Maestras</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="font-bold text-sm hover:text-indigo-600 transition-colors">
                            Iniciar Sesión
                        </Link>
                        <Link
                            href="/register"
                            className="bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                        >
                            Comenzar Gratis
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Versión 2.0 Ahora Disponible
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.9] bg-clip-text text-transparent bg-linear-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Domina tu dinero <br className="hidden md:block" />
                        <span className="text-indigo-600 dark:text-indigo-400">sin complicaciones.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-500 dark:text-zinc-400 font-medium mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        Olvídate de las hojas de cálculo aburridas. Gestiona ingresos, gastos, deudas y metas con una interfaz diseñada para enamorarte de tus finanzas.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            Crear Cuenta Gratis
                            <ArrowRight size={20} />
                        </Link>
                        <Link
                            href="/login"
                            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold text-lg transition-all"
                        >
                            Ya tengo cuenta
                        </Link>
                    </div>
                </div>

                {/* Dashboard Preview / Mockup */}
                <div className="mt-20 max-w-6xl mx-auto relative z-10 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                    <div className="relative rounded-4xl overflow-hidden border-8 border-zinc-900 dark:border-zinc-800 shadow-2xl bg-zinc-900">
                        <img
                            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop"
                            alt="Dashboard Preview App"
                            className="w-full h-auto opacity-50 blur-sm scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h3 className="text-white text-3xl md:text-5xl font-black text-center px-4 drop-shadow-lg">
                                Tu Dashboard Financiero <br />
                                <span className="text-emerald-400">Simplificado</span>
                            </h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-32 px-6 bg-zinc-50 dark:bg-zinc-950/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Wallet className="w-8 h-8 text-pink-500" />}
                            title="Control de Gastos"
                            desc="Categoriza cada centavo. Visualiza a dónde va tu dinero con gráficos intuitivos."
                        />
                        <FeatureCard
                            icon={<Target className="w-8 h-8 text-indigo-500" />}
                            title="Metas de Ahorro"
                            desc="Define objetivos, asigna fondos y celebra cada vez que rompes la alcancía."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="w-8 h-8 text-emerald-500" />}
                            title="Reportes Inteligentes"
                            desc="Entiende tus hábitos de consumo y optimiza tu presupuesto mes a mes."
                        />
                    </div>
                </div>
            </section>

            {/* Steps Section */}
            <section className="py-32 px-6 bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-900">
                <div className="max-w-7xl mx-auto text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">Empezar es ridículamente fácil</h2>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-zinc-100 dark:bg-zinc-800 -z-10" />

                    <StepCard number="01" title="Crea tu Cuenta" desc="Regístrate en segundos. Solo necesitas un correo." />
                    <StepCard number="02" title="Registra Saldos" desc="Ingresa tus cuentas, efectivo y tarjetas actuales." />
                    <StepCard number="03" title="Toma el Control" desc="Empieza a registrar movimientos y ver estadísticas." />
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-32 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto bg-zinc-900 dark:bg-zinc-50 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/30 rounded-full blur-[80px] pointer-events-none" />

                    <h2 className="text-4xl md:text-6xl font-black text-white dark:text-black mb-8 relative z-10">
                        ¿Listo para dominar <br /> tus finanzas?
                    </h2>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 bg-white dark:bg-black text-black dark:text-white px-10 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-xl relative z-10"
                    >
                        Únete Ahora
                        <ArrowRight />
                    </Link>
                </div>
            </section>

            <footer className="py-12 text-center text-zinc-400 text-sm font-medium border-t border-zinc-100 dark:border-zinc-900">
                <p>&copy; {new Date().getFullYear()} Finanzas Maestras. Diseñado para la excelencia.</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-4xl border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none hover:-translate-y-2 transition-transform duration-300">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-black mb-3">{title}</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">{desc}</p>
        </div>
    );
}

function StepCard({ number, title, desc }: { number: string, title: string, desc: string }) {
    return (
        <div className="bg-white dark:bg-black p-6 rounded-2xl md:bg-transparent">
            <div className="w-24 h-24 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center text-3xl font-black mb-6 mx-auto shadow-xl rotate-3">
                {number}
            </div>
            <h3 className="text-2xl font-black mb-3 text-center">{title}</h3>
            <p className="text-zinc-500 font-medium text-center leading-relaxed">{desc}</p>
        </div>
    );
}

import { Target } from 'lucide-react';
