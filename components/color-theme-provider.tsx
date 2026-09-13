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

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY) as ColorThemeId | null;
            if (stored && (COLOR_THEME_IDS as string[]).includes(stored)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el valor persistido en localStorage (solo se conoce en cliente)
                setColorThemeState(stored);
            }
        } catch {
            // localStorage no disponible (modo privado, etc.) — se queda en el tema por defecto
        }
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
