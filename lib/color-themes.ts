// Los 4 tonos de cada tema son EXACTOS a los que definió el usuario. El reparto
// de roles está pensado para que el texto siempre se lea encima:
//   · surface    = el tono MÁS CLARO de la paleta (fondo de tarjetas)
//   · background = el segundo más claro (fondo de página)
//   · accent     = el tono dominante (botones, barras, foco)
//   · secondary  = el restante (bordes y detalles)
export const COLOR_THEMES = [
    {
        id: 'marino',
        label: 'Marino',
        accent: '#2F6699',
        secondary: '#63A0B5',
        surface: '#F1ECE2',
        background: '#CFE3DD',
        fontLabel: 'Switzer',
    },
    {
        // Única paleta sin un segundo tono claro: la superficie de las tarjetas
        // es su mismo verde salvia aclarado, para que se separen del fondo.
        id: 'bosque',
        label: 'Bosque',
        accent: '#2A8562',
        secondary: '#155048',
        surface: 'color-mix(in srgb, #8FBC98 40%, white)',
        background: '#8FBC98',
        fontLabel: 'Boska',
    },
    {
        // Paleta 100% pastel: el relleno de los botones se oscurece desde su
        // propio lavanda, porque no hay ningún tono oscuro en la paleta y el
        // texto blanco encima del lavanda original era ilegible.
        id: 'cuarzo',
        label: 'Cuarzo Rosa',
        accent: '#C4B0DC',
        secondary: '#F3C7C6',
        surface: '#FAECEC',
        background: '#FCDEDD',
        fontLabel: 'Stardom',
    },
    {
        id: 'ultravioleta',
        label: 'Ultravioleta',
        accent: '#2E1F45',
        secondary: '#3E5A76',
        surface: '#D8FBF0',
        background: '#6FE0CE',
        fontLabel: 'Satoshi',
    },
    {
        // Invertido respecto al resto: la crema es la página y el olivo el
        // relleno de las tarjetas, aclarado para no comerse el contraste.
        id: 'burdeos',
        label: 'Burdeos',
        accent: '#6B0E0E',
        secondary: '#2E0000',
        surface: 'color-mix(in srgb, #767F6E 32%, white)',
        background: '#F1ECE2',
        fontLabel: 'Supreme',
    },
] as const;

export type ColorThemeId = typeof COLOR_THEMES[number]['id'];

export const COLOR_THEME_IDS = COLOR_THEMES.map((t) => t.id);
export const DEFAULT_COLOR_THEME: ColorThemeId = 'marino';
export const COLOR_THEME_STORAGE_KEY = 'fm-color-theme';
