# Finanzas Maestras — app móvil + widget

App Android (React Native / Expo) cuya única razón de existir es el widget
de pantalla de inicio: dos botones, "+ Gasto" y "+ Ingreso", que abren la
app directo en la pantalla de alta rápida. Habla con el backend de
Finanzas Maestras (`../`) por `app/api/mobile/*`, con el mismo JWT que usa
la web, mandado como `Authorization: Bearer <token>` en vez de cookie.

## Estructura

- `src/app/` — pantallas (expo-router): `login`, `quick-add`, y `index`
  (decide a cuál ir según si hay sesión guardada).
- `src/widgets/` — el widget en sí (`QuickAddWidget.tsx`, dibujado con
  componentes de `react-native-android-widget`, no HTML/CSS) y el
  `widgetTaskHandler` que Android invoca para (re)dibujarlo.
- `src/lib/api.ts` — cliente de la API móvil. `src/lib/auth-storage.ts` —
  JWT guardado en `expo-secure-store` (Keychain/Keystore), nunca en texto
  plano.
- `index.js` — entry point real: arranca expo-router y registra el
  `widgetTaskHandler` (dos cosas separadas, por eso no es solo
  `expo-router/entry`).

## Correr en desarrollo

```sh
npm install
npx expo start
```

Expo Go **no sirve** para probar el widget (es código nativo generado por
un config plugin) — hace falta un development build:

```sh
npx expo prebuild --platform android   # genera ./android (regenerable, no se versiona)
npx expo run:android                   # necesita Android Studio/SDK instalados
```

## Conseguir un APK real (lo que falta de este lado)

Este entorno no tiene acceso a `api.expo.dev` (bloqueado por la política de
red del contenedor) ni a una cuenta de Expo — así que no pude generar el
`.apk` yo mismo. Son ~10 minutos, una sola vez, desde tu computadora:

1. Crear una cuenta gratis en [expo.dev](https://expo.dev) (si no tenés).
2. `npm install -g eas-cli && eas login`
3. Desde `mobile/`: `eas init` (crea el proyecto en tu cuenta y escribe
   `extra.eas.projectId` en `app.json` — commiteá ese cambio).
4. `eas build --platform android --profile preview` — compila en la nube
   de Expo (gratis, varios minutos) y te da un link para descargar el
   `.apk` directo al celular.
5. Instalalo, abrilo, iniciá sesión, y desde el home del celular: mantener
   presionado → Widgets → "Alta rápida".

Una vez que el proyecto exista en tu cuenta de Expo, las próximas builds se
pueden disparar también desde una sesión de Claude Code con las
herramientas de Expo conectadas.

## Antes de que esto funcione de verdad

Las rutas `/api/mobile/*` que usa esta app viven en la rama
`claude/repo-critical-analysis-x4pwn5` del repo principal — necesitan
mergearse a producción (Vercel) antes de que el login desde el celular
funcione contra `https://finanzas-maestras.vercel.app` (la URL configurada
en `app.json` → `extra.apiBaseUrl`).
