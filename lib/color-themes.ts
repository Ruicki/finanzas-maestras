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
        id: 'bosque',
        label: 'Bosque',
        accent: '#0D2B2E',
        secondary: '#155048',
        surface: '#2A8562',
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
        id: 'burdeos',
        label: 'Burdeos',
        accent: '#2E0000',
        secondary: '#6B0E0E',
        surface: '#767F6E',
        background: '#F1ECE2',
        fontLabel: 'Supreme',
    },
] as const;

export type ColorThemeId = typeof COLOR_THEMES[number]['id'];

export const COLOR_THEME_IDS = COLOR_THEMES.map((t) => t.id);
export const DEFAULT_COLOR_THEME: ColorThemeId = 'marino';
export const COLOR_THEME_STORAGE_KEY = 'fm-color-theme';
