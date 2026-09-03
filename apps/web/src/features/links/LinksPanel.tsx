import { useState } from "react";
import { Link } from "react-router-dom";
import { useAllEntities } from "../entities/hooks";
import { useMyRole } from "../campaigns/members";
import { CHECKING_PERMISSIONS } from "../campaigns/PermissionStatus";
import { useCreateLink, useDeleteLink, useLinks } from "./hooks";
import { Button } from "../../ui/Button";
import { ETIQUETA_DE_TIPO } from "../entities/resumen";
import { fieldControlClass } from "../../ui/Field";
import { lecturaEntrante, lecturaSaliente, relacionesSugeridas } from "./relaciones";
import type { EntityLink } from "./api";

// Iconos **dibujados**, nunca un glifo de fuente: una flecha de fuente se pinta a todo color en
// unos sistemas y como cuadro vacío en otros. Heredan `currentColor` y van dentro de una línea
// de texto, así que se dimensionan en `1em` y no en píxeles — así escalan con ella. El texto de
// al lado ya dice la dirección (hay además un rótulo solo para lectores), así que son
// decorativos.
function IconoEnLinea({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-[1em] w-[1em] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function FlechaSale() {
  return (
    <IconoEnLinea>
      <path d="M2.5 8h10" />
      <path d="M9 4.5 12.5 8 9 11.5" />
    </IconoEnLinea>
  );
}

function FlechaEntra() {
  return (
    <IconoEnLinea>
      <path d="M13.5 8h-10" />
      <path d="M7 4.5 3.5 8 7 11.5" />
    </IconoEnLinea>
  );
}

/** La punta que dice «esto se abre», al final del nombre de la ficha vecina. */
function Punta() {
  return (
    <IconoEnLinea>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </IconoEnLinea>
  );
}

/** Dos eslabones: la marca del panel. Un enlace del mundo, no una cadena de navegador. */
function IconoEslabon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-[1em] w-[1em] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.6 9.4a2.6 2.6 0 0 1 0-3.7l1.9-1.9a2.6 2.6 0 0 1 3.7 3.7l-.9.9" />
      <path d="M9.4 6.6a2.6 2.6 0 0 1 0 3.7l-1.9 1.9a2.6 2.6 0 0 1-3.7-3.7l.9-.9" />
    </svg>
  );
}

// Bloque L. Este panel pinta los enlaces **por sus dos lados**: los que salen de la ficha y los
// que llegan a ella (retroenlaces). Quién puede quitar cada uno y qué fichas se pueden ver lo
// decide el servidor: `canRemove` viaja resuelto por fila y la lista llega ya filtrada por
// `canView`. Esto solo deja de ofrecer lo que el `DELETE` rechazaría.
//
// ## Reseño 2026-09-03 — «los enlaces más entendibles» (petición literal del autor)
//
// Antes cada enlace era una línea: `Torre Gris (Lugar) — vive aquí`. Tres datos separados por
// puntuación, con la relación al final y de refilón, y sin decir nunca de quién se hablaba. La
// maqueta de referencia lo convierte en **una frase**, y eso es lo que se adopta:
//
//     Maestre Kellan  vive en
//     La Torre Gris ›
//     Lugar
//
// El sujeto es siempre la ficha abierta (por eso `relaciones.ts` tuvo que arreglar tres
// inversiones que tenían por sujeto la ficha de enfrente), el predicado va en cobre —pertenece
// al mundo, no es un botón— y el complemento es lo único azul, porque es lo único que se pulsa.
// Cada enlace es su propia tarjeta en vez de un renglón de una lista: lo que se busca aquí es
// «¿quién está al lado de esto?», y eso se lee mejor como fichas de un vecindario.
//
// **Lo que NO se copia de la maqueta:** allí las dos direcciones van mezcladas en una sola
// lista y la dirección se marca dentro de cada tarjeta. Aquí se conservan los dos grupos con su
// encabezado, porque son la leyenda del mapa —lo que sale de aquí no es lo mismo que lo que
// llega, y quien lea con lector de pantalla necesita esa estructura para saltar entre ellos.
// La maqueta enseñaba tres enlaces; una ficha vieja tiene veinte.
export function LinksPanel({
  campaignId,
  entityId,
  entityName,
}: {
  campaignId: string;
  entityId: string;
  /**
   * El sujeto de la frase. Si no llega, se busca en la lista de fichas que el selector ya
   * necesita; y si tampoco está (todavía cargando), se dice «Esta ficha», que es cierto
   * siempre. Nunca se deja la frase sin sujeto: sin él vuelve a ser una lista.
   */
  entityName?: string;
  /**
   * Ya no decide nada, y por eso no se lee: quién puede quitar un enlace lo dice el servidor
   * por fila, porque en un retroenlace la ficha de origen es **la de enfrente** y esta no sabe
   * quién la creó. Se conserva en el tipo para no romper a quien lo siga pasando.
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

  const propia = targets.data?.find((e) => e.id === entityId);
  const sujeto = entityName?.trim() || propia?.name || "Esta ficha";

  // Solo se excluyen los destinos **ya enlazados desde aquí**, no los que enlazan hacia aquí:
  // «Corvin protege a la Torre» y «la Torre da cobijo a Corvin» son dos hechos distintos, y
  // prohibir el segundo porque existe el primero perdería mundo. Y enlazar consigo misma no
  // significa nada.
  const yaEnlazadas = new Set(salientes.map((l) => l.to.id));
  const candidates = (targets.data ?? []).filter(
    (e) => e.id !== entityId && !yaEnlazadas.has(e.id),
  );

  const tipoPropio = propia?.type;
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

  function tarjeta(l: EntityLink) {
    const entra = l.direction === "INCOMING";
    // Un retroenlace leído al derecho miente: «vive en» visto desde la Torre Gris diría que la
    // Torre vive en Corvin. Se compone con la lectura declarada en `relaciones.ts`.
    const lectura = entra ? lecturaEntrante(l.label) : lecturaSaliente(l.label);
    return (
      <li key={l.id}>
        <article className="rounded-radius-sm border border-muted bg-surface px-s3 py-s2">
          <p className="flex items-start gap-1.5 font-chrome text-chrome-xs leading-snug">
            <span className="mt-[0.15em] text-copper-text">
              {entra ? <FlechaEntra /> : <FlechaSale />}
            </span>
            <span className="min-w-0">
              {/* El rótulo de dirección no se pinta: lo dice la flecha y lo dice la frase. Pero
                  un lector de pantalla no ve ninguna de las dos cosas. */}
              <span className="sr-only">{entra ? "Enlace entrante." : "Enlace saliente."} </span>
              <span className="text-muted">{sujeto}</span>{" "}
              <span className="text-copper-text">{lectura.relacion}</span>
            </span>
          </p>
          <p className="mt-0.5">
            <Link
              to={`/campaigns/${campaignId}/entidades/${l.to.id}`}
              className="inline-flex items-baseline gap-1 font-world text-world-base leading-snug text-accent-text underline-offset-2 hover:underline"
            >
              {l.to.name}
              <Punta />
            </Link>
          </p>
          <p className="mt-0.5 flex items-baseline justify-between gap-2 font-chrome text-chrome-xs text-muted">
            <span className="min-w-0">
              {ETIQUETA_DE_TIPO[l.to.type]}
              {/* Una etiqueta que no está en el catálogo no se invierte: se cita. Adivinar la
                  inversa de una frase que nadie declaró sería mentir sobre el mundo del DM. */}
              {lectura.literal ? ` · dice «${lectura.literal}»` : ""}
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
              className="shrink-0 text-danger-text underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:text-muted"
            >
              Quitar
            </button>
          </p>
        </article>
      </li>
    );
  }

  function grupo(titulo: string, icono: React.ReactNode, items: EntityLink[]) {
    if (items.length === 0) return null;
    return (
      <>
        <h4 className="flex items-center gap-1.5 font-chrome text-chrome-xs uppercase tracking-[0.16em] text-muted">
          <span className="text-copper-text">{icono}</span>
          {titulo}
        </h4>
        <ul className="space-y-s2">{items.map(tarjeta)}</ul>
      </>
    );
  }

  return (
    <section className="rounded-radius-sm border border-muted">
      {/* La cabecera del panel va sobre un filete de cobre y no sobre uno gris: el cobre es lo
          que pertenece al mundo, y un enlace entre dos fichas es mundo, no instrumental. */}
      <h3 className="flex items-center gap-s2 border-b border-copper px-s3 py-s2 font-chrome text-chrome-sm font-semibold text-text">
        <IconoEslabon />
        Enlaces
      </h3>
      <div className="space-y-s3 p-s3">
        {links.isLoading && <p className="text-chrome-sm text-muted">Cargando enlaces…</p>}
        {links.isError && (
          <p className="text-chrome-sm text-danger-text">No se pudieron cargar los enlaces.</p>
        )}
        {links.data && filas.length === 0 && (
          <p className="text-chrome-sm text-muted">Sin enlaces.</p>
        )}

        {grupo("Salen de aquí", <FlechaSale />, salientes)}
        {/* L1, el retroenlace: quien enlazó hacia esta ficha. Es lo que hace que abrir la Torre
            Gris cuente que Corvin vive en ella, sin que nadie tuviera que escribir el enlace dos
            veces ni acordarse de borrar los dos. */}
        {grupo("Llegan aquí", <FlechaEntra />, entrantes)}

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
          <form onSubmit={onAdd} className="space-y-2 border-t border-muted pt-s3">
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
      </div>
    </section>
  );
}
