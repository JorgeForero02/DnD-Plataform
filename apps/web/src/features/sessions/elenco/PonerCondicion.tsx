import { useState } from "react";
import type { ReactNode } from "react";
import { Dialog } from "../../../ui/Dialog";
import { Button } from "../../../ui/Button";
import { fieldControlClass } from "../../../ui/Field";
import { useApplyCondition } from "../../character-sheet/hooks";
import { efectoCondicion } from "../../character-sheet/Condiciones";
import {
  NOMBRE_CONDICION,
  PREFIJO_CONCENTRACION,
  claveDeConcentracion,
  nombreCondicion,
} from "../../character-sheet/vocabulario";
import {
  DURACIONES_DE_CONDICION,
  DURACION_INDEFINIDA,
  segundosDeDuracion,
} from "../../character-sheet/duraciones";

// **Poner una condición desde el retrato, sin abrir la hoja de nadie** (maqueta:
// `prototipo/src/features/PonerCondicion.tsx`; auditoría 2026-09-04, §1).
//
// Hasta hoy la única puerta era `character-sheet/Condiciones.tsx`, **dentro de la hoja entera**,
// y un DM ni siquiera podía abrir la hoja de otro desde la mesa. El gesto que la mesa repite
// —«al goblin le entra el veneno»— costaba salir de la partida.
//
// **Es la misma puerta de API, no una segunda.** `useApplyCondition` es el hook que ya usa la
// hoja, con sus invalidaciones (condiciones **y** hoja: el agotamiento nivel 4 parte los PG por
// la mitad). Aquí se sustituye la presentación, no la columna de datos.
//
// **El reloj es del servidor.** Esta pantalla manda `durationSeconds` —segundos **de juego**— y
// el servidor calcula el vencimiento sumándolos a SU reloj. No hay ningún temporizador local, ni
// puede haberlo: la mesa está en varios navegadores y el único reloj que comparten es el suyo.

const CLAVES_SRD = Object.keys(NOMBRE_CONDICION);

/** Un asalto son seis segundos del reloj de campaña. La escala de la maqueta, en su unidad. */
const SEGUNDOS_POR_ASALTO = 6;

/** El chip de la maqueta (`prototipo/src/ui/FilterChip.tsx`). Local hasta que `ui/` tenga el suyo:
 *  la primitiva `FilterChip` que falta es del carril de la capa visual, no de este. */
function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={[
        "inline-flex items-center gap-s1 rounded-radius-sm border px-s3 py-s1 font-chrome text-chrome-sm transition-colors",
        activo
          ? "border-copper bg-copper/15 text-copper-text"
          : "border-muted text-muted hover:border-copper hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function PonerCondicion({
  campaignId,
  characterId,
  nombre,
  abierto,
  enCombate,
  onCerrar,
}: {
  campaignId: string;
  characterId: string;
  /** El del personaje: va en el título, que es lo que dice sobre quién se está actuando. */
  nombre: string;
  abierto: boolean;
  /** Con encuentro activo se ofrece la escala de asaltos; sin él, solo el reloj. */
  enCombate: boolean;
  onCerrar: () => void;
}) {
  const aplicar = useApplyCondition(campaignId, characterId);
  const [elegida, setElegida] = useState<string | null>(null);
  const [nivel, setNivel] = useState("1");
  const [conjuro, setConjuro] = useState("");
  const [escalaElegida, setEscala] = useState<"asaltos" | "reloj">("asaltos");
  const [asaltos, setAsaltos] = useState("2");
  const [duracion, setDuracion] = useState(DURACION_INDEFINIDA.key);

  // **La escala se DERIVA, no se guarda.** Con `useState(enCombate ? …)` el valor se fijaba una
  // sola vez y nada lo reajustaba al terminar el encuentro: un DM que hubiera elegido «Asaltos»
  // en combate y volviera a abrir el cajón después se encontraba un formulario **sin ninguna
  // opción marcada**, con el desplegable del reloj deshabilitado, y el botón aplicaba en
  // silencio `asaltos × 6` segundos que ya no se podían ni ver. Sin combate no hay asaltos que
  // contar, así que la única escala posible es el reloj y eso se calcula en cada render.
  const escala = enCombate ? escalaElegida : "reloj";

  const esConcentracion = elegida === PREFIJO_CONCENTRACION;
  const esAgotamiento = elegida === "exhaustion";
  const efecto = elegida ? efectoCondicion(elegida) : undefined;
  const asaltosValidos = Number.isInteger(Number(asaltos)) && Number(asaltos) >= 1;
  // El agotamiento va por niveles del 1 al 6 (`applyConditionSchema`). Sin esto, vaciar el campo
  // dejaba `Number("") === 0` y el botón mandaba un `level: 0` que el servidor rechaza: el error
  // salía después de pulsar, cuando se sabía antes.
  const nivelValido =
    !esAgotamiento || (Number.isInteger(Number(nivel)) && Number(nivel) >= 1 && Number(nivel) <= 6);
  const puedeAplicar =
    elegida !== null &&
    !aplicar.isPending &&
    (!esConcentracion || conjuro.trim().length > 0) &&
    nivelValido &&
    (escala !== "asaltos" || asaltosValidos);

  // La duración, ya en segundos de juego. `undefined` —no `null`— para una condición indefinida:
  // el esquema del servidor espera que el campo **no viaje** (`applyConditionSchema`).
  const segundos =
    escala === "asaltos"
      ? Number(asaltos) * SEGUNDOS_POR_ASALTO
      : (segundosDeDuracion(duracion) ?? undefined);

  function cerrar() {
    aplicar.reset();
    onCerrar();
  }

  return (
    <Dialog
      open={abierto}
      onClose={cerrar}
      title={`Poner condición · ${nombre}`}
      size="lg"
      // Literal de la maqueta, y es verdad de punta a punta: el servidor vence la condición solo
      // (`conditions/vencimiento.ts`) y la deja marcada en la lista, no la borra (decisión D-2C-2).
      subtitulo="El sistema la aplicará sola hasta que venza; al vencer se marcará, no desaparecerá."
      acciones={
        <>
          <Button type="button" variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!puedeAplicar}
            onClick={() =>
              aplicar.mutate(
                {
                  key: esConcentracion ? claveDeConcentracion(conjuro) : elegida!,
                  note: esConcentracion ? conjuro : undefined,
                  level: esAgotamiento ? Number(nivel) : undefined,
                  durationSeconds: segundos ?? undefined,
                },
                { onSuccess: cerrar },
              )
            }
          >
            Aplicar la condición
          </Button>
        </>
      }
    >
      <fieldset className="border-0 p-0">
        <legend className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          Las quince del manual
        </legend>
        <div className="flex flex-wrap gap-s1">
          {CLAVES_SRD.map((k) => (
            <Chip
              key={k}
              activo={elegida === k}
              onClick={() => {
                setElegida(k);
                setConjuro("");
              }}
            >
              {nombreCondicion(k)}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* **La concentración va aparte, y no es un capricho de maquetación**: no es una de las
          quince del SRD, es una marca de la mesa. Mezclarla arriba diría que el manual la trae.
          La maqueta pone aquí un campo libre («una de la mesa»); aquí ese campo es el conjuro,
          porque una clave inventada saldría en pantalla como «Sin traducir: …» y eso es
          justamente lo que prohíbe la regla de enumeraciones. */}
      <div className="mt-s4">
        <p className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          De la mesa, no del manual
        </p>
        <div className="flex flex-wrap items-center gap-s2">
          <Chip
            activo={esConcentracion}
            onClick={() => {
              setElegida(PREFIJO_CONCENTRACION);
            }}
          >
            Concentración
          </Chip>
          {esConcentracion && (
            <input
              type="text"
              maxLength={60}
              className={fieldControlClass + " w-52"}
              value={conjuro}
              onChange={(e) => setConjuro(e.target.value)}
              aria-label="Conjuro en el que se concentra"
              placeholder="Bendición"
            />
          )}
        </div>
      </div>

      {esAgotamiento && (
        <div className="mt-s4 flex items-center gap-s2">
          <label className="font-chrome text-chrome-xs text-muted" htmlFor="nivel-agotamiento">
            Nivel de agotamiento
          </label>
          <input
            id="nivel-agotamiento"
            type="number"
            min={1}
            max={6}
            className={fieldControlClass + " w-16"}
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
          />
        </div>
      )}

      {/* Qué hace, antes de aplicarla: la pregunta de la mesa es «¿qué hace envenenado?». El
          texto sale del mismo mapa que la hoja, escrito una sola vez. */}
      {efecto && <p className="mt-s3 font-chrome text-chrome-sm text-muted">{efecto}</p>}

      {/* **Cuánto dura: radios con su explicación, no un desplegable.** Son dos escalas
          distintas de contar el tiempo, y la diferencia entre ellas cambia la decisión
          (`docs/04-convenciones.md`, reseño del 2026-09-02). */}
      <fieldset className="mt-s4 border-0 p-0">
        <legend className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          Cuánto dura
        </legend>
        {enCombate && (
          <label className="flex items-start gap-s2 py-s1">
            <input
              type="radio"
              name="escala-de-duracion"
              className="mt-1"
              checked={escala === "asaltos"}
              onChange={() => setEscala("asaltos")}
            />
            <span className="min-w-0">
              <span className="flex items-center gap-s2 font-chrome text-chrome-sm text-text">
                Asaltos
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={fieldControlClass + " w-16"}
                  value={asaltos}
                  disabled={escala !== "asaltos"}
                  onChange={(e) => setAsaltos(e.target.value)}
                  aria-label="Cuántos asaltos dura"
                />
              </span>
              <span className="block font-chrome text-chrome-xs text-muted">
                Un asalto son 6 segundos del reloj de campaña; el vencimiento lo calcula el servidor
                contra su propio reloj.
              </span>
            </span>
          </label>
        )}
        <label className="flex items-start gap-s2 py-s1">
          <input
            type="radio"
            name="escala-de-duracion"
            className="mt-1"
            checked={escala === "reloj"}
            onChange={() => setEscala("reloj")}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-s2 font-chrome text-chrome-sm text-text">
              Reloj de campaña
              <select
                className={fieldControlClass + " max-w-[14rem]"}
                value={duracion}
                disabled={escala !== "reloj"}
                onChange={(e) => setDuracion(e.target.value)}
                aria-label="Duración en el reloj de campaña"
              >
                {DURACIONES_DE_CONDICION.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.etiqueta}
                  </option>
                ))}
              </select>
            </span>
            <span className="block font-chrome text-chrome-xs text-muted">
              Una condición indefinida no vence sola: la quita quien la puso.
            </span>
          </span>
        </label>
      </fieldset>

      {/* El mensaje del servidor, tal cual. Un 409 o un 403 dicen algo operativo que un aviso
          genérico tiraría a la basura (auditoría 2026-09-04, §7, trampa 5). */}
      {aplicar.isError && (
        <p role="alert" className="mt-s3 font-chrome text-chrome-sm text-danger-text">
          {(aplicar.error as Error).message}
        </p>
      )}
    </Dialog>
  );
}
