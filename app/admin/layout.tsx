import { getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    Database,
    LogOut,
    Menu,
    X,
    ServerCrash,
    Megaphone
} from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    if (!session) redirect("/login");

    const profile = await prisma.profile.findUnique({ where: { id: session } });
    if (!profile || profile.role !== 'ADMIN') redirect("/");

    const navItems = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Usuarios", href: "/admin/users", icon: Users },
        { name: "Auditoría", href: "/admin/audit", icon: ShieldAlert },
        { name: "Sistema & Backups", href: "/admin/system", icon: Database },
        { name: "Anuncios", href: "/admin/announcements", icon: Megaphone },
    ];

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Sidebar Desktop */}
            <aside className="hidden  md:flex w-64 flex-col border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ServerCrash className="text-white" size={20} />
                    </div>
                    <span className="font-black text-lg tracking-tight text-white">Power<span className="text-zinc-500">Suite</span></span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-zinc-800/50 hover:text-white group"
                        >
                            <item.icon size={18} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                            <span className="font-bold text-sm">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                        <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Admin Logged</p>
                        <p className="text-sm font-bold text-white truncate">{profile.name}</p>
                    </div>
                </div>
            </aside>

            {/* Mobile Header would go here (Simplified for now) */}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-black relative">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"}}></div>
                <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
