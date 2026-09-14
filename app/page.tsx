import BudgetDashboard from "@/components/BudgetDashboard";
import LandingPage from "@/components/LandingPage";
import { getSession, getImpersonatedId } from "@/lib/auth-utils";
import { getProfileById } from "./actions/budget";
import { ensureProfileIntegrity } from "./actions/onboarding";
import { ProfileWithData } from "@/types";
import { COLOR_THEME_IDS } from "@/lib/color-themes";

export default async function Home() {
  const realUserId = await getSession();

  if (!realUserId) {
    return <LandingPage />;
  }

  const impersonatedId = await getImpersonatedId();
  const effectiveUserId = impersonatedId || realUserId;
  const isImpersonating = !!impersonatedId;

  let profile = await getProfileById(effectiveUserId);

  if (!profile) {
    return <LandingPage />;
  }

  await ensureProfileIntegrity(profile.id);
  profile = await getProfileById(profile.id);

  if (!profile) return <LandingPage />;

  // El tema guardado en la cuenta se aplica aqui, no en el layout raiz: volver
  // ese layout async para leer la sesion meteria una consulta a la base de datos
  // en TODAS las peticiones, incluidas /login y /register. Este script corre
  // antes de que el dashboard pinte, asi que no hay parpadeo en la ruta que
  // importa, y el provider lo recoge del atributo al hidratar.
  const temaCuenta = profile.colorTheme;
  const aplicarTema =
    temaCuenta && (COLOR_THEME_IDS as string[]).includes(temaCuenta)
      ? `document.documentElement.setAttribute('data-color-theme', ${JSON.stringify(temaCuenta)});`
      : null;

  return (
    <>
      {aplicarTema && <script dangerouslySetInnerHTML={{ __html: aplicarTema }} />}
    <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4">
      <BudgetDashboard
        initialProfile={profile as unknown as ProfileWithData}
        isImpersonating={isImpersonating}
      />
    </main>
    </>
  );
}
