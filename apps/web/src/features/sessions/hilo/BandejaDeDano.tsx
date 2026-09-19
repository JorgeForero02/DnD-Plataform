import type { GameEventPayload } from "@dnd/shared";
import { ApiError } from "../../../lib/api";
import { Button } from "../../../ui/Button";
import { IconoAviso } from "../../../ui/Iconos";
import { nombreTipoDano } from "../../../dominio/dano";
import { NOMBRE_MODIFICADOR_DE_DANO } from "../vocabulario";
import { useApplyDamage, useDamagePreview } from "../hooks";

// Tarea 7 de la puerta de efectos (spec §4 bis §4b.5/§4b.6, E-PE-2). La bandeja de daño: la línea
// que enseña el servidor antes de aplicar nada, y el botón de un solo clic para quien puede.
//
// **El preview es la única fuente de la cifra reducida y del nombre del objetivo.** `pendingDamage`
// —lo que trae el propio suceso— solo sirve para decidir SI se monta este componente
// (`MensajeDelHilo`) y para identificar la tirada y el objetivo al invalidar la hoja tras aplicar;
// el número que se lee siempre viene de `GET .../damage-preview`, calculado por el servidor con
// las mismas resistencias/vulnerabilidades/inmunidades que `changeHp` usaría de verdad. Ningún
// número se calcula aquí.
//
// **El 404 no es un error de red, es la respuesta para quien no podría aplicar** (§4b.5): mostrar
// entonces el nombre del objetivo o la cifra sería la misma fuga que el servidor evita al
// devolver 404 en vez de 403. Por eso, sin preview, esta bandeja solo dice «Daño pendiente» — ni
// un dato más — y sin botón.
//
// **«Aplicado» sale de `pendingDamage.appliedEventId`, que es de todos** (ola de arreglos 1). El
// candado de un solo uso vive en el propio payload del suceso (§4b.6) y el sondeo del hilo lo
// trae a TODOS los espectadores, incluido el atacante que recibe 404 en el preview: así el
// atacante ve que el DM ya aplicó su daño sin que nadie le cuente el nombre ni la cifra. El
// `canApply` del preview sigue valiendo para el DM y el dueño entre el clic y la siguiente
// lectura del hilo — `useApplyDamage` invalida el preview para eso.

type PendingDamage = NonNullable<
  Extract<GameEventPayload, { type: "ABILITY_ROLL" }>["pendingDamage"]
>;

export function BandejaDeDano({
  campaignId,
  rollEventId,
  pendingDamage,
  compacta = false,
}: {
  campaignId: string;
  rollEventId: string;
  pendingDamage: PendingDamage;
  /** D-CF-149: en la línea del registro de la mesa, una sola fila con «Aplicar» pequeño. */
  compacta?: boolean;
}): JSX.Element | null {
  // `enabled` cuelga de `pendingDamage.targetCharacterId` y no de una constante: sin objetivo no
  // hay nada que previsualizar, y el llamador ya garantiza que solo se monta este componente con
  // un `pendingDamage` real (`MensajeDelHilo`).
  const preview = useDamagePreview(
    campaignId,
    rollEventId,
    Boolean(pendingDamage.targetCharacterId),
  );
  const aplicar = useApplyDamage(campaignId);

  const es404 = preview.error instanceof ApiError && preview.error.status === 404;
  const yaAplicado = Boolean(pendingDamage.appliedEventId);

  // Cualquier otro código (500, un fallo de red…) sigue siendo un fallo de verdad, no «no hay
  // nada que enseñar»: aquí no se inventa una frase de error genérica sin saber qué pasó, así que
  // la bandeja no pinta nada.
  if (preview.isError && !es404) return null;

  // Task 8 (3A.2) — **el dueño del atacante ahora recibe 200, no 404**, pero solo con
  // `extrasDisponibles`/`extras` (sin `target` ni `resulting`, que siguen siendo del DM/dueño
  // del objetivo). Esta bandeja es de ESE dueño/DM, así que un preview sin `target` es «nada que
  // enseñar aquí» — la misma frase que antes decía el 404. `DanoExtra` es quien sí pinta algo con
  // esa forma reducida.
  if (preview.isError || !preview.data || !("target" in preview.data)) {
    return compacta ? (
      <span className="ml-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">
        {yaAplicado ? "Aplicado" : "Daño pendiente"}
      </span>
    ) : (
      <p className="my-s2 border-y border-copper/25 py-s2 font-chrome text-chrome-sm text-muted">
        {yaAplicado ? "Aplicado" : "Daño pendiente"}
      </p>
    );
  }

  // A esta altura `target` está presente (la guarda de arriba lo comprueba) — el resto de los
  // campos de la vista completa vienen siempre junto a él (`character-sheet.service.ts`,
  // `damagePreview`), así que se leen con `!`: el tipo los deja opcionales para dar cabida a la
  // vista reducida del dueño del atacante (Task 8), no porque puedan faltar aquí.
  const p = preview.data;
  const target = p.target!;
  const { modifier, reason, taken } = p.resulting!;
  const nombreModificador = modifier ? NOMBRE_MODIFICADOR_DE_DANO[modifier] : null;
  const aplicado = yaAplicado || !p.canApply;

  if (compacta) {
    return (
      <span className="mt-px flex flex-wrap items-center gap-x-s2 gap-y-px font-chrome text-chrome-xs text-muted">
        <span>
          {`${target.name}: ${p.amount} ${nombreTipoDano(p.damageType!)} → `}
          <span className="font-data text-text">{taken}</span>
          {nombreModificador && ` · ${nombreModificador}`}
          {nombreModificador && reason && ` (${reason})`}
        </span>
        {!aplicado ? (
          <Button
            variant="secondary"
            className="px-s2 py-px text-chrome-xs"
            aria-label={`Aplicar el daño a ${target.name}`}
            disabled={aplicar.isPending}
            onClick={() => aplicar.mutate({ rollEventId, targetCharacterId: target.id })}
          >
            Aplicar
          </Button>
        ) : (
          <span className="uppercase tracking-wide">Aplicado</span>
        )}
        {aplicar.isError && (
          <span role="alert" className="text-danger-text">
            <IconoAviso className="mr-1 inline h-3.5 w-3.5" />
            {(aplicar.error as Error).message}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="my-s2 flex flex-col gap-s2 border-y border-copper/25 py-s2">
      <p className="font-chrome text-chrome-sm">
        {`${target.name}: ${p.amount} ${nombreTipoDano(p.damageType!)} → `}
        <span className="font-data">{taken}</span>
        {nombreModificador && ` · ${nombreModificador}`}
        {nombreModificador && reason && ` (${reason})`}
      </p>
      {!aplicado ? (
        <div>
          <Button
            variant="secondary"
            aria-label={`Aplicar el daño a ${target.name}`}
            disabled={aplicar.isPending}
            onClick={() => aplicar.mutate({ rollEventId, targetCharacterId: target.id })}
          >
            Aplicar
          </Button>
        </div>
      ) : (
        <p className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">Aplicado</p>
      )}
      {aplicar.isError && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          <IconoAviso className="mr-1 inline h-3.5 w-3.5" />
          {(aplicar.error as Error).message}
        </p>
      )}
    </div>
  );
}
