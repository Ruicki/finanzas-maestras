'use client';

import { Profile } from '@prisma/client';
import { User, Plus, Settings } from "lucide-react";

interface ProfileSelectorProps {
    profiles: Profile[];
    onSelect: (profileId: number) => void;
    onManage: () => void;
}

export default function ProfileSelector({ profiles, onSelect, onManage }: ProfileSelectorProps) {
    return (
        <div className="fixed inset-0 bg-zinc-900 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-12 tracking-tight text-center">
                ¿Quién está gestionando?
            </h1>

            <div className="flex flex-wrap gap-8 justify-center items-center max-w-4xl">
                {profiles.map((profile) => (
                    <div key={profile.id} className="group flex flex-col items-center gap-4 cursor-pointer" onClick={() => onSelect(profile.id)}>
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-zinc-800 border-2 border-transparent group-hover:border-white group-hover:scale-105 transition-all duration-300 flex items-center justify-center relative overflow-hidden shadow-2xl">
                            {/* Fondo degradado basado en ID para actuar como "Avatar" */}
                            <div className={`absolute inset-0 opacity-50 bg-linear-to-br ${getGradient(profile.id)}`}></div>
                            <span className="text-5xl font-bold text-white relative z-10 select-none">
                                {profile.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className="text-zinc-400 text-xl font-medium group-hover:text-white transition-colors">
                            {profile.name}
                        </span>
                        {/* Insignia de Admin */}
                        {profile.role === 'ADMIN' && (
                            <span className="bg-amber-500/20 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/50 mt-1">
                                ADMIN
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Insignia/Info de Admin */}
            <div className="absolute bottom-10 text-zinc-600 font-medium">
                Gestor de Salarios v2.0
            </div>
        </div >
    );
}

// Helper para generar degradados geniales deterministas basados en ID
function getGradient(id: number) {
    const gradients = [
        "from-blue-600 to-cyan-400",
        "from-purple-600 to-pink-400",
        "from-emerald-500 to-teal-400",
        "from-orange-500 to-yellow-400",
        "from-red-600 to-rose-400",
        "from-indigo-600 to-violet-400",
    ];
    return gradients[id % gradients.length];
}
