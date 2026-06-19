"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-zinc-900 dark:text-white">
            500
          </h1>
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            Algo salió mal
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Intentar de nuevo
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
