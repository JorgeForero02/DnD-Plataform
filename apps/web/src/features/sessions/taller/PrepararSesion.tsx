import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../ui/Badge";
import { EmptyState } from "../../../ui/Collection";
import { IconoDeTipo } from "../../entities/iconos";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import { useAllEntities } from "../../entities/hooks";
import { BotonRevelar, sePuedeRevelar } from "../../entities/BotonRevelar";
import type { Entity } from "../../entities/api";
import { useSessions } from "../hooks";
import type { Session } from "../api";
import { useNpcs, useStatblocks } from "../../bestiario/hooks";
import { IconoBestiario } from "../../bestiario/iconos";
import { useRollRequests } from "../../roll-requests/hooks";
import { IconoD20, IconoMegafono, IconoMundo } from "../../../ui/Iconos";

// **Preparar la sesión que viene.** Los cuatro bloques de la maqueta
// (`prototipo/src/features/taller/PrepararSesion.tsx`), con sus rótulos literales: «La escena
// abre en», «A mano para revelar» —con su botón **Revelar** por fila—, «Criaturas a mano» y
// «Tiradas que pediré».
//
// La maqueta los rellena con un objeto estático de seis líneas. Aquí cada bloque se ata a datos
// reales, y **donde el modelo no tiene el dato que la maqueta enseña, se dice**:
//
//  · «La escena abre en» — el modelo **no tiene un campo de escena inicial**: `Session` trae
//    título, fecha, notas y estado (`features/sessions/api.ts`). Se pinta la **siguiente sesión
//    planificada** con lo que el DM haya escrito en sus notas, que es donde hoy vive eso. Un
//    campo nuevo sería tocar el servidor, y este carril no lo toca.
//  · «A mano para revelar» — las fichas que la mesa todavía no ve, y el botón que **de verdad**
//    las revela. Hasta hoy revelar era «editar la visibilidad» dentro de un formulario
//    (auditoría §8.4): el servidor siempre lo entendió como revelar y emitió `ENTITY_REVEALED`
//    comparando conjuntos de quién la ve; lo que faltaba era el botón que lo dijera.
//  · «Criaturas a mano» — los PNJ ya bajados a la mesa y los statblocks propios del DM.
//  · «Tiradas que pediré» — las peticiones pendientes de verdad. Comparte consulta y sondeo con
//    «Te han pedido tirar» de la mesa (misma clave), así que no añade un sondeo más.

function Bloque({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className="rounded-radius-md border border-muted bg-bg p-s3">
      <h4 className="mb-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
        {icono}
        {titulo}
      </h4>
      {children}
    </section>
  );
}

/** Las notas de una sesión llegan como `unknown` (columna `Json?`). Lector tolerante. */
function textoDeNotas(notes: unknown): string {
  if (typeof notes === "string") return notes.trim();
  if (notes && typeof notes === "object" && "text" in notes) {
    const texto = (notes as { text: unknown }).text;
    if (typeof texto === "string") return texto.trim();
  }
  return "";
}

function siguientePlanificada(sesiones: Session[] | undefined): Session | null {
  const planificadas = (sesiones ?? []).filter((s) => s.status === "PLANNED");
  if (planificadas.length === 0) return null;
  // La que toca jugar es **la más antigua sin empezar**, igual que decide la mesa.
  return [...planificadas].sort((a, b) =>
    (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt),
  )[0];
}

/**
 * Una fila de «A mano para revelar».
 *
 * **El botón es el de `features/entities`, no uno propio.** Ese módulo es el dueño del dominio:
 * exporta `sePuedeRevelar` —el predicado— y `BotonRevelar` —la mutación, con `useUpdateEntity`
 * atado al tipo de SU ficha, que es lo que decide qué caché se invalida—. Esta fila reimplementaba
 * las dos cosas, y era una de las **tres** copias que había en la aplicación; `CLAUDE.md` obliga a
 * escribir un matiz de visibilidad una sola vez. Lo que se conserva es la fila: su tipo, su
 * nombre y su insignia.
 */
function FilaParaRevelar({ campaignId, ficha }: { campaignId: string; ficha: Entity }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-s2 border-b border-muted py-s2 last:border-b-0">
      <span className="min-w-0">
        <span className="flex items-center gap-s1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
          <IconoDeTipo type={ficha.type} />
          {ETIQUETA_DE_TIPO[ficha.type]}
        </span>
        <span className="block truncate font-world text-world-base text-text">{ficha.name}</span>
      </span>
      <span className="flex items-center gap-s2">
        <Badge visibility={ficha.visibility} />
        <BotonRevelar
          campaignId={campaignId}
          type={ficha.type}
          entityId={ficha.id}
          visibility={ficha.visibility}
        />
      </span>
    </li>
  );
}
/** Cuántas fichas ocultas se ofrecen de una vez. Es una bandeja de preparación, no un listado. */
const A_MANO = 8;

export function PrepararSesion({ campaignId }: { campaignId: string }) {
  const sesiones = useSessions(campaignId);
  const fichas = useAllEntities(campaignId);
  const npcs = useNpcs(campaignId);
  const statblocks = useStatblocks(campaignId);
  const peticiones = useRollRequests(campaignId);

  const proxima = siguientePlanificada(sesiones.data);
  const notas = proxima ? textoDeNotas(proxima.notes) : "";
  const ocultas = [...(fichas.data ?? [])]
    .filter((f) => sePuedeRevelar(f.visibility))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const propias = statblocks.data?.campaign ?? [];

  return (
    <div className="flex flex-col gap-s3">
      <Bloque titulo="La escena abre en" icono={<IconoMundo />}>
        {sesiones.isLoading ? (
          <p className="font-chrome text-chrome-sm text-muted">Buscando la próxima sesión…</p>
        ) : proxima ? (
          <>
            <p className="font-title text-chrome-md text-text">{proxima.title}</p>
            {notas ? (
              <p className="mt-s2 whitespace-pre-line font-world text-world-base text-text">
                {notas}
              </p>
            ) : (
              <p className="mt-s2 font-chrome text-chrome-sm text-muted">
                Todavía no has escrito dónde abre. El modelo no guarda una escena inicial aparte: se
                escribe en las notas de la sesión.
              </p>
            )}
          </>
        ) : (
          <EmptyState title="No hay ninguna sesión planificada">
            La preparación empieza por decidir cuándo se juega.
          </EmptyState>
        )}
        <p className="mt-s2">
          <Link
            to={`/campaigns/${campaignId}?seccion=sessions`}
            className="font-chrome text-chrome-sm text-accent-text underline"
          >
            Planificar sesiones
          </Link>
        </p>
      </Bloque>

      <Bloque titulo="A mano para revelar" icono={<IconoMegafono />}>
        {ocultas.length === 0 ? (
          <p className="font-chrome text-chrome-sm text-muted">
            La mesa ya ve todo lo que hay escrito. Nada que revelar.
          </p>
        ) : (
          <>
            <ul>
              {ocultas.slice(0, A_MANO).map((ficha) => (
                <FilaParaRevelar key={ficha.id} campaignId={campaignId} ficha={ficha} />
              ))}
            </ul>
            <p className="mt-s2 font-chrome text-chrome-xs text-muted">
              Revelar pone la ficha a la vista de la mesa. Es un cambio de visibilidad de verdad, y
              el servidor lo anota en el registro.
              {ocultas.length > A_MANO &&
                ` Hay ${ocultas.length - A_MANO} más ocultas; se ofrecen las ${A_MANO} más recientes.`}
            </p>
          </>
        )}
      </Bloque>

      <div className="grid gap-s3 md:grid-cols-2">
        <Bloque titulo="Criaturas a mano" icono={<IconoBestiario className="h-[1em] w-[1em]" />}>
          {npcs.isError || statblocks.isError ? (
            <p className="font-chrome text-chrome-sm text-danger-text">
              No se pudo cargar el bestiario. Una lista vacía aquí no significa que no tengas
              criaturas.
            </p>
          ) : (npcs.data ?? []).length === 0 && propias.length === 0 ? (
            <p className="font-chrome text-chrome-sm text-muted">
              Ninguna criatura bajada a la mesa ni escrita por ti todavía.
            </p>
          ) : (
            <ul className="space-y-s1 font-world text-world-base text-text">
              {(npcs.data ?? []).map((npc) => (
                <li key={npc.id}>· {npc.name}</li>
              ))}
              {propias.map((sb) => (
                <li key={sb.ref} className="text-muted">
                  · {sb.name} <span className="font-chrome text-chrome-xs">(sin bajar)</span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Tiradas que pediré" icono={<IconoD20 />}>
          {peticiones.isError ? (
            <p className="font-chrome text-chrome-sm text-danger-text">
              No se pudieron cargar las peticiones de tirada.
            </p>
          ) : (peticiones.data ?? []).length === 0 ? (
            <p className="font-chrome text-chrome-sm text-muted">
              Ninguna pendiente. Se piden desde la mesa, con la sesión abierta.
            </p>
          ) : (
            <ul className="space-y-s1 font-world text-world-base text-text">
              {(peticiones.data ?? []).map((p) => (
                <li key={p.id}>
                  · {p.label}
                  {p.dc !== null && (
                    <span className="font-data text-chrome-xs text-muted"> · CD {p.dc}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </div>
    </div>
  );
}
