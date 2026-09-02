import { useState } from "react";
import type { EntityType } from "@dnd/shared";
import { useCampaign } from "./hooks";
import { useAllEntities } from "../entities/hooks";
import { useSessions } from "../sessions/hooks";
import { useCharacters } from "../characters/hooks";
import { Panel } from "../../ui/Panel";
import { Badge } from "../../ui/Badge";
import { OrnamentRule } from "../../ui/Ornament";
import { EmptyState } from "../../ui/Collection";
import { resumenDeCuerpo, ETIQUETA_DE_TIPO } from "../entities/resumen";

// Reseño 2026-09-02 — audit B2. The first thing you saw when you opened your own campaign was
// a settings FORM: an editable "Nombre" field, and a "Borrar" button sitting the same size and
// distance from your cursor as "Guardar". Nothing on it told you anything about your table.
// This is what a summary actually is — what is coming, what is new, and how much of the world
// you can reach — and the settings moved to a section of their own.
//
// On counting: every list read here comes back from the API already filtered by canView
// (apps/api/src/common/visibility.ts), so counting the rows you were handed is not the same as
// counting what exists. A player's "8 lugares" means eight they can see, which is the honest
// number to show them, and nothing here re-derives the visibility matrix to get it.

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function CampaignOverview({ campaignId }: { campaignId: string }) {
  const { data: campaign } = useCampaign(campaignId);
  const { data: entidades } = useAllEntities(campaignId);
  const { data: sesiones } = useSessions(campaignId);
  const { data: personajes } = useCharacters(campaignId);

  // Read once, when the screen mounts, rather than on every render: "next session" must not
  // shift under the reader because something unrelated re-rendered, and the lint rule that
  // caught this is right that a bare Date.now() in a render body is a moving target.
  const [ahora] = useState(() => Date.now());
  const proxima = (sesiones ?? [])
    .filter((s) => s.scheduledAt && new Date(s.scheduledAt).getTime() >= ahora)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime(),
    )[0];

  const recientes = [...(entidades ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const porTipo = new Map<EntityType, number>();
  for (const e of entidades ?? []) porTipo.set(e.type, (porTipo.get(e.type) ?? 0) + 1);

  const descripcion = campaign?.description?.trim();

  return (
    <div className="space-y-s5">
      {descripcion && (
        <Panel tone="vellum">
          {/* The world's own voice on the world's own surface. The drop capital marks where the
              manual starts and the instrument stops — the one place this page changes register. */}
          <p>
            <span
              aria-hidden="true"
              className="float-left mr-2 font-title text-[2.6rem] leading-[0.8] text-copper-text"
            >
              {descripcion.charAt(0)}
            </span>
            {descripcion.slice(1)}
          </p>
        </Panel>
      )}

      <section>
        <OrnamentRule className="mb-s3">La mesa</OrnamentRule>
        <div className="grid gap-s3 sm:grid-cols-3">
          <div className="rounded-radius-sm border border-muted/50 bg-surface p-s4">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Próxima sesión
            </p>
            {proxima ? (
              <>
                <p className="mt-1 font-title text-chrome-md text-text">{proxima.title}</p>
                <p className="font-data text-chrome-xs text-copper-text">
                  {fechaLarga(proxima.scheduledAt as string)}
                </p>
              </>
            ) : (
              <p className="mt-1 font-chrome text-chrome-sm text-muted">
                Ninguna en el calendario.
              </p>
            )}
          </div>
          <div className="rounded-radius-sm border border-muted/50 bg-surface p-s4">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Personajes
            </p>
            <p className="mt-1 font-data text-chrome-xl text-text">{personajes?.length ?? "—"}</p>
          </div>
          <div className="rounded-radius-sm border border-muted/50 bg-surface p-s4">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Sesiones
            </p>
            <p className="mt-1 font-data text-chrome-xl text-text">{sesiones?.length ?? "—"}</p>
          </div>
        </div>
      </section>

      <section>
        <OrnamentRule className="mb-s3">Lo último del mundo</OrnamentRule>
        {recientes.length === 0 ? (
          <EmptyState title="El mundo está en blanco">
            Todavía no hay nada escrito. Empieza por donde quieras: un lugar donde ocurra algo, o
            alguien a quien preguntar.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-muted/25 rounded-radius-sm border border-muted/40 bg-surface/40">
            {recientes.map((e) => {
              const resumen = resumenDeCuerpo(e.body, 140);
              return (
                <li key={e.id} className="px-s3 py-s3">
                  <div className="flex flex-wrap items-baseline gap-x-s2 gap-y-1">
                    <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
                      {ETIQUETA_DE_TIPO[e.type]}
                    </span>
                    <span className="font-title text-chrome-md text-text">{e.name}</span>
                    <div className="flex-1" />
                    <Badge visibility={e.visibility} />
                  </div>
                  {resumen && (
                    <p className="mt-1 line-clamp-1 font-world text-chrome-base text-muted">
                      {resumen}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {porTipo.size > 0 && (
        <section>
          <OrnamentRule className="mb-s3">Lo que puedes ver</OrnamentRule>
          <ul className="flex flex-wrap gap-s2">
            {Array.from(porTipo.entries()).map(([tipo, n]) => (
              <li
                key={tipo}
                className="rounded-radius-sm border border-muted/50 px-s3 py-1 font-chrome text-chrome-xs text-muted"
              >
                {ETIQUETA_DE_TIPO[tipo]} <span className="font-data text-text">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-s2 max-w-[60ch] font-chrome text-chrome-xs text-muted">
            Estas cifras cuentan lo que <em>tú</em> puedes ver. Lo que esté oculto para ti no
            aparece aquí, y tampoco se insinúa contándolo.
          </p>
        </section>
      )}
    </div>
  );
}
