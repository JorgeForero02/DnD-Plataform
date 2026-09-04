import { useState } from "react";
import type { Entity } from "../../entities/api";
import { useAllEntities, useUpdateEntity } from "../../entities/hooks";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import { EXPLICACION_DE_NIVEL } from "../../entities/visibilidad";
import { Badge } from "../../../ui/Badge";
import { Button, fieldControlClass } from "../../../ui";
import { ApiError } from "../../../lib/api";

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

/** A qué nivel se revela. «Jugadores» = todos los que se sientan a esta mesa. */
const NIVEL_REVELADO = "PLAYERS" as const;

/** Lo que la mesa todavía no ve. Los otros dos niveles ya la incluyen entera. */
function estaOculta(e: Entity): boolean {
  return e.visibility !== "PUBLIC" && e.visibility !== "PLAYERS";
}

function mensajeDeError(error: unknown): string {
  // El mensaje del servidor se pinta tal cual: un rechazo suyo dice más que un aviso genérico.
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo revelar.";
}

export function RevelarAlgo({ campaignId }: { campaignId: string }) {
  const { data: entidades, isLoading } = useAllEntities(campaignId);
  const [busqueda, setBusqueda] = useState("");

  const ocultas = (entidades ?? []).filter(estaOculta);
  const texto = busqueda.trim().toLowerCase();
  const encontradas = texto ? ocultas.filter((e) => e.name.toLowerCase().includes(texto)) : ocultas;

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

      {!isLoading && ocultas.length === 0 && (
        <p className="rounded-radius-sm border border-muted p-s3 font-chrome text-chrome-sm text-muted">
          No queda nada oculto en esta campaña: la mesa ya lo ve todo.
        </p>
      )}

      {!isLoading && ocultas.length > 0 && encontradas.length === 0 && (
        <p className="font-chrome text-chrome-sm text-muted">Nada oculto con ese nombre.</p>
      )}

      <ul className="flex flex-col gap-s2">
        {encontradas.map((e) => (
          <FilaRevelable key={e.id} campaignId={campaignId} entidad={e} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Una fila, y **su propia mutación**.
 *
 * `useUpdateEntity` necesita el `type` de la ficha para invalidar la lista de esa pestaña, y el
 * tipo cambia de fila en fila. Un hook no se puede llamar dentro de un bucle, así que cada fila
 * es un componente: así cada una monta el hook con **su** tipo y las invalidaciones que ese hook
 * ya sabe hacer —la lista por tipo, la lista completa y la página de lectura— siguen siendo
 * correctas. Reimplementarlas aquí con una mutación suelta habría sido escribir una cuarta copia
 * de las claves de caché.
 */
function FilaRevelable({ campaignId, entidad }: { campaignId: string; entidad: Entity }) {
  const actualizar = useUpdateEntity(campaignId, entidad.type);
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
          <Button
            type="button"
            variant="primary"
            onClick={() =>
              actualizar.mutate(
                { entityId: entidad.id, input: { visibility: NIVEL_REVELADO } },
                // La fila desaparece de la lista al invalidarse la caché —deja de estar
                // oculta—, pero si el servidor tarda o falla, el estado se devuelve a su sitio
                // en vez de quedarse en «confirmando» para siempre.
                { onSettled: () => setConfirmando(false) },
              )
            }
            disabled={actualizar.isPending}
          >
            {actualizar.isPending ? "Revelando…" : "Sí, revelar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirmando(false)}>
            No
          </Button>
        </>
      ) : (
        <Button type="button" variant="primary" onClick={() => setConfirmando(true)}>
          Revelar a la mesa
        </Button>
      )}
      {actualizar.isError && (
        <p role="alert" className="w-full font-chrome text-chrome-xs text-danger-text">
          {mensajeDeError(actualizar.error)}
        </p>
      )}
    </li>
  );
}
