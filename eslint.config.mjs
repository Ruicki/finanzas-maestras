import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // App Expo/React Native aparte (su propio package.json y tsconfig) — se
    // lintea con lo suyo (`cd mobile && npx expo lint`), no con reglas
    // pensadas para Next.js.
    "mobile/**",
  ]),
  {
    // Scripts de Node/CommonJS puros: require() es el patrón correcto aquí, no un ES import faltante.
    files: ["jest.config.js", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
