import { useState } from "react";
import type { ReactNode } from "react";
import type { DamageType } from "@dnd/shared";
import { Dialog } from "../../../ui/Dialog";
import { Button } from "../../../ui/Button";
import { fieldControlClass } from "../../../ui/Field";
import { useChangeHp } from "../../character-sheet/hooks";

// **El mando «Daño» del elenco** (maqueta: `prototipo/src/features/FichaDeElenco.tsx:120-143`).
//
// La maqueta enseña el BOTÓN y no dice qué se abre detrás —`onDano` no está cableado en ella—,
// así que lo que hay aquí es lo mínimo que el gesto necesita para no mentir: cuánto, a quién, y
// el mensaje del servidor si lo rechaza.
//
// **Manda un delta relativo, que es la puerta que ya existe.** `useChangeHp` es el mismo hook
// que movían los ±5, con sus invalidaciones (la hoja y **el registro de la mesa**: un golpe se
// escribe como `HP_CHANGED` y la columna del hilo lo está leyendo).
//
// **No hay concurrencia optimista aquí, y es a sabiendas.** La columna `version` existe y no la
// usa nadie; `useSetHp` —corrección absoluta con `expectedVersion` y 409— está escrito y **sigue
// sin engancharse**, porque quien corrige a mano lo hace desde la hoja, donde el conflicto se
// puede enseñar con sus dos números. Lo que hoy tapa el choque de dos DM golpeando a la vez es
// el sondeo de 15 s, y no se ha tocado.
//
// **`damageType` está preparado y todavía no viaja.** `changeHpSchema` lo admite desde 2.5.1 y
// **hoy no lo manda nadie**, así que las resistencias, vulnerabilidades e inmunidades no se
// ejecutan jamás (auditoría 2026-09-04, §8.2). El selector es del carril de los dados/daño: en
// cuanto exista se pinta en `ranuraTipoDeDano` y su valor entra por `tipoDeDano`, sin tocar nada
// más de este fichero.

export function PonerDano({
  campaignId,
  characterId,
  nombre,
  abierto,
  onCerrar,
  tipoDeDano,
  ranuraTipoDeDano,
}: {
  campaignId: string;
  characterId: string;
  nombre: string;
  abierto: boolean;
  onCerrar: () => void;
  /** El tipo de daño elegido, cuando el carril que lo selecciona exista. Hoy nadie lo pasa. */
  tipoDeDano?: DamageType;
  /** Donde ese carril montará su selector. Hoy nadie lo pasa y no se pinta nada. */
  ranuraTipoDeDano?: ReactNode;
}) {
  const cambiarPg = useChangeHp(campaignId, characterId);
  const [cantidad, setCantidad] = useState("5");
  // Un crítico suma **dos** fracasos de salvación de muerte a quien ya está a 0, no uno: es una
  // regla que el servidor aplica y que sin esta casilla no se podía declarar desde la mesa.
  const [critico, setCritico] = useState(false);

  const n = Number(cantidad);
  const valida = Number.isInteger(n) && n >= 1 && n <= 9999;

  function cerrar() {
    cambiarPg.reset();
    onCerrar();
  }

  return (
    <Dialog
      open={abierto}
      onClose={cerrar}
      title={`Daño · ${nombre}`}
      size="sm"
      subtitulo="Se resta de sus puntos de golpe y queda escrito en el registro de la mesa."
      acciones={
        <>
          <Button type="button" variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!valida || cambiarPg.isPending}
            onClick={() =>
              cambiarPg.mutate(
                {
                  delta: -n,
                  ...(critico ? { critical: true } : {}),
                  ...(tipoDeDano ? { damageType: tipoDeDano } : {}),
                },
                { onSuccess: cerrar },
              )
            }
          >
            Aplicar daño
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-s2">
        <label className="font-chrome text-chrome-sm text-text" htmlFor="cantidad-de-dano">
          Cuánto daño
        </label>
        <input
          id="cantidad-de-dano"
          type="number"
          min={1}
          max={9999}
          className={fieldControlClass + " w-24"}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </div>

      {ranuraTipoDeDano}

      <label className="mt-s3 flex items-start gap-s2">
        <input
          type="checkbox"
          className="mt-1"
          checked={critico}
          onChange={(e) => setCritico(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block font-chrome text-chrome-sm text-text">Fue un crítico</span>
          <span className="block font-chrome text-chrome-xs text-muted">
            A quien ya está a 0 puntos de golpe, un crítico le suma dos fracasos de salvación de
            muerte en vez de uno.
          </span>
        </span>
      </label>

      {/* El mensaje del servidor, tal cual: dice cosas operativas que un aviso genérico tira. */}
      {cambiarPg.isError && (
        <p role="alert" className="mt-s3 font-chrome text-chrome-sm text-danger-text">
          {(cambiarPg.error as Error).message}
        </p>
      )}
    </Dialog>
  );
}
