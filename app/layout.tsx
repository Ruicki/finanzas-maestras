import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Instrument_Serif,
  Instrument_Sans,
  Petrona,
  Bodoni_Moda,
  Outfit,
  Figtree,
  Familjen_Grotesk,
} from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorThemeProvider } from "@/components/color-theme-provider";
import { COLOR_THEME_IDS, COLOR_THEME_STORAGE_KEY, DEFAULT_COLOR_THEME } from "@/lib/color-themes";
import "./globals.css";

// Fuentes provisionales: equivalentes de Google Fonts para las tipografías
// reales de Fontshare (General Sans, Switzer, Boska, Stardom, Satoshi,
// Supreme, Bevellier) mientras se auto-alojan los archivos originales vía
// next/font/local — fontshare.com no es alcanzable desde este entorno de build.
const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-sans-family",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono-family",
  weight: ["400", "500"],
  subsets: ["latin"],
});

// Acento editorial fijo (Bevellier) para cifras destacadas en todos los temas.
const accentFont = Instrument_Serif({
  variable: "--font-accent-family",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Una fuente de título por tema de color (ver lib/color-themes.ts):
// Marino→Switzer, Bosque→Boska, Cuarzo Rosa→Stardom, Ultravioleta→Satoshi, Burdeos→Supreme.
const switzerFont = Instrument_Sans({ variable: "--font-switzer-family", weight: ["500", "600"], subsets: ["latin"] });
const boskaFont = Petrona({ variable: "--font-boska-family", weight: ["500", "600"], subsets: ["latin"] });
const stardomFont = Bodoni_Moda({ variable: "--font-stardom-family", weight: ["500", "600"], subsets: ["latin"] });
const satoshiFont = Outfit({ variable: "--font-satoshi-family", weight: ["500", "600"], subsets: ["latin"] });
const supremeFont = Figtree({ variable: "--font-supreme-family", weight: ["500", "600"], subsets: ["latin"] });
const exconFont = Familjen_Grotesk({ variable: "--font-excon-family", weight: ["500", "600"], subsets: ["latin"] });

const themeInitScript = `(function(){try{var k=${JSON.stringify(COLOR_THEME_STORAGE_KEY)};var ids=${JSON.stringify(COLOR_THEME_IDS)};var v=localStorage.getItem(k);document.documentElement.setAttribute('data-color-theme', v && ids.indexOf(v)>-1 ? v : ${JSON.stringify(DEFAULT_COLOR_THEME)});}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Finanzas Maestras",
  description: "Gestor de finanzas personales by Ricardo Pinzón",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${monoFont.variable} ${accentFont.variable} ${switzerFont.variable} ${boskaFont.variable} ${stardomFont.variable} ${satoshiFont.variable} ${supremeFont.variable} ${exconFont.variable} antialiased`}
      >
        {/* Fija data-color-theme antes del primer pintado para evitar flash del tema por defecto */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ColorThemeProvider>
            <Toaster richColors />
            {children}
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
