'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import BudgetDashboard from '@/components/BudgetDashboard';
import { buildMockProfile } from '@/lib/preview-mock-data';

// Ruta pública de previsualización: renderiza el dashboard real con datos
// ficticios para revisar los 5 temas de color y las 7 pestañas sin base de
// datos ni sesión. Las acciones que escriben (guardar, pagar, borrar) fallan
// aquí a propósito: no hay backend detrás.
//
// El <main> replica exactamente el de app/page.tsx (mismo layout y mismas
// clases) para que lo que se vea aquí sea lo que se ve en la app real.
function PreviewTemasContent() {
    const params = useSearchParams();
    // ?bienvenida=1 fuerza la ventana de primer uso, que de otro modo no sale
    // porque el perfil de ejemplo ya la tiene marcada como vista. Es la unica
    // forma de revisarla sin una cuenta recien creada de verdad.
    const forzarBienvenida = params.get('bienvenida') === '1';
    // ?vacio=1 deja el perfil sin datos, para revisar las pantallas vacias de
    // las 7 pestañas tal como las ve alguien recien registrado.
    const forzarVacio = params.get('vacio') === '1';
    const profile = useMemo(() => {
        const p = buildMockProfile();
        const conBienvenida = forzarBienvenida ? { ...p, onboardingSeenAt: null } : p;
        if (!forzarVacio) return conBienvenida as typeof p;
        return {
            ...conBienvenida,
            accounts: [], expenses: [], incomes: [], salaries: [],
            creditCards: [], loans: [], goals: [], categories: [],
        } as unknown as typeof p;
    }, [forzarBienvenida, forzarVacio]);

    return (
        <>
            <div className="bg-indigo-600 text-white text-center text-xs font-bold py-2 px-4">
                Vista previa con datos de ejemplo · Abre Ajustes para cambiar el tema de color
            </div>
            <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4">
                <BudgetDashboard initialProfile={profile} />
            </main>
        </>
    );
}

export default function PreviewTemasPage() {
    return (
        <Suspense fallback={null}>
            <PreviewTemasContent />
        </Suspense>
    );
}
