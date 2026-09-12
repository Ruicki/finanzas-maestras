export const COLOR_THEMES = [
    {
        id: 'marino',
        label: 'Marino',
        swatches: ['#2F6699', '#63A0B5', '#CFE3DD', '#F1ECE2'],
        fontLabel: 'Switzer',
    },
    {
        id: 'bosque',
        label: 'Bosque',
        swatches: ['#0D2B2E', '#155048', '#2A8562', '#8FBC98'],
        fontLabel: 'Boska',
    },
    {
        id: 'cuarzo',
        label: 'Cuarzo Rosa',
        swatches: ['#FAECEC', '#FCDEDD', '#F3C7C6', '#C4B0DC'],
        fontLabel: 'Stardom',
    },
    {
        id: 'ultravioleta',
        label: 'Ultravioleta',
        swatches: ['#2E1F45', '#3E5A76', '#6FE0CE', '#D8FBF0'],
        fontLabel: 'Satoshi',
    },
    {
        id: 'burdeos',
        label: 'Burdeos',
        swatches: ['#6B0E0E', '#2E0000', '#767F6E', '#F1ECE2'],
        fontLabel: 'Supreme',
    },
] as const;

export type ColorThemeId = typeof COLOR_THEMES[number]['id'];

export const COLOR_THEME_IDS = COLOR_THEMES.map((t) => t.id);
export const DEFAULT_COLOR_THEME: ColorThemeId = 'marino';
export const COLOR_THEME_STORAGE_KEY = 'fm-color-theme';
