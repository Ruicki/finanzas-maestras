import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-zinc-900 dark:text-white">
            404
          </h1>
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            Página no encontrada
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            La página que buscas no existe o fue movida.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
              Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
