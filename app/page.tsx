import BudgetDashboard from "@/components/BudgetDashboard";
import LandingPage from "@/components/LandingPage";
import { getSession, getImpersonatedId } from "@/lib/auth-utils";
import { getProfileById, createAccount } from "./actions/budget";
import { initializeDefaultCategories } from "./actions/categories";
import { ProfileWithData } from "@/types";

export default async function Home() {
  const realUserId = await getSession();

  // Si no hay sesión, mostrar Landing Page en lugar de redirigir
  if (!realUserId) {
    return <LandingPage />;
  }

  // Check for impersonation
  const impersonatedId = await getImpersonatedId();
  const effectiveUserId = impersonatedId || realUserId;
  const isImpersonating = !!impersonatedId;

  let profile = await getProfileById(effectiveUserId);

  // Si existe sesión pero el perfil fue eliminado de la DB, mostrar Landing Page
  if (!profile) {
    return <LandingPage />;
  }

  // Auto-Reparación: Asegurar que la cuenta 'Efectivo' siempre exista
  try {
    const hasCashAccount = profile.accounts.some((a: { name: string }) => a.name === 'Efectivo');
    if (!hasCashAccount) {
      await createAccount("Efectivo", "CASH", 0, profile.id);
      profile = await getProfileById(profile.id);
    }
  } catch (e) {
    console.error("Auto-repair account failed:", e);
  }

  if (!profile) return <LandingPage />;

  // Auto-Reparación: Asegurar que existan categorías predeterminadas
  try {
    if (profile.categories.length === 0) {
      await initializeDefaultCategories(profile.id);
      profile = await getProfileById(profile.id);
    }
  } catch (e) {
    console.error("Auto-repair categories failed:", e);
  }

  if (!profile) return <LandingPage />;

  return (
    <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4 bg-zinc-50 dark:bg-zinc-950">
      <BudgetDashboard
        initialProfile={profile as unknown as ProfileWithData}
        isImpersonating={isImpersonating}
      />
    </main>
  );
}
