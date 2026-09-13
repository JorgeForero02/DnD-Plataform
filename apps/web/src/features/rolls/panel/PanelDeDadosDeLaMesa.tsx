import { useEffect, useId, useRef, useState } from "react";
import type { RollAudience, RollMode, RollResult } from "@dnd/shared";
import { ApiError } from "../../../lib/api";
import { Button, Field, fieldControlClass } from "../../../ui";
import { IconoCerrar } from "../../../ui/Iconos";
import { DadoDibujado } from "../DadoDibujado";
import { ResultadoDeTirada } from "../ResultadoDeTirada";
import { TiradaACiegas } from "../TiradaACiegas";
import { SelectorDeAudiencia } from "../SelectorDeAudiencia";
import { BandejaDeDados } from "../BandejaDeDados";
import { BANDEJA_VACIA, conDado, type Bandeja } from "../bandeja";
import { GastarInspiracion } from "./GastarInspiracion";
import { useCreateRoll } from "../hooks";
import { useGuiaDeCd } from "../../roll-requests/hooks";
import { nombreDeCd } from "../../roll-requests/vocabulario";
import { DadoTridimensional } from "./DadoTridimensional";

// **El panel de dados, anclado abajo. No se abre: aparece porque hay que tirar.**
//
// La auditoría del 2026-09-04 lo puso con gravedad ALTA: *«no hay dados en la mesa —
// `MesaDeSesion.tsx` no importa nada de `features/rolls`. Tirar exige irse a otra pestaña»*. En
// una partida eso quiere decir perder de vista el registro, el elenco y la iniciativa para hacer
// lo que más veces se hace en toda la sesión.
//
// La forma es la de `prototipo/src/features/PanelDeDados.tsx`: `fixed inset-x-0 bottom-0 z-30`,
// centrado, con `anim-surge`. **`z-30` y no más**, y esto no es un número decorativo: los cajones
// del estrato superpuesto van a `z-40` (`ui/Dialog.tsx`), así que el panel de dados **convive**
// con ellos en vez de taparlos — se puede tener la hoja abierta y tirar.
//
// ## Los tres instantes, y por qué el momento no acaba cuando el dado se para
//
//  · **Antes** — qué vas a tirar, con ventaja o desventaja y a quién va dirigida. Se puede
//    intervenir.
//  · **Durante** — el cubo rueda y la traza se compone alrededor.
//  · **Después** — el resultado con su desglose y su «De dónde sale», y la decisión de aceptarlo.
//
// ## La regla que no es estética
//
// **El servidor decide el número; el dado solo LO REPRESENTA.** Por eso el orden es: se pide la
// tirada, llega el resultado, y *entonces* empieza la animación — el cubo rueda hacia un número
// que ya existe. Si la animación fuera primero y el número después, el navegador estaría eligiendo
// cuándo se sabe el resultado; si el cubo escogiera cara, estaría eligiendo el resultado.
//
// **Y aquí no se compone la expresión de una tirada de la hoja.** La ventaja se manda por nombre
// (`mode`), nunca como `2d20kh1`: convertir el d20 es una regla del juego y vive en el servidor
// (`apps/api/src/rolls/rolls.service.ts`). Un cliente que montara la expresión podría decir que
// ataca con una daga y tirar 1d12.
//
// ## Dos diferencias con la maqueta, declaradas
//
//  1. **La maqueta enseña una casilla «A ciegas» solo para el DM; aquí va el
//     `SelectorDeAudiencia` que ya existe.** La audiencia tiene **tres** valores en el contrato
//     (`rollAudienceSchema`: la mesa entera, quien tira y el DM, o solo el DM), y una casilla los
//     aplasta a dos: elegir «privada» dejaría de ser posible. Además `docs/04-convenciones.md`
//     exige que una opción con significado se vea entera, con su frase — que es justo lo que ese
//     control hace, y equivocarse en él enseña a la mesa algo que no debía ver.
//  2. **De los tres botones de intervención de la maqueta, solo uno es cierto**, y desde el plan
//     08 ese uno está: «Usar inspiración» (`GastarInspiracion`), que el SRD respalda y el servidor
//     hace. Los otros dos siguen sin pintarse, y ahora por su regla y no por falta de servidor:
//     «Ventaja por flanqueo +3» es **opcional del DMG** y además da ventaja, no un número, y
//     necesitaría saber quién está adyacente a quién; «Ayuda de Mira +1d4» es la acción **Ayudar**,
//     que también da **ventaja** —el +1d4 es `Bless`, que es otra cosa—.

/** Los tres instantes. */
type Momento = "antes" | "durante" | "despues";

/** Lo que dura `@keyframes tumbar` en `ui/tokens.css`. Se cita, no se reinventa. */
const DURACION_DEL_TUMBO = 1100;

function mensajeDeError(error: unknown): string {
  // `apiFetch` ya convierte el `{ code, message }` del servidor en una frase legible en español.
  // Se enseña tal cual: un rechazo suyo dice más que un aviso genérico.
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo tirar.";
}

/**
 * Task 10 — lo que dice el `summary` del `<details>` «Audiencia y CD» cuando está plegado:
 * «Para la mesa entera · sin CD». Plegar no esconde la decisión — se lee sin abrir.
 *
 * **No reutiliza la `etiqueta` de `AUDIENCIAS_DE_TIRADA`** («Pública», «Privada del DM», «A
 * ciegas»): esas son el nombre del radio: cortas, y pensadas para ir junto a su frase. Aquí hace
 * falta la frase entera para que el resumen tenga sentido solo, sin nada al lado.
 */
function resumenAudienciaYCd(audiencia: RollAudience, cd: string): string {
  const audienciaTexto =
    audiencia === "PUBLIC"
      ? "Para la mesa entera"
      : audiencia === "DM_PRIVATE"
        ? "Privada del DM"
        : "A ciegas";
  const cdTexto = cd.trim() === "" ? "sin CD" : `CD ${cd.trim()}`;
  return `${audienciaTexto} · ${cdTexto}`;
}

/** Quien pide menos movimiento no recibe ninguno: tampoco la espera de 1,1 s. */
function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function PanelDeDadosDeLaMesa({
  campaignId,
  sessionId,
  characterId,
  expresionInicial = "1d20",
  motivoInicial = "",
  onCerrar,
}: {
  campaignId: string;
  /** La sesión en curso, si la hay. Sin ella el servidor usa la que esté abierta. */
  sessionId?: string;
  /** De quién es la tirada. Sin él, es de la campaña. */
  characterId?: string;
  expresionInicial?: string;
  motivoInicial?: string;
  onCerrar: () => void;
}) {
  const idGuia = useId();
  // Task 10 — la bandeja empieza con un d20 cuando nadie pidió otra cosa (el «1d20» de siempre);
  // si quien abre el panel trae SU PROPIA expresión (un ataque, «1d8+5»), no hay bandeja que la
  // represente sin inventarse una composición que nadie pidió, así que empieza vacía y el texto
  // se lleva tal cual al modo avanzado (`textoInicial`, más abajo) — nada se pierde.
  const [bandeja, setBandeja] = useState<Bandeja>(() =>
    expresionInicial === "1d20" ? conDado(BANDEJA_VACIA, 20) : BANDEJA_VACIA,
  );
  const [expresion, setExpresion] = useState(expresionInicial);
  const [motivo, setMotivo] = useState(motivoInicial);
  const [cd, setCd] = useState("");
  const [modo, setModo] = useState<RollMode>("NORMAL");
  const [gastarInspiracion, setGastarInspiracion] = useState(false);
  const [audiencia, setAudiencia] = useState<RollAudience>("PUBLIC");
  const [sinAnimacion, setSinAnimacion] = useState(false);
  const [momento, setMomento] = useState<Momento>("antes");
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tirar = useCreateRoll(campaignId);
  const guia = useGuiaDeCd();
  const temporizador = useRef<number | null>(null);

  // El temporizador del tumbo se cancela al desmontar. Sin esto, cerrar el panel a mitad de la
  // animación deja un `setState` programado sobre un componente que ya no existe.
  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  /** Qué se estaba tirando, para el desglose. Sin motivo, «modificador», que es cierto siempre. */
  const etiqueta = motivo.trim() || "modificador";

  function alTirar() {
    const expr = expresion.trim();
    // **La CD viaja, y sin ella no hay veredicto.** El servidor deja `outcome` en `NO_DC` cuando
    // no se le dice contra qué se tira (`roll.schema.ts`), así que omitirla no es «una tirada sin
    // dificultad»: es una tirada de la que nadie puede decir si salió bien. Se manda solo cuando
    // es un número de verdad — `Number("")` es `0`, y un `dc: 0` lo rechazaría el esquema.
    const cdNumero = cd.trim() === "" ? undefined : Number(cd);
    setError(null);
    tirar.mutate(
      {
        expression: expr,
        ...(motivo.trim() ? { label: motivo.trim() } : {}),
        ...(cdNumero !== undefined && Number.isFinite(cdNumero) ? { dc: cdNumero } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(characterId ? { characterId } : {}),
        audience: audiencia,
        mode: modo,
        // **El servidor gasta y tira en la misma transacción**: aquí solo se pide.
        spendInspiration: gastarInspiracion && modo !== "DISADVANTAGE",
      },
      {
        // **Primero el número, después el dado.** El cubo empieza a rodar cuando el resultado ya
        // está aquí: rueda hacia algo decidido.
        onSuccess: (r) => {
          setResultado(r);
          setMomento("durante");
          const corto = sinAnimacion || prefiereMenosMovimiento();
          setRodando(!corto);
          temporizador.current = window.setTimeout(
            () => {
              setRodando(false);
              setMomento("despues");
            },
            corto ? 0 : DURACION_DEL_TUMBO,
          );
        },
        onError: (e) => {
          // El resultado anterior se retira: dejarlo puesto junto a un error es la forma más
          // barata de que alguien cante un total que no salió de esta tirada.
          setResultado(null);
          setMomento("antes");
          setError(mensajeDeError(e));
        },
      },
    );
  }

  const revelado = resultado?.revealed === true ? resultado : null;
  const tono = !revelado
    ? "copper"
    : revelado.outcome === "SUCCESS"
      ? "accent"
      : revelado.outcome === "FAILURE"
        ? "danger"
        : "copper";

  return (
    <div
      // `z-30`: por debajo de los cajones (`z-40`), para convivir con ellos y no taparlos.
      //
      // **`pointer-events-none` en el envoltorio, y `auto` en el panel** (ensamblado O1,
      // 2026-09-04). Este `div` es `inset-x-0`, o sea **del ancho entero de la ventana**, y tan
      // alto como el panel —574 px en el instante «antes»—, mientras que lo único que se pinta es
      // la sección centrada de 46 rem. Sin esta pareja de clases, esa franja invisible se comía
      // los clics de todo lo que hay debajo: **medido en Chromium, el botón «Hoja» del rail se
      // volvía inalcanzable**, con Playwright informando de que
      // `<div class="… fixed inset-x-0 bottom-0 z-30 …"> intercepts pointer events`.
      //
      // No cambia ni un píxel de lo pintado, y es lo que hace verdad la frase de arriba: convivir
      // con los cajones no sirve de nada si el panel deja muerta la mitad inferior de la mesa.
      // La maqueta no lo lleva porque debajo de su panel no hay nada con lo que interactuar.
      className="anim-surge pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-s4 pb-s4"
    >
      <section
        aria-label="Tirada"
        className="pointer-events-auto w-full max-w-[46rem] rounded-radius-md border border-copper bg-surface px-s5 py-s4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-s3">
          <div className="min-w-0">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
              La mesa tira
            </p>
            <h2 className="font-title text-chrome-lg text-text">
              {motivo.trim() || "Una tirada"}{" "}
              <span className="font-data text-chrome-sm text-muted">{expresion.trim()}</span>
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-s3">
            <label className="flex items-center gap-s1 font-chrome text-chrome-xs text-muted">
              <input
                type="checkbox"
                checked={sinAnimacion}
                onChange={(e) => setSinAnimacion(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Sin animación
            </label>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Descartar la tirada"
              className="rounded-radius-sm p-s1 text-muted transition-colors hover:text-text"
            >
              <IconoCerrar className="h-5 w-5" />
            </button>
          </div>
        </div>

        {momento === "antes" && (
          <div className="mt-s3 flex flex-col gap-s3">
            {/* Task 10 (anexo #16) — la misma bandeja de la pantalla «Dados», en `compacta`: los
                siete dados en una fila, sin el rótulo «Atajos» que aquí sobra por estrecho. */}
            <BandejaDeDados
              valor={bandeja}
              onChange={({ bandeja: siguiente, expresion: siguienteExpresion }) => {
                setBandeja(siguiente);
                setExpresion(siguienteExpresion);
              }}
              compacta
              modo={modo}
              onModoChange={setModo}
              error={error ?? undefined}
              disabled={tirar.isPending}
              textoInicial={expresionInicial !== "1d20" ? expresionInicial : undefined}
            />

            <GastarInspiracion
              campaignId={campaignId}
              characterId={characterId}
              modo={modo}
              value={gastarInspiracion}
              onChange={setGastarInspiracion}
              disabled={tirar.isPending}
            />

            <Field label="Motivo (opcional)" hint="«Percepción», «Daño de la daga».">
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={120}
                className={fieldControlClass}
              />
            </Field>

            {/* Task 10 — audiencia y CD, plegadas: el cajón es angosto (`max-w-[46rem]`, sin la
                rejilla de dos columnas de la pantalla «Dados»), y las dos eran la mitad de este
                formulario. El `summary` dice lo elegido, así que plegado no esconde nada: se lee
                antes de abrir. Los radios de audiencia y la guía del SRD siguen siendo radios y
                botones dentro, tal cual. */}
            <details>
              <summary className="cursor-pointer font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                Audiencia y CD · {resumenAudienciaYCd(audiencia, cd)}
              </summary>
              <div className="mt-s2 flex flex-col gap-s3">
                <SelectorDeAudiencia
                  value={audiencia}
                  onChange={setAudiencia}
                  disabled={tirar.isPending}
                />

                <Field
                  label="CD (opcional)"
                  hint="Sin ella el servidor no dicta éxito ni fallo: solo da el total."
                >
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={cd}
                    onChange={(e) => setCd(e.target.value)}
                    aria-describedby={idGuia}
                    className={`${fieldControlClass} font-data`}
                  />
                </Field>

                {/* **La guía del SRD es una ayuda, no una jaula**, y es la misma que ya usa
                    `PedirTirada`: la tabla «Typical Difficulty Classes» del SRD 5.1 da seis
                    escalones, pero el propio manual dice que *the DM sets the DC*. Por eso las
                    seis filas **rellenan** el campo en vez de sustituirlo — se puede escribir
                    encima cualquier número, incluido uno que no esté en la tabla. */}
                <div id={idGuia}>
                  <p className="mb-1 font-chrome text-chrome-xs text-muted">
                    Guía del SRD; puedes escribir cualquier número.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(guia.data ?? []).map((fila) => (
                      <Button
                        key={fila.key}
                        type="button"
                        variant="secondary"
                        onClick={() => setCd(String(fila.dc))}
                        aria-label={`${nombreDeCd(fila.key)}: CD ${fila.dc}`}
                      >
                        <span>{nombreDeCd(fila.key)}</span>
                        <span className="font-data text-muted">{fila.dc}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            <p className="font-chrome text-chrome-xs leading-snug text-muted">
              El número lo decide el servidor. El dado solo lo representa.
            </p>

            <div className="flex items-center gap-s2">
              <Button
                type="button"
                variant="primary"
                onClick={alTirar}
                disabled={tirar.isPending || expresion.trim() === ""}
                title={expresion.trim() === "" ? "Añade al menos un dado para tirar." : undefined}
              >
                <DadoDibujado />
                {tirar.isPending ? "Tirando…" : "Tirar"}
              </Button>
            </div>
          </div>
        )}

        {momento !== "antes" && resultado && (
          <div className="mt-s3 flex items-start gap-s5">
            {/* **El cubo enseña el TOTAL, no la cara del dado. Es una decisión, no un descuido.**
                Con `2d6+3` un cubo de seis caras acaba enseñando «14», que ninguna cara física
                podría dar. Se elige así porque **el total es lo que se canta en la mesa** y es el
                número que el DM compara con la CD; los dados que cayeron no se pierden — están
                dos dedos a la derecha, en el desglose de `ResultadoDeTirada`, con el descartado
                tachado y a la vista. La alternativa —enseñar `kept[0]`— pondría en grande un
                número que no decide nada y obligaría a buscar el total en letra pequeña.
                La maqueta hace lo mismo (`PanelDeDados.tsx`: `valor={total}`). */}
            <DadoTridimensional
              valor={revelado ? revelado.total : 0}
              rodando={rodando}
              sinAnimacion={sinAnimacion}
              oculto={!revelado}
              tono={rodando ? "copper" : tono}
            />
            {/* La traza se compone alrededor del dado mientras cae. */}
            <div className="min-w-0 flex-1">
              {revelado ? (
                <>
                  <p className="font-data text-chrome-2xl text-text">{revelado.total}</p>
                  {/* «De dónde sale»: el rótulo de la maqueta sobre el desglose que ya existía.
                      El total grande es lo que se canta en la mesa; esto es de dónde salió, y
                      nunca se enseña un número solo. */}
                  <p className="mt-s1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
                    De dónde sale
                  </p>
                  <ResultadoDeTirada resultado={revelado} etiqueta={etiqueta} />
                </>
              ) : (
                <TiradaACiegas etiqueta={etiqueta} expresion={resultado.expression} />
              )}
            </div>
          </div>
        )}

        {momento === "despues" && (
          <div className="mt-s3 flex flex-wrap items-center justify-between gap-s3 border-t border-muted pt-s3">
            <p className="min-w-0 flex-1 font-chrome text-chrome-xs leading-snug text-muted">
              {revelado
                ? "El sistema propone; el DM confirma el desenlace."
                : "Espera a que el DM narre lo que pasa."}
            </p>
            <div className="flex gap-s2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMomento("antes");
                  setResultado(null);
                  setError(null);
                }}
              >
                Tirar otra
              </Button>
              <Button type="button" variant="primary" onClick={onCerrar}>
                Aceptar el resultado
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
