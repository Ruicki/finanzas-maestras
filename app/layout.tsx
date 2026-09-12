import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Unbounded, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Fuentes provisionales: equivalentes de Google Fonts para General Sans, Excon
// y Bevellier (Fontshare) mientras se auto-alojan los archivos reales vía
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

const titleFont = Unbounded({
  variable: "--font-title-family",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const accentFont = Instrument_Serif({
  variable: "--font-accent-family",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

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
        className={`${bodyFont.variable} ${monoFont.variable} ${titleFont.variable} ${accentFont.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster richColors />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
