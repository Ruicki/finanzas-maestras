export default function BudgetLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cargando dashboard...
        </p>
      </div>
    </div>
  );
}
