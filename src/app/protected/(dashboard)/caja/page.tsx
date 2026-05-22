import { getActiveSession, getMovimientosBySession } from "@/features/caja/caja-actions";
import { getCurrentViewer } from "@/core/auth/auth-state";
import { CajaShell } from "./_components/caja-shell";

export default async function CajaPage() {
  const viewer = await getCurrentViewer();
  const userId = viewer.isAuthenticated ? (viewer.id ?? "unknown") : "unknown";

  // Fetch the active cash session for the current CUIT (resolved inside action via cookie)
  const sessionRes = await getActiveSession();
  const activeSession = sessionRes.data;

  let initialMovimientos: ReturnType<typeof Array<any>> = [];

  if (activeSession) {
    const movRes = await getMovimientosBySession(activeSession.id);
    initialMovimientos = movRes.data;
  }

  return (
    <CajaShell
      initialSession={activeSession}
      initialMovimientos={initialMovimientos}
      userId={userId}
    />
  );
}
