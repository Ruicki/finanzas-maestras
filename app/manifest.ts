import type { MetadataRoute } from 'next';

/**
 * Web App Manifest: lo que convierte Finanzas Maestras en algo instalable
 * desde el navegador del celular (ícono en la pantalla de inicio, se abre
 * a pantalla completa sin la barra del navegador). No requiere Play Store
 * ni un APK aparte — el propio Chrome/Android genera el instalable (WebAPK)
 * a partir de este archivo.
 *
 * Colores del tema Marino (lib/color-themes.ts), el default de la app.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Finanzas Maestras',
        short_name: 'Finanzas',
        description: 'Gestor de finanzas personales — cuentas, gastos, deudas y metas en un solo lugar.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#CFE3DD',
        theme_color: '#2F6699',
        lang: 'es',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
