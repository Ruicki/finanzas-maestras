'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    ColorThemeId,
    COLOR_THEME_IDS,
    COLOR_THEME_STORAGE_KEY,
    DEFAULT_COLOR_THEME,
} from '@/lib/color-themes';

interface ColorThemeContextValue {
    colorTheme: ColorThemeId;
    setColorTheme: (theme: ColorThemeId) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
    colorTheme: DEFAULT_COLOR_THEME,
    setColorTheme: () => {},
});

export function useColorTheme() {
    return useContext(ColorThemeContext);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
    const [colorTheme, setColorThemeState] = useState<ColorThemeId>(DEFAULT_COLOR_THEME);

    /**
     * Este provider vive en el layout raiz, por encima del arbol de la pagina,
     * asi que no puede recibir el perfil por props. El punto de encuentro es el
     * atributo del DOM: lo fija primero el script del layout desde localStorage
     * y, en la ruta del dashboard, lo corrige despues el script de app/page.tsx
     * con el tema guardado en la cuenta. Aqui solo se lee lo que haya quedado.
     *
     * localStorage deja de ser la verdad y pasa a ser cache por dispositivo: es
     * lo que evita el parpadeo antes de que el servidor pueda opinar.
     */
    useEffect(() => {
        const esValido = (v: string | null): v is ColorThemeId =>
            !!v && (COLOR_THEME_IDS as string[]).includes(v);

        // Primero el atributo, que es lo que dejaron los scripts de arranque (el
        // del layout desde localStorage, y en el dashboard el de app/page.tsx con
        // el tema de la cuenta). localStorage solo actua de respaldo.
        const delDom = document.documentElement.getAttribute('data-color-theme');
        let guardado: string | null = null;
        if (!esValido(delDom)) {
            try {
                guardado = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
            } catch {
                // localStorage no disponible (modo privado, etc.) — se queda en el tema por defecto
            }
        }

        const inicial = esValido(delDom) ? delDom : esValido(guardado) ? guardado : null;
        // Un unico setState al final: el valor solo se conoce en cliente, de ahi
        // que viva en un efecto, y resolverlo antes evita renders encadenados.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- valor solo conocido en cliente; se resuelve una vez al montar
        if (inicial) setColorThemeState(inicial);
    }, []);

    const setColorTheme = (theme: ColorThemeId) => {
        setColorThemeState(theme);
        document.documentElement.setAttribute('data-color-theme', theme);
        try {
            window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
        } catch {
            // localStorage no disponible — el cambio sigue aplicado en esta sesión
        }
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-color-theme', colorTheme);
    }, [colorTheme]);

    return (
        <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ColorThemeContext.Provider>
    );
}
