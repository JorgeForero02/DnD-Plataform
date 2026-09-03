import { Link } from "react-router-dom";
import { useCampaigns } from "./hooks";
import { EmptyState } from "../../ui/Collection";
import { OrnamentRule } from "../../ui/Ornament";

// Reseño 2026-09-02 — audit C4 and C1. Two campaigns used to render as two full-width bars
// carrying a name and nothing else, above ~700px of empty page. A card now says what the
// campaign IS to you: your role at that table, how many of you there are, and when it started.
//
// What it does not show is how much world is inside, and that omission is deliberate — see
// campaigns.service.ts#listForUser. A count of entities is a count of things some players
// cannot see.

const ROL: Record<string, string> = {
  DM: "Diriges",
  PLAYER: "Juegas",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CampaignList({ onCreate }: { onCreate?: () => void }) {
  const { data, isLoading, isError, error } = useCampaigns();

  if (isLoading) return <p className="font-chrome text-chrome-sm text-muted">Cargando campañas…</p>;
  if (isError)
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        {(error as Error).message}
      </p>
    );

  if (!data || data.length === 0) {
    return (
      <EmptyState title="Todavía no hay ninguna campaña">
        Una campaña es el contenedor de todo: su mundo, sus sesiones y sus personajes. Crea la
        primera y empieza por donde quieras.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-s4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((c) => {
        const rol = c.members?.[0]?.role;
        const jugadores = c._count?.members;
        return (
          <li key={c.id} className="group relative flex">
            {/* Stretched link: the whole card is clickable, but the LINK is only the name.
                Wrapping the entire card in an <a> made its accessible name the concatenation
                of everything inside it — name, description, role, member count and date read
                out as one string. The ::after overlay restores the big click target without
                paying for it in the accessibility tree. */}
            <div className="flex h-full w-full flex-col rounded-radius-sm border border-muted bg-surface p-s4 transition-colors group-hover:border-copper">
              <h2 className="font-title text-chrome-lg leading-tight text-text group-hover:text-copper-text">
                <Link
                  to={`/campaigns/${c.id}`}
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {c.name}
                </Link>
              </h2>
              <OrnamentRule className="my-s3" />
              <p className="line-clamp-3 flex-1 font-world text-chrome-base leading-snug text-muted">
                {c.description || "Sin descripción todavía."}
              </p>
              <div className="mt-s4 flex flex-wrap items-center gap-x-s3 gap-y-1 font-chrome text-chrome-xs text-muted">
                {rol && <span className="text-copper-text">{ROL[rol] ?? rol}</span>}
                {jugadores !== undefined && (
                  <span className="font-data">
                    {jugadores} {jugadores === 1 ? "persona" : "personas"}
                  </span>
                )}
                <span className="font-data">desde el {formatearFecha(c.createdAt)}</span>
              </div>
            </div>
          </li>
        );
      })}
      {onCreate && (
        <li>
          <button
            type="button"
            onClick={onCreate}
            className="flex h-full min-h-[10rem] w-full flex-col items-center justify-center gap-s2 rounded-radius-sm border border-dashed border-muted p-s4 font-chrome text-chrome-sm text-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <span aria-hidden="true" className="text-chrome-xl leading-none">
              ＋
            </span>
            Nueva campaña
          </button>
        </li>
      )}
    </ul>
  );
}
