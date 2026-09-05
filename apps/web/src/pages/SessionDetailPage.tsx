import { Link, useParams } from "react-router-dom";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { Markdown } from "../features/entities/Markdown";
import { useCampaign } from "../features/campaigns/hooks";
import { useSession } from "../features/sessions/hooks";
import { useAuthStore } from "../store/auth.store";

// Ficha U1 (plan 14) — **una sesión se puede LEER.**
//
// Las fichas del mundo y los personajes tienen su página de lectura desde el reseño; una sesión se
// seguía abriendo en **su formulario**, que es la pantalla de editarla. Y una sesión es justo lo que
// la mesa repasa entre partidas: cuándo fue, quién vino, y **la crónica**.
//
// Con `Session.recap` como columna (plan 02) hay algo real que leer, y no un formulario con un
// `textarea` lleno.

/** Los tres estados, en español y una sola vez: ningún valor de enumeración llega a la pantalla. */
const ROTULO_DE_ESTADO: Record<"PLANNED" | "IN_PROGRESS" | "CLOSED", string> = {
  PLANNED: "Planificada",
  IN_PROGRESS: "En juego",
  CLOSED: "Cerrada",
};

function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SessionDetailPage() {
  const { id = "", sessionId = "" } = useParams();
  const { data: campaign } = useCampaign(id);
  const { data: sesion, isLoading, isError } = useSession(id, sessionId);
  const { user, logout } = useAuthStore();

  const header = <AppHeader userName={user?.displayName} onLogout={logout} />;
  const migas = [
    { label: "Tus crónicas", to: "/" },
    { label: campaign?.name ?? "Campaña", to: `/campaigns/${id}?seccion=sessions` },
  ];

  if (isError) {
    return (
      <AppShell header={header}>
        <PageHeader title="Sesión no disponible" crumbs={migas} />
        {/* **No se distingue «no existe» de «no puedes verla»**, igual que en las fichas del
            mundo: decirlo sería contar justo lo que la visibilidad esconde. */}
        <EmptyState title="Esta sesión no existe o no puedes verla">
          Si crees que deberías verla, pídeselo al DM de la mesa.
        </EmptyState>
      </AppShell>
    );
  }

  if (isLoading || !sesion) {
    return (
      <AppShell header={header}>
        <PageHeader title="Cargando…" crumbs={migas} />
      </AppShell>
    );
  }

  const cuando = fechaLarga(sesion.scheduledAt ?? sesion.startedAt);
  const cronica = sesion.recap?.trim();

  return (
    <AppShell header={header}>
      <PageHeader
        title={sesion.title}
        crumbs={[...migas, { label: sesion.title }]}
        subtitle={
          <span className="flex flex-wrap items-center gap-s2">
            <span>{ROTULO_DE_ESTADO[sesion.status]}</span>
            {cuando && <span className="text-muted">· {cuando}</span>}
            <Badge visibility={sesion.visibility} />
          </span>
        }
        actions={
          <Link
            to={`/campaigns/${id}/sesion`}
            className="rounded-radius-sm border border-copper px-s3 py-s2 font-chrome text-chrome-sm text-text hover:border-accent hover:text-accent-text"
          >
            Ir a la mesa
          </Link>
        }
      />

      <div className="grid gap-s5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-s4">
          {/* **La crónica, en vitela y con su medida de lectura**, como el cuerpo de una ficha del
              mundo: es prosa de la partida, no un campo de formulario. */}
          {cronica ? (
            <section aria-label="La crónica">
              <Markdown text={cronica} />
              {/* **Su nivel se enseña aparte**: la crónica puede ser más o menos pública que la
                  sesión, y saber a quién se está contando algo importa antes de contarlo. */}
              {sesion.recapVisibility && (
                <p className="mt-s2 font-chrome text-chrome-xs text-muted">
                  Esta crónica la ven: <Badge visibility={sesion.recapVisibility} />
                </p>
              )}
            </section>
          ) : (
            <EmptyState title="Todavía no hay crónica">
              Cuando alguien escriba el resumen de esta sesión, se leerá aquí.
            </EmptyState>
          )}
        </div>

        <aside className="space-y-s4">
          <Panel tone="chrome">
            <h2 className="font-chrome text-chrome-sm font-semibold text-text">Quién vino</h2>
            {/* **`null` y «nadie» son dos cosas distintas**, y se dicen distinto: sin asistencia
                declarada nadie la anotó al empezar; con lista vacía, se anotó que no vino nadie. */}
            {sesion.attendance === null ? (
              <p className="mt-1 font-chrome text-chrome-xs text-muted">
                Nadie declaró quién vino al empezar la sesión.
              </p>
            ) : sesion.attendance.length === 0 ? (
              <p className="mt-1 font-chrome text-chrome-xs text-muted">
                Se anotó que no vino nadie.
              </p>
            ) : (
              <p className="mt-1 font-chrome text-chrome-xs text-muted">
                {sesion.attendance.length} {sesion.attendance.length === 1 ? "persona" : "personas"}{" "}
                en la mesa.
              </p>
            )}
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}
