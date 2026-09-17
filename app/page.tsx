import BudgetDashboard from "@/components/BudgetDashboard";
import LandingPage from "@/components/LandingPage";
import { getSession, getImpersonatedId } from "@/lib/auth-utils";
import { getProfileById } from "./actions/budget";
import { ProfileWithData } from "@/types";
import { COLOR_THEME_IDS } from "@/lib/color-themes";
import { necesitaSiembraInicial } from "@/lib/perfil-nuevo";
import { diagnosticarErrorDB, esErrorDeBaseDeDatos } from "@/lib/db-errors";
import DatabaseErrorScreen from "@/components/shared/DatabaseErrorScreen";
import { reportError } from "@/lib/logger";

export default async function Home() {
  const realUserId = await getSession();

  if (!realUserId) {
    return <LandingPage />;
  }

  const impersonatedId = await getImpersonatedId();
  const effectiveUserId = impersonatedId || realUserId;
  const isImpersonating = !!impersonatedId;

  // Si la lectura del perfil falla, esta pagina se caia entera y el usuario veia
  // "Algo salio mal" con un identificador que solo se resuelve entrando en los
  // registros de Vercel. Paso de verdad: un cambio de esquema se desplego sin
  // aplicarlo a la base, y diagnosticarlo llevo horas porque la app no decia
  // nada. Ahora dice que pasa y que hacer, sin ensenar nunca el error original
  // —puede llevar dentro la cadena de conexion—, y el detalle completo va a los
  // registros.
  let profile: Awaited<ReturnType<typeof getProfileById>>;
  try {
    profile = await getProfileById(effectiveUserId);
  } catch (error) {
    reportError(error, { accion: 'cargar el dashboard', profileId: effectiveUserId });
    // Lo que no sea de base de datos sigue subiendo: un fallo de autorizacion
    // enseñado como "no se pudo conectar" seria mentir y esconderia el problema.
    if (!esErrorDeBaseDeDatos(error)) throw error;
    return <DatabaseErrorScreen diagnostico={diagnosticarErrorDB(error)} />;
  }

  if (!profile) {
    return <LandingPage />;
  }

  // El render no escribe en la base de datos.
  //
  // Aqui se llamaba a ensureProfileIntegrity y despues se volvia a pedir el
  // perfil entero: dos consultas completas y una posible escritura en CADA
  // carga de la pagina, para reparar algo que solo le falta a los perfiles
  // creados antes de que la siembra formara parte del alta. Ademas se tragaba
  // sus propios errores, asi que podia no reparar nada sin que nadie se
  // enterara.
  //
  // Ahora el alta siembra cuenta y categorias en el mismo create (ver
  // lib/perfil-nuevo.ts), y lo que queda aqui es una comprobacion sobre datos
  // ya cargados, sin consultar nada. Si de verdad falta algo, el dashboard
  // pide la reparacion una vez, ya montado.
  const reparacionPendiente = necesitaSiembraInicial(profile);

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
        reparacionPendiente={reparacionPendiente}
      />
    </main>
    </>
  );
}
