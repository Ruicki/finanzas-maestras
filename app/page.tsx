import BudgetDashboard from "@/components/BudgetDashboard";
import LandingPage from "@/components/LandingPage";
import { getSession, getImpersonatedId } from "@/lib/auth-utils";
import { getProfileById } from "./actions/budget";
import { ensureProfileIntegrity } from "./actions/onboarding";
import { ProfileWithData } from "@/types";

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

  return (
    <main className="flex min-h-screen flex-col items-center py-6 md:py-12 px-2 md:px-4">
      <BudgetDashboard
        initialProfile={profile as unknown as ProfileWithData}
        isImpersonating={isImpersonating}
      />
    </main>
  );
}
