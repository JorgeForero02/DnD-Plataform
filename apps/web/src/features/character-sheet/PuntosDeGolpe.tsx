import { useState } from "react";
import type { DamageType, DerivedValue } from "@dnd/shared";
import type { HpState } from "./api";
import { useChangeHp, useSetHp, useTiradasCitables } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { PROSA_DE_HOJA } from "./Tarjeta";
import { etiquetaDeTirada, SelectorDeTipoDeDano, TrazaDeDano } from "./AplicarDano";
import { nivelDeAgotamientoDeSourceKey, traducirLabelKey } from "./vocabulario";

// Tarea 2A.10 — "PG: el caso normal es un delta (recibo 5, me curo 3), no escribir un número".
// `POST .../hp` (2A.7) aplica el delta en el servidor; los PG temporales van aparte y nunca se
// suman a los actuales, y si `currentHp > maxHp` el servidor ya manda `exceedsMax` — aquí solo
// se enseña el aviso, nunca se recalcula el recorte en el cliente.

// **Las salvaciones de muerte se han mudado a su propia tarjeta** (`TarjetasDeEstado.tsx`), que
// es donde las pone la maqueta de Figma: en la fila de tarjetas pequeñas, con sus círculos de
// éxitos y fallos, y visibles siempre en vez de sólo a 0 PG. Un contador que sólo existe cuando
// ya es tarde no se puede consultar antes.

// **Y desde el 2026-09-04, el golpe dice de qué es y de dónde sale** (auditoría de la mesa,
// §8.2 y §8.5). Tres cosas que el servidor sabía hacer y nadie podía pedirle:
//
//  1. `damageType` — sin él, la pieza C de 2.5.1 (resistencias, vulnerabilidades e inmunidades)
//     no se ejecuta nunca. Estaba probada y desplegada, y no reducía nada en ninguna partida.
//  2. `rollEventId` y `critical` (2.5.4) — «¿de qué murió Elara?» no se puede responder con el
//     tipo a secas, y un crítico contra alguien a 0 PG suma **dos** fracasos, no uno.
//  3. `useSetHp` — la corrección **absoluta** con `expectedVersion`, escrita y sin un solo
//     consumidor. Es la única defensa contra dos personas tocando los mismos PG.
//
// **La corrección exacta vive aquí y no en el gesto rápido del elenco**, a propósito: un delta
// nunca necesita conflicto (dos deltas aterrizan los dos), y un valor absoluto siempre lo
// necesita. El `version` que se manda es el que trajo esta misma respuesta; si alguien escribió
// entre medias, el servidor responde 409 con lo que hay, y esa frase se pinta tal cual.

/**
 * **Por qué los PG máximos son la mitad** (2C.4).
 *
 * Con agotamiento 4 o más, el servidor parte los PG máximos y lo deja escrito en la traza de
 * `maxHp` con un paso `cap` cuyo `sourceKey` es `exhaustion:<nivel>`
 * (`apps/api/src/character-state/common/agotamiento.ts`). Sin esta línea, la mesa veía la mitad
 * de sus PG máximos sin ninguna explicación en la pantalla — y «¿de dónde sale este número?» es
 * justo la pregunta que este proyecto existe para responder.
 *
 * El texto sale de `traducirLabelKey`, **no se escribe suelto aquí**: si el motor cambia el
 * rótulo, cambia en un sitio.
 */
function PorQueLaMitad({ maxHp }: { maxHp: DerivedValue }) {
  const paso = maxHp.steps.find((p) => nivelDeAgotamientoDeSourceKey(p.sourceKey) !== null);
  if (!paso) return null;
  const nivel = nivelDeAgotamientoDeSourceKey(paso.sourceKey);
  return (
    <p className="mt-1 font-chrome text-chrome-xs text-warning-text">
      {traducirLabelKey(paso.labelKey).texto} (nivel {nivel}).
    </p>
  );
}

export function PuntosDeGolpe({
  campaignId,
  characterId,
  hp,
  maxHp,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  hp: HpState;
  /**
   * Los PG máximos **derivados, con su traza**. Opcional: `hp.max` ya viene con el agotamiento
   * aplicado y la cifra se pinta igual sin esto; lo que falta sin la traza es la explicación.
   */
  maxHp?: DerivedValue;
  puedeEditar: boolean;
}) {
  const [delta, setDelta] = useState("");
  const [tipoDeDano, setTipoDeDano] = useState<DamageType | "">("");
  const [critico, setCritico] = useState(false);
  const [tiradaCitada, setTiradaCitada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [pgExactos, setPgExactos] = useState("");

  const cambiarPg = useChangeHp(campaignId, characterId);
  const fijarPg = useSetHp(campaignId, characterId);
  // Solo se pide el registro cuando hay algo que citar, es decir cuando quien mira puede
  // aplicar daño. Una hoja de solo lectura no carga las tiradas de la campaña.
  const tiradas = useTiradasCitables(campaignId, puedeEditar);

  const aplicarDelta = (signo: 1 | -1) => {
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return;
    cambiarPg.mutate({
      delta: signo * Math.abs(n),
      // **El tipo solo viaja con daño.** Un delta positivo con `damageType` etiquetaría una
      // curación como «de fuego», y el servidor ya lo descarta al escribir el suceso
      // (`character-sheet.service.ts:1106`); mandarlo sería pedir algo que se ignora.
      ...(signo === -1 && tipoDeDano ? { damageType: tipoDeDano } : {}),
      ...(signo === -1 && critico ? { critical: true } : {}),
      ...(tiradaCitada ? { rollEventId: tiradaCitada } : {}),
      ...(motivo.trim() ? { reason: motivo.trim() } : {}),
    });
    setDelta("");
  };

  const corregir = () => {
    const n = Number(pgExactos);
    if (!Number.isInteger(n) || n < 0) return;
    fijarPg.mutate(
      {
        currentHp: n,
        // La versión que trajo esta misma respuesta. Si alguien escribió entre medias, el
        // servidor devuelve 409 y su mensaje se pinta tal cual — que es lo que un DM
        // corrigiendo a mano necesita saber: **quiere** pisar, pero quiere saber qué pisa.
        expectedVersion: hp.version,
        ...(motivo.trim() ? { reason: motivo.trim() } : {}),
      },
      { onSuccess: () => setCorrigiendo(false) },
    );
  };

  return (
    <div>
      {/* `data-hp` es el asidero de la prueba de navegador: la cifra no tiene un papel accesible
          propio —es texto dentro de un párrafo— y buscarla por su valor sería buscar un número que
          aparece en más sitios de la hoja. */}
      <p data-hp="cifras" className="font-data text-chrome-xl leading-none text-text">
        {hp.current ?? "—"} / {hp.max ?? "—"}
        {hp.temp > 0 && (
          <span className="ml-s2 font-chrome text-chrome-sm text-accent-text">
            +{hp.temp} temporales
          </span>
        )}
      </p>
      {maxHp && <PorQueLaMitad maxHp={maxHp} />}
      {hp.exceedsMax && (
        <p role="alert" className="mt-1 font-chrome text-chrome-xs text-warning-text">
          Los PG guardados superan el máximo: se muestran recortados a {hp.current}.
        </p>
      )}
      {puedeEditar && (
        <div className="mt-s3 space-y-s2">
          <div className="flex flex-wrap items-center gap-s2">
            <label className="sr-only" htmlFor="delta-pg">
              Cambio de puntos de golpe
            </label>
            <input
              id="delta-pg"
              type="number"
              min={1}
              className={fieldControlClass + " w-20"}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="5"
            />
            <label className="font-chrome text-chrome-xs text-muted" htmlFor="tipo-de-dano">
              Tipo de daño
            </label>
            <SelectorDeTipoDeDano id="tipo-de-dano" value={tipoDeDano} onChange={setTipoDeDano} />
            <label className="flex items-center gap-1 font-chrome text-chrome-xs text-muted">
              <input
                type="checkbox"
                checked={critico}
                onChange={(e) => setCritico(e.target.checked)}
              />
              Crítico
            </label>
            <Button
              type="button"
              variant="danger"
              onClick={() => aplicarDelta(-1)}
              disabled={!delta}
            >
              Recibo daño
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => aplicarDelta(1)}
              disabled={!delta}
            >
              Me curo
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-s2">
            <label className="font-chrome text-chrome-xs text-muted" htmlFor="tirada-citada">
              De qué tirada sale
            </label>
            <select
              id="tirada-citada"
              className={fieldControlClass + " w-56"}
              value={tiradaCitada}
              onChange={(e) => setTiradaCitada(e.target.value)}
            >
              <option value="">De ninguna: lo ajusto a mano</option>
              {(tiradas.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {etiquetaDeTirada(t)}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="motivo-pg">
              Motivo
            </label>
            <input
              id="motivo-pg"
              className={fieldControlClass + " w-48"}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              maxLength={280}
            />
          </div>

          {/* La corrección **exacta**, detrás de su propio gesto: no es lo mismo «recibo 5» que
              «déjalo en 12», y confundirlos es cómo se pierde una curación. Va cerrada por
              defecto porque el caso normal de la mesa es el delta. */}
          <div className="flex flex-wrap items-center gap-s2">
            <Button
              type="button"
              variant="ghost"
              aria-expanded={corrigiendo}
              onClick={() => {
                setCorrigiendo((v) => !v);
                setPgExactos(String(hp.current ?? hp.max ?? 0));
                fijarPg.reset();
              }}
            >
              Corregir a un número exacto
            </Button>
            {corrigiendo && (
              <>
                <label className="sr-only" htmlFor="pg-exactos">
                  Puntos de golpe exactos
                </label>
                <input
                  id="pg-exactos"
                  type="number"
                  min={0}
                  className={fieldControlClass + " w-20"}
                  value={pgExactos}
                  onChange={(e) => setPgExactos(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={corregir}
                  disabled={fijarPg.isPending}
                >
                  Dejarlo en ese número
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      <TrazaDeDano respuesta={cambiarPg.data} />
      {cambiarPg.isError && (
        <p role="alert" className={`mt-1 ${PROSA_DE_HOJA} text-danger-text`}>
          {(cambiarPg.error as Error).message}
        </p>
      )}
      {fijarPg.isError && (
        <p role="alert" className={`mt-1 ${PROSA_DE_HOJA} text-danger-text`}>
          {/* El 409 del servidor dice **qué valor hay ahora**: se pinta tal cual, como el resto
              de los rechazos de esta aplicación. Sustituirlo por «ha habido un conflicto»
              perdería justo el dato que hace falta para decidir. */}
          {(fijarPg.error as Error).message}
        </p>
      )}
    </div>
  );
}
