// Los 4 tonos de cada tema son EXACTOS a los que definió el usuario — no se
// mezclan ni derivan colores nuevos. Ordenados de más oscuro/saturado a más
// claro: acento (botones, foco) → secundario (detalles, badges) → superficie
// (fondo de tarjetas, modo claro) → fondo de página (modo claro).
export const COLOR_THEMES = [
    {
        id: 'marino',
        label: 'Marino',
        accent: '#2F6699',
        secondary: '#63A0B5',
        surface: '#CFE3DD',
        background: '#F1ECE2',
        fontLabel: 'Switzer',
    },
    {
        // Acento pedido explícitamente por el usuario: el más oscuro (#0D2B2E)
        // se leía casi negro, sin color propio — #2A8562 es el verde esmeralda
        // que realmente identifica el tema. Con el acento fuera, los otros dos
        // tonos que quedaban (#0D2B2E, #155048) son ambos oscuros — usarlos de
        // fondo de tarjeta dejaría el texto fijo (oscuro) ilegible encima, así
        // que las tarjetas comparten el mismo tono claro que el fondo de
        // página (se distinguen por borde, no por relleno).
        id: 'bosque',
        label: 'Bosque',
        accent: '#2A8562',
        secondary: '#155048',
        surface: '#8FBC98',
        background: '#8FBC98',
        fontLabel: 'Boska',
    },
    {
        id: 'cuarzo',
        label: 'Cuarzo Rosa',
        accent: '#C4B0DC',
        secondary: '#F3C7C6',
        surface: '#FCDEDD',
        background: '#FAECEC',
        fontLabel: 'Stardom',
    },
    {
        id: 'ultravioleta',
        label: 'Ultravioleta',
        accent: '#2E1F45',
        secondary: '#3E5A76',
        surface: '#6FE0CE',
        background: '#D8FBF0',
        fontLabel: 'Satoshi',
    },
    {
        // Acento pedido explícitamente por el usuario: el más oscuro (#2E0000)
        // se leía casi negro — #6B0E0E es el vino profundo que sí se reconoce
        // como color propio del tema.
        id: 'burdeos',
        label: 'Burdeos',
        accent: '#6B0E0E',
        secondary: '#2E0000',
        surface: '#767F6E',
        background: '#F1ECE2',
        fontLabel: 'Supreme',
    },
] as const;

export type ColorThemeId = typeof COLOR_THEMES[number]['id'];

export const COLOR_THEME_IDS = COLOR_THEMES.map((t) => t.id);
export const DEFAULT_COLOR_THEME: ColorThemeId = 'marino';
export const COLOR_THEME_STORAGE_KEY = 'fm-color-theme';
