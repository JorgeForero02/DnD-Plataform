import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { DamageType } from "@dnd/shared";
import { Dialog } from "../../../ui/Dialog";
import { Button } from "../../../ui/Button";
import { fieldControlClass } from "../../../ui/Field";
import { useChangeHp } from "../../character-sheet/hooks";
import { AvisoDeConcentracion, TrazaDeDano } from "../../character-sheet/AplicarDano";

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
// **`damageType` ya viaja** (ensamblado, 2026-09-04). El selector lo monta quien abre este
// cajón, en `ranuraTipoDeDano`, y su valor entra por `tipoDeDano`: es
// `character-sheet/AplicarDano.tsx` — `SelectorDeTipoDeDano` — el mismo control que usa la hoja,
// no una segunda copia. Y esto es lo que cierra la ficha **C6-5**: este cajón es **la ruta que
// un DM usa de verdad en combate** —no abrir la hoja entera—, y mientras mandó `{ delta }` a
// secas un dragón resistente al fuego se cobraba el golpe entero, así que las resistencias,
// vulnerabilidades e inmunidades de 2.5.1 estaban construidas y probadas y **no ocurrían
// jugando** (auditoría 2026-09-04, §8.2).
//
// Los ±5 de la ficha siguen sin tipo, y es correcto: son del jugador sobre **su** personaje, y
// ahí no se está declarando de qué es el golpe, se está anotando un ajuste.
//
// **Y la respuesta se enseña.** `changeHp` devuelve `damageTrace` cuando de verdad redujo o
// agravó algo, y hasta hoy no la leía ningún componente de la mesa. Se pinta con `TrazaDeDano`,
// la misma de la hoja: dos dibujos de la misma traza acabarían divergiendo.
//
// ## El estado no se pega, y esto costó una muerte equivocada en la hoja
//
// El panel de daño de la hoja arrastraba `rollEventId` y «Crítico» de una aplicación a la
// siguiente —también a una **curación**—, y eso escribía dos fracasos de salvación de muerte en
// vez de uno. Aquí no hay cita de tirada, pero sí hay dos campos que sobrevivían al cierre:
// **`cerrar()` los devuelve a su sitio**, y el tipo de daño lo limpia quien lo tiene, en su
// `onCerrar`. Si este cajón gana algún día un `rollEventId`, va con guarda de signo.

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
  /** El tipo de daño elegido. Lo tiene quien monta el selector, para poder limpiarlo al cerrar. */
  tipoDeDano?: DamageType;
  /** Donde va el `SelectorDeTipoDeDano`. Sin él no se pinta nada y el tipo no viaja. */
  ranuraTipoDeDano?: ReactNode;
}) {
  const cambiarPg = useChangeHp(campaignId, characterId);
  // **El `id` sale de `useId`, no de una constante.** Este cajón se monta **una vez por
  // personaje**, así que un `id` literal daba tantos «cantidad-de-dano» como fichas hubiera en el
  // elenco: hoy el velo impide abrir dos a la vez, pero los `id` duplicados ya están en el
  // documento y `getByLabel` se vuelve ambiguo en cuanto alguien mire.
  const idCantidad = useId();
  const [cantidad, setCantidad] = useState("5");
  // Un crítico suma **dos** fracasos de salvación de muerte a quien ya está a 0, no uno: es una
  // regla que el servidor aplica y que sin esta casilla no se podía declarar desde la mesa.
  const [critico, setCritico] = useState(false);

  const n = Number(cantidad);
  const valida = Number.isInteger(n) && n >= 1 && n <= 9999;

  /** La traza que devolvió el servidor, si redujo o agravó algo. Es lo que hay que enseñar. */
  const traza = cambiarPg.data?.damageTrace;

  function cerrar() {
    cambiarPg.reset();
    // Los dos campos vuelven a su valor de partida: un cajón que se reabre con «Crítico» todavía
    // marcado declara un crítico que nadie ha declarado.
    setCantidad("5");
    setCritico(false);
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
        // **Cuando hay traza, el cajón se queda abierto.** Aplicar y cerrar de golpe es lo que se
        // quiere treinta veces por sesión, y por eso sigue siendo lo normal; pero cuando el
        // servidor dice que el número aplicado **no es el que se tecleó** —resistencia,
        // vulnerabilidad, inmunidad—, cerrarlo tiraría justo la explicación que hace falta leer.
        traza ? (
          <Button type="button" variant="primary" onClick={cerrar}>
            Cerrar
          </Button>
        ) : (
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
                  {
                    onSuccess: (respuesta) => {
                      // Sin nada que explicar se cierra, que es el gesto rápido. **Y la
                      // salvación de concentración cuenta como algo que explicar**: si el
                      // cajón se cerrara, el aviso de que el golpe acaba de pedir una tirada
                      // se pintaría y desaparecería en el mismo fotograma.
                      if (!respuesta.damageTrace && !respuesta.concentrationSave) cerrar();
                    },
                  },
                )
              }
            >
              Aplicar daño
            </Button>
          </>
        )
      }
    >
      <div className="flex items-center gap-s2">
        <label className="font-chrome text-chrome-sm text-text" htmlFor={idCantidad}>
          Cuánto daño
        </label>
        <input
          id={idCantidad}
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

      {/* **De dónde sale el daño.** Los pasos son los del servidor, no un cálculo de esta
          pantalla: aquí no se multiplica ni se divide nada. */}
      <TrazaDeDano respuesta={cambiarPg.data} />
      <AvisoDeConcentracion respuesta={cambiarPg.data} />

      {/* El mensaje del servidor, tal cual: dice cosas operativas que un aviso genérico tira. */}
      {cambiarPg.isError && (
        <p role="alert" className="mt-s3 font-chrome text-chrome-sm text-danger-text">
          {(cambiarPg.error as Error).message}
        </p>
      )}
    </Dialog>
  );
}
