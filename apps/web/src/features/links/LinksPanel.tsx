import { useState } from "react";
import { Link } from "react-router-dom";
import { useAllEntities } from "../entities/hooks";
import { useMyRole } from "../campaigns/members";
import { CHECKING_PERMISSIONS } from "../campaigns/PermissionStatus";
import { useCreateLink, useDeleteLink, useLinks } from "./hooks";
import { Button } from "../../ui/Button";
import { ETIQUETA_DE_TIPO } from "../entities/resumen";
import { fieldControlClass } from "../../ui/Field";
import { etiquetaEntrante, relacionesSugeridas } from "./relaciones";
import type { EntityLink } from "./api";

// Iconos **dibujados**, nunca un glifo de fuente: una flecha de fuente se pinta a todo color en
// unos sistemas y como cuadro vacío en otros. Heredan `currentColor` y acompañan a un texto que
// ya dice lo mismo, así que son decorativos (`aria-hidden`).
function FlechaSale() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h10" />
      <path d="M9 4.5 12.5 8 9 11.5" />
    </svg>
  );
}

function FlechaEntra() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 8h-10" />
      <path d="M7 4.5 3.5 8 7 11.5" />
    </svg>
  );
}

// Bloque L. Este panel pinta ahora los enlaces **por sus dos lados**: los que salen de la ficha
// y los que llegan a ella (retroenlaces). Quién puede quitar cada uno y qué fichas se pueden
// ver lo decide el servidor: `canRemove` viaja resuelto por fila y la lista llega ya filtrada
// por `canView`. Esto solo deja de ofrecer lo que el `DELETE` rechazaría.
export function LinksPanel({
  campaignId,
  entityId,
}: {
  campaignId: string;
  entityId: string;
  /**
   * Ya no decide nada, y por eso no se lee: quién puede quitar un enlace lo dice el servidor
   * por fila, porque en un retroenlace la ficha de origen es **la de enfrente** y esta no sabe
   * quién la creó. Se conserva en el tipo para no romper a `EntityDetailPage.tsx`, que está
   * fuera de esta frontera de ficheros.
   */
  entityCreatedById?: string;
}) {
  const links = useLinks(entityId);
  const targets = useAllEntities(campaignId);
  const createLink = useCreateLink(entityId);
  const deleteLink = useDeleteLink(entityId);
  const [toId, setToId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { role, isLoading: roleLoading, isError: roleError } = useMyRole(campaignId);
  // Same "still don't know" treatment as everywhere else in this app (CampaignDetailPage.tsx):
  // a failed or in-flight role check disables rather than guesses.
  const roleUnresolved = roleLoading || roleError;
  // **Enlazar es escribir el mundo: solo el DM.** Y aquí importa doblemente, porque un enlace
  // revela que dos cosas tienen que ver aunque el jugador no pueda abrir ninguna de las dos.
  // El servidor lo impone (`links.service.ts`, `requireDM`); esto solo deja de ofrecerlo.
  const puedeEnlazar = !roleUnresolved && role === "DM";
  const removeReason = "Solo el DM o quien creó la ficha de la que sale el enlace puede quitarlo.";

  const filas = links.data ?? [];
  const salientes = filas.filter((l) => l.direction !== "INCOMING");
  const entrantes = filas.filter((l) => l.direction === "INCOMING");

  // Solo se excluyen los destinos **ya enlazados desde aquí**, no los que enlazan hacia aquí:
  // «Corvin protege a la Torre» y «la Torre da cobijo a Corvin» son dos hechos distintos, y
  // prohibir el segundo porque existe el primero perdería mundo. Y enlazar consigo misma no
  // significa nada.
  const yaEnlazadas = new Set(salientes.map((l) => l.to.id));
  const candidates = (targets.data ?? []).filter(
    (e) => e.id !== entityId && !yaEnlazadas.has(e.id),
  );

  const tipoPropio = targets.data?.find((e) => e.id === entityId)?.type;
  const tipoDestino = targets.data?.find((e) => e.id === toId)?.type;
  const sugerencias = tipoPropio && tipoDestino ? relacionesSugeridas(tipoPropio, tipoDestino) : [];

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!toId) return;
    try {
      await createLink.mutateAsync({ toId, label: label.trim() || undefined });
      setToId("");
      setLabel("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  function fila(l: EntityLink) {
    // Un retroenlace leído al derecho miente: «vive en» visto desde la Torre Gris diría que la
    // Torre vive en Corvin. Se enseña la lectura inversa declarada en `relaciones.ts`.
    const relacion = l.direction === "INCOMING" ? etiquetaEntrante(l.label) : l.label?.trim();
    return (
      <li key={l.id} className="flex items-center justify-between gap-2 text-chrome-sm">
        <span className="min-w-0">
          {/* L2: hasta aquí el destino era texto plano — el panel de enlaces era el único sitio
              de la aplicación donde un enlace no llevaba a ninguna parte. */}
          <Link
            to={`/campaigns/${campaignId}/entidades/${l.to.id}`}
            className="text-accent underline-offset-2 hover:underline"
          >
            {l.to.name}
          </Link>{" "}
          <span className="text-muted">({ETIQUETA_DE_TIPO[l.to.type]})</span>
          {relacion ? ` — ${relacion}` : ""}
        </span>
        <button
          type="button"
          onClick={() =>
            deleteLink.mutate(l.id, {
              onError: (err) => setError((err as Error).message),
            })
          }
          disabled={!l.canRemove}
          title={!l.canRemove ? removeReason : undefined}
          className="shrink-0 text-chrome-sm text-danger-text disabled:cursor-not-allowed disabled:text-muted"
        >
          Quitar
        </button>
      </li>
    );
  }

  return (
    <section className="space-y-2 rounded-radius-sm border border-muted p-3">
      <h3 className="text-chrome-sm font-semibold">Enlaces</h3>
      {links.isLoading && <p className="text-chrome-sm text-muted">Cargando enlaces…</p>}
      {links.isError && (
        <p className="text-chrome-sm text-danger-text">No se pudieron cargar los enlaces.</p>
      )}
      {links.data && filas.length === 0 && (
        <p className="text-chrome-sm text-muted">Sin enlaces.</p>
      )}

      {salientes.length > 0 && (
        <>
          <h4 className="flex items-center gap-1 text-chrome-xs uppercase tracking-wide text-muted">
            <FlechaSale />
            Salen de aquí
          </h4>
          <ul className="space-y-1">{salientes.map(fila)}</ul>
        </>
      )}

      {entrantes.length > 0 && (
        <>
          {/* L1, el retroenlace: quien enlazó hacia esta ficha. Es lo que hace que abrir la
              Torre Gris cuente que Corvin vive en ella, sin que nadie tuviera que escribir el
              enlace dos veces ni acordarse de borrar los dos. */}
          <h4 className="flex items-center gap-1 text-chrome-xs uppercase tracking-wide text-muted">
            <FlechaEntra />
            Llegan aquí
          </h4>
          <ul className="space-y-1">{entrantes.map(fila)}</ul>
        </>
      )}

      {/* Arreglo 2 (1.16-fix): the reason a row's "Quitar" is disabled used to live only in
          `title`, which touch has no way to reveal and screen readers don't announce. */}
      {filas.some((l) => !l.canRemove) && (
        <p className="text-chrome-xs text-muted">{removeReason}</p>
      )}
      {roleUnresolved && <p className="text-chrome-xs text-muted">{CHECKING_PERMISSIONS}</p>}
      {!roleUnresolved && !puedeEnlazar && (
        <p className="text-chrome-xs text-muted">Los enlaces entre fichas los pone el DM.</p>
      )}
      {puedeEnlazar && (
        <form onSubmit={onAdd} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="link-target" className="sr-only">
              Entidad destino
            </label>
            <select
              id="link-target"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className={fieldControlClass}
            >
              <option value="">Elige un destino…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({ETIQUETA_DE_TIPO[c.type]})
                </option>
              ))}
            </select>
            <label htmlFor="link-label" className="sr-only">
              Etiqueta del enlace
            </label>
            <input
              id="link-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Relación (opcional)"
              className={fieldControlClass}
            />
            <Button type="submit" disabled={!toId || createLink.isPending}>
              Añadir enlace
            </Button>
          </div>
          {/* L3: la etiqueta era texto libre y salía siempre en blanco, así que casi ningún
              enlace decía qué relación era. Las sugerencias dependen del **par de tipos** —lo
              que un PNJ puede ser de un lugar no es lo que un documento puede ser de una
              misión—, y siguen siendo sugerencias: el campo de al lado acepta cualquier frase. */}
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-chrome-xs text-muted">Sugeridas:</span>
              {sugerencias.map((r) => (
                <button
                  key={r.desde}
                  type="button"
                  onClick={() => setLabel(r.desde)}
                  aria-pressed={label === r.desde}
                  className="rounded-radius-sm border border-muted px-2 py-0.5 text-chrome-xs text-muted hover:border-accent hover:text-accent aria-pressed:border-accent aria-pressed:text-accent"
                >
                  {r.desde}
                </button>
              ))}
            </div>
          )}
        </form>
      )}
      {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
    </section>
  );
}
