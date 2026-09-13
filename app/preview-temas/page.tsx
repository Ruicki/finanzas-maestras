'use client';

import { Suspense, useMemo } from 'react';
import BudgetDashboard from '@/components/BudgetDashboard';
import { buildMockProfile } from '@/lib/preview-mock-data';

// Ruta pública de previsualización: renderiza el dashboard real con datos
// ficticios para revisar los 5 temas de color y las 7 pestañas sin base de
// datos ni sesión. Las acciones que escriben (guardar, pagar, borrar) fallan
// aquí a propósito: no hay backend detrás.
//
// El <main> replica exactamente el de app/page.tsx (mismo layout y mismas
// clases) para que lo que se vea aquí sea lo que se ve en la app real.
export default function PreviewTemasPage() {
    const profile = useMemo(() => buildMockProfile(), []);

    return (
        <Suspense fallback={null}>
            <div className="bg-indigo-600 text-white text-center text-xs font-bold py-2 px-4">
                Vista previa con datos de ejemplo · Abre Ajustes para cambiar el tema de color
            </div>
            <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4">
                <BudgetDashboard initialProfile={profile} />
            </main>
        </Suspense>
    );
}
