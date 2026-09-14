import { useState } from "react";
import type { Visibility } from "@dnd/shared";
import type { Entity } from "../../entities/api";
import { useAllEntities } from "../../entities/hooks";
import { BotonRevelar, sePuedeRevelar } from "../../entities/BotonRevelar";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import { EXPLICACION_DE_NIVEL } from "../../entities/visibilidad";
import { useNpcs, useRevealNpc } from "../../bestiario/hooks";
import type { NpcEnLaMesa } from "../../bestiario/api";
import { Badge } from "../../../ui/Badge";
import { Button, fieldControlClass } from "../../../ui";

// **«Revelar algo», la primera de las seis herramientas del DM.**
//
// La maqueta pone «Revelar algo» en la rejilla de `HerramientasDeNarracion.tsx:19-46` y la deja
// abriendo el códice del mundo. Aquí se cablea contra lo que el servidor ya sabe hacer
// (`PATCH /campaigns/:id/entities/:entityId`, `features/entities`): **subir el nivel de
// visibilidad de una ficha a «Jugadores»**. Eso es una revelación de verdad —después de pulsar,
// la ficha aparece en la pantalla de la mesa— y no un cartel que promete algo que no ocurre.
//
// ## Por qué esta lista es al revés que el buscador del mundo
//
// `ConsultaDelMundo` sirve para **leer** y por eso lo enseña todo. Esto sirve para **enseñar**, y
// por eso solo lista lo que la mesa **todavía no ve**: una ficha ya pública no se puede revelar,
// y ofrecerla sería ofrecer un botón sin efecto. El filtro se hace sobre una lista que el
// servidor ya acotó con `canView` —**no es control de acceso**, solo puede ocultar filas que
// quien mira ya tenía derecho a ver.
//
// ## Y por qué NO lleva la frase del empujón
//
// La maqueta escribe, junto a «Enseñar a la mesa», que *«aparece como un empujón en la pantalla
// de los jugadores, no como un cambio de permiso»*. Aquí sería mentira: esto **es** un cambio de
// permiso, y la regla del proyecto dice que cuando el texto y el servidor discrepan, el que
// miente es el texto. La frase se guarda para cuando exista el empujón (las notificaciones están
// construidas en el servidor y no las lee ninguna pantalla — §8.1 de la auditoría).

// **Ni el predicado ni la mutación son de aquí, y desde el ensamblado no se copian.**
// `features/entities/BotonRevelar.tsx` es el dueño del dominio: exporta `sePuedeRevelar` —qué
// niveles hacen que revelar signifique algo— y el botón que manda el `PATCH`. Había **tres**
// sitios en la aplicación repitiendo las dos cosas; `CLAUDE.md` dice que un matiz de visibilidad
// se escribe una sola vez, así que esta pantalla se queda con lo que sí es suyo —el cajón, la
// lista, el buscador y la confirmación— y le pasa los cuatro props al dueño.

/** A qué nivel se revela. «Jugadores» = todos los que se sientan a esta mesa. */
const NIVEL_REVELADO = "PLAYERS" as const;

/**
 * **PNJ del mundo y la mesa (spec §3.4)** — «Revelar algo» también lista las criaturas que la
 * mesa todavía no ve, no solo las fichas del mundo. El tipo de fila se escribe una sola vez aquí
 * y no inline (regla vinculante: ningún valor de enumeración llega a la pantalla suelto, y una
 * criatura tampoco tiene un `EntityType` del que sacar su etiqueta con `ETIQUETA_DE_TIPO`).
 */
const ETIQUETA_CRIATURA = "Criatura en la mesa";

export function RevelarAlgo({ campaignId }: { campaignId: string }) {
  const { data: entidades, isLoading: cargandoEntidades } = useAllEntities(campaignId);
  const { data: pnjs, isLoading: cargandoPnjs } = useNpcs(campaignId);
  const [busqueda, setBusqueda] = useState("");
  const isLoading = cargandoEntidades || cargandoPnjs;

  const fichasOcultas = (entidades ?? []).filter((e) => sePuedeRevelar(e.visibility));
  const criaturasOcultas = (pnjs ?? []).filter((p) => sePuedeRevelar(p.visibility as Visibility));
  const texto = busqueda.trim().toLowerCase();
  const fichasEncontradas = texto
    ? fichasOcultas.filter((e) => e.name.toLowerCase().includes(texto))
    : fichasOcultas;
  const criaturasEncontradas = texto
    ? criaturasOcultas.filter((p) => p.name.toLowerCase().includes(texto))
    : criaturasOcultas;
  const hayOcultos = fichasOcultas.length > 0 || criaturasOcultas.length > 0;
  const hayEncontrados = fichasEncontradas.length > 0 || criaturasEncontradas.length > 0;

  return (
    <div className="flex flex-col gap-s3">
      <p className="font-chrome text-chrome-sm leading-snug text-muted">
        Lo que la mesa todavía no ve. Revelar sube la ficha al nivel «Jugadores»:{" "}
        {EXPLICACION_DE_NIVEL[NIVEL_REVELADO]}
      </p>

      <input
        aria-label="Buscar entre lo oculto"
        placeholder="Buscar entre lo oculto…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={fieldControlClass}
      />

      {isLoading && <p className="font-chrome text-chrome-sm text-muted">Leyendo el mundo…</p>}

      {!isLoading && !hayOcultos && (
        <p className="rounded-radius-sm border border-muted p-s3 font-chrome text-chrome-sm text-muted">
          No queda nada oculto en esta campaña: la mesa lo ve todo, fichas y criaturas.
        </p>
      )}

      {!isLoading && hayOcultos && !hayEncontrados && (
        <p className="font-chrome text-chrome-sm text-muted">Nada oculto con ese nombre.</p>
      )}

      <ul className="flex flex-col gap-s2">
        {fichasEncontradas.map((e) => (
          <FilaRevelable key={e.id} campaignId={campaignId} entidad={e} />
        ))}
        {criaturasEncontradas.map((p) => (
          <FilaDeCriatura key={p.id} campaignId={campaignId} pnj={p} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Una fila.
 *
 * Es un componente propio **por la confirmación**, que es estado por fila. La mutación ya no vive
 * aquí: la trae `BotonRevelar`, que monta `useUpdateEntity` con el tipo de SU ficha y por tanto
 * invalida la lista correcta —la de esa pestaña, la completa y la página de lectura—. Antes esta
 * fila montaba su propio hook y era la tercera copia de la misma decisión.
 */
function FilaRevelable({ campaignId, entidad }: { campaignId: string; entidad: Entity }) {
  // **La confirmación, y por qué no es ceremonia.**
  //
  // Encima de esta rejilla está impreso *«El sistema propone; tú decides. Nada llega a la mesa
  // hasta que lo confirmas»*. Con una sola pulsación, esa frase era falsa: revelar es
  // **irreversible en la práctica** —lo que la mesa ha leído no se puede des-leer, aunque el
  // nivel se pueda volver a bajar—, y una lista de fichas ocultas es exactamente donde un dedo
  // resbala. La frase es voz de producto y se conserva literal, así que lo que se añade es el
  // paso que la hace cierta.
  //
  // Confirmación **en pantalla y en la propia fila**, nunca `window.confirm` (patrón ya
  // establecido en 1.16 y repetido en `ListaDeReglas`): un diálogo del navegador se sale del
  // idioma, del tema y del foco atrapado del cajón.
  const [confirmando, setConfirmando] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-s2 rounded-radius-sm border border-muted bg-bg px-s3 py-s2">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-chrome text-chrome-sm text-text">{entidad.name}</span>
        <span className="font-chrome text-chrome-xs text-muted">
          {ETIQUETA_DE_TIPO[entidad.type]}
        </span>
      </span>
      <Badge visibility={entidad.visibility} />
      {confirmando ? (
        <>
          <span className="font-chrome text-chrome-xs text-copper-text">
            ¿Se lo enseñas a la mesa?
          </span>
          {/* El botón del dueño del dominio hace el gesto; la confirmación es de esta pantalla.
              Los dos rótulos nunca conviven: o está el que pregunta, o está el que responde.
              `BotonRevelar` pinta el mensaje del servidor tal cual si falla, y devuelve `null`
              sobre una ficha que ya no se puede revelar — inofensivo sobre una lista ya
              filtrada con su mismo predicado. */}
          <BotonRevelar
            campaignId={campaignId}
            type={entidad.type}
            entityId={entidad.id}
            visibility={entidad.visibility}
          />
          <Button type="button" variant="secondary" onClick={() => setConfirmando(false)}>
            No
          </Button>
        </>
      ) : (
        <Button type="button" variant="primary" onClick={() => setConfirmando(true)}>
          Revelar a la mesa
        </Button>
      )}
    </li>
  );
}

/**
 * Una criatura (PNJ del mundo y la mesa, spec §3.4) — hermana de `FilaRevelable`, misma
 * confirmación en fila, pero la mutación es `useRevealNpc` (E-PM-1/E-PM-2) y no `BotonRevelar`:
 * un PNJ no es una `Entity`, así que su gesto de revelar no pasa por el dueño del dominio de
 * fichas. `sePuedeRevelar` sí es el mismo predicado — la lista ya viene filtrada con él.
 */
function FilaDeCriatura({ campaignId, pnj }: { campaignId: string; pnj: NpcEnLaMesa }) {
  const [confirmando, setConfirmando] = useState(false);
  const revelar = useRevealNpc(campaignId);

  return (
    <li className="flex flex-wrap items-center gap-s2 rounded-radius-sm border border-muted bg-bg px-s3 py-s2">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-chrome text-chrome-sm text-text">{pnj.name}</span>
        <span className="font-chrome text-chrome-xs text-muted">{ETIQUETA_CRIATURA}</span>
      </span>
      <Badge visibility={pnj.visibility as Visibility} />
      {confirmando ? (
        <>
          <span className="font-chrome text-chrome-xs text-copper-text">
            ¿Se lo enseñas a la mesa?
          </span>
          <Button
            type="button"
            variant="primary"
            disabled={revelar.isPending}
            onClick={() => revelar.mutate(pnj.id)}
          >
            Revelar a la mesa
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirmando(false)}>
            No
          </Button>
          {revelar.isError && (
            <span role="alert" className="font-chrome text-chrome-xs text-danger-text">
              {(revelar.error as Error).message}
            </span>
          )}
        </>
      ) : (
        <Button type="button" variant="primary" onClick={() => setConfirmando(true)}>
          Revelar a la mesa
        </Button>
      )}
    </li>
  );
}
