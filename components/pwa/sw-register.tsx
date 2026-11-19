"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Instalación como PWA es una mejora opcional; si falla el registro
        // la app sigue funcionando normal en el navegador.
      });
    }
  }, []);

  return null;
}
