import { CLAVE_AYUDA } from "@dnd/shared";
import { useState } from "react";
import { IconoQuitar } from "../../ui/Iconos";
import { useApplyCondition, useConditions, useGameClock, useRemoveCondition } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import {
  HASTA_EL_DESCANSO,
  NOMBRE_CONDICION,
  PREFIJO_CONCENTRACION,
  claveDeConcentracion,
  esConcentracion,
  nombreCondicion,
} from "./vocabulario";
import {
  DURACIONES_DE_CONDICION,
  DURACION_INDEFINIDA,
  describirRestante,
  segundosDeDuracion,
  type ModoDeDuracion,
} from "./duraciones";
import type { ConditionRow } from "./api";

// Tarea 2A.10 — condiciones activas (2A.12). La clave es libre en el servidor; se ofrecen las
// quince del SRD como opciones conocidas y se admite cualquier otra clave escrita a mano —igual
// que hace el servidor, que tampoco cierra el conjunto.
//
// Tarea F4 — **cada condición dice qué hace**, en una línea bajo el nombre. En la mesa esto se
// consulta cada dos minutos y hoy obligaba a abrir el manual.

// --- El efecto de cada condición ---
//
// **Atribución:** estas líneas son **resúmenes propios y abreviados** de las entradas de
// condiciones del System Reference Document 5.1, © Wizards of the Coast LLC, bajo licencia
// CC BY 4.0. **No son el texto del SRD ni la traducción oficial de Wizards**: son obra derivada
// suya, escrita aquí en una línea funcional, y por eso se declaran como modificación en el
// `NOTICE.md` de la raíz —que es el aviso completo, y el que la aplicación tiene que enseñar—.
// No se copia la entrada entera del manual: solo lo que hace falta para no levantarse a
// buscarlo.
//
// **Ninguna de estas líneas puede insinuar un temporizador** —ni «expira», ni «rondas», ni una
// cuenta atrás—, aunque la entrada del SRD lo mencione: ahí se corta. Hay una prueba que barre
// este mapa buscando ese vocabulario.
//
// Desde 2C.4 las condiciones **sí pueden durar** (el selector de duración de abajo), pero eso no
// cambia esta regla, la refuerza: **cuánto dura una condición concreta lo decide quien la aplica**,
// no la entrada del manual. «Envenenado» no dura una hora por naturaleza; dura lo que dure el
// veneno que lo causó. Una línea de efecto que dijera «dura 1 minuto» estaría prometiendo algo
// que esta pantalla contradiría en la fila de al lado.
//
// Las claves son las mismas de `NOMBRE_CONDICION` (`SRD_CONDITIONS`, en `@dnd/shared`). Una
// clave escrita a mano por un DM **no tiene efecto escrito y no se inventa**: se pinta su
// nombre y nada más.
export const EFECTO_CONDICION: Record<string, string> = {
  blinded: "No ve. Falla lo que dependa de la vista; desventaja al atacar.",
  charmed: "No puede atacar a quien lo encantó, y este lo trata con ventaja en lo social.",
  deafened: "No oye. Falla lo que dependa del oído.",
  frightened: "Desventaja mientras vea la fuente del miedo.",
  grappled: "Velocidad 0. No se beneficia de bonos a la velocidad.",
  incapacitated: "No puede realizar acciones ni reacciones.",
  invisible: "No se le ve. Ventaja al atacar; desventaja para quien lo ataque.",
  paralyzed:
    "Incapacitado, sin poder moverse ni hablar. Falla las salvaciones de Fuerza y Destreza.",
  petrified: "Convertido en piedra: incapacitado, sin moverse ni hablar, y resistente al daño.",
  poisoned: "Desventaja en tiradas de ataque y de característica.",
  prone: "Solo se arrastra. Desventaja al atacar.",
  restrained: "Velocidad 0. No se beneficia de bonos a la velocidad.",
  stunned: "Incapacitado, sin poder moverse. Falla las salvaciones de Fuerza y Destreza.",
  unconscious: "Incapacitado, sin enterarse de nada. Suelta lo que lleva y queda derribado.",
  exhaustion: "Penaliza por niveles: pruebas, velocidad y puntos de golpe. Al sexto nivel, muere.",
  // **No es del SRD**: es la marca de la acción Ayudar (plan 08, I8). Va aquí porque comparte
  // pantalla con las quince, y sin su línea el jugador vería un rótulo sin decir qué hace.
  [CLAVE_AYUDA]: "Ventaja en tu primer ataque. Caduca al empezar el turno de quien te ayudó.",
  // **Tampoco es del SRD** (paso 2, tarea A11): es la marca de la Furia del bárbaro. **Solo dice
  // lo que el servidor hace de verdad** —sube el daño cuerpo a cuerpo, con su traza— porque el
  // resto de la lista del SRD (ventaja, resistencia, sin conjuros, sin armadura pesada) no lo
  // comprueba nadie todavía; decirlo aquí sería la interfaz prometiendo una regla del servidor
  // que no existe.
  raging:
    "Ventaja y resistencia del SRD no se calculan solas; sube tu daño cuerpo a cuerpo. Dura 1 minuto.",
};

/**
 * **Lo que hace la concentración, y es una regla que el servidor YA impone.**
 *
 * SRD 5.1, "Casting a Spell": *«Whenever you take damage while you are concentrating on a spell,
 * you must make a Constitution saving throw to maintain your concentration. The DC equals 10 or
 * half the damage you take, whichever number is higher.»* Desde 2.5.4, `changeHp` pide esa
 * salvación sola. La frase está aquí porque **si el texto y el servidor discrepan, miente el
 * texto** (regla vinculante de interfaz): esta describe lo que de verdad va a pasar.
 *
 * No dice «al perder la concentración pierdes el conjuro» aunque sea cierto: el sistema **no
 * decide** si se pierde —eso es tirar el dado y compararlo— y prometerlo aquí sería prometer algo
 * que la aplicación no hace.
 */
const EFECTO_CONCENTRACION =
  "Al recibir daño, salvación de Constitución (CD 10 o la mitad del daño, lo que sea mayor). El sistema la pide sola.";

/** El efecto de una condición, o `undefined` si la clave no es una de las del SRD. */
export function efectoCondicion(key: string): string | undefined {
  if (esConcentracion(key)) return EFECTO_CONCENTRACION;
  return EFECTO_CONDICION[key];
}

const CLAVES_CONOCIDAS = Object.keys(NOMBRE_CONDICION);

// **La concentración entra en el selector, y eso es lo que cerraba la ficha M17.**
//
// 2.5.4 dejó el servidor hecho: recibir daño estando concentrado pide una salvación de
// Constitución con su CD. Pero `grep -rn "concentrat" apps/web` no devolvía **nada** — el
// selector solo ofrecía las quince claves del SRD, así que **ninguna pantalla podía marcar a
// nadie como concentrado y la regla no se disparaba jamás en una mesa real**. La ficha se
// reabrió por eso, con las palabras «se cerró sin mirar la pantalla».
//
// Va aparte de las quince a propósito: **no es una condición del SRD**, es una marca de la mesa.
// Mezclarla en la misma lista diría que el manual la trae, y no la trae.
const OPCION_CONCENTRACION = PREFIJO_CONCENTRACION;

/** El nombre con su nivel, que es como se nombra una condición en toda esta pantalla. */
function tituloDe(c: ConditionRow): string {
  // Una concentración dice **en qué**: «Concentración» a secas no sirve de nada en una mesa donde
  // se pueden estar manteniendo dos conjuros distintos en la misma escena. El texto sale de
  // `note`, tal y como lo escribió quien la aplicó; si no lo hay, se queda el nombre a secas.
  if (esConcentracion(c.key) && c.note) return `Concentración en ${c.note}`;
  return `${nombreCondicion(c.key)}${c.level != null ? ` (nivel ${c.level})` : ""}`;
}

/** El selector de duración, el mismo control en el formulario de aplicar y en el de renovar. */
function SelectorDeDuracion({
  id,
  etiqueta,
  valor,
  onChange,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (key: string) => void;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        aria-label={etiqueta}
        className={fieldControlClass + " max-w-[12rem]"}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      >
        {DURACIONES_DE_CONDICION.map((d) => (
          <option key={d.key} value={d.key}>
            {d.etiqueta}
          </option>
        ))}
      </select>
    </>
  );
}

/**
 * Qué dice cada modo del grupo de radios de abajo (E-PE-7). «Por reloj» es el de siempre —un
 * número de segundos de juego, con el `<select>` de `SelectorDeDuracion` debajo—; los otros dos
 * son el suceso que la puerta de efectos añadió al servidor, y su etiqueta y frase **son las
 * mismas de `HASTA_EL_DESCANSO`**: no se escribe una segunda versión aquí.
 */
const OPCIONES_MODO_DE_DURACION: Record<ModoDeDuracion, { etiqueta: string; frase: string }> = {
  RELOJ: {
    etiqueta: "Por reloj",
    // **Lo que hace el servidor, no lo que suena bien**: al cumplirse el tiempo la condición se
    // marca vencida y deja de calcularse, pero NO se retira — sigue en la lista hasta que el DM la
    // quite o la renueve (D-2C-2, y la frase de la fila vencida más abajo dice lo mismo). Y con
    // el desplegable en «Indefinida», que es el valor por defecto, no hay tiempo que cumplir.
    frase:
      "Un tiempo de juego, o indefinida. Al cumplirse la hora queda marcada en la lista, sin quitarse, hasta que la quites o la renueves.",
  },
  SHORT: HASTA_EL_DESCANSO.SHORT,
  LONG: HASTA_EL_DESCANSO.LONG,
};

/**
 * Cuánto dura una condición al aplicarla: tres radios con su frase, no un desplegable
 * (`docs/04-convenciones.md`, «opciones con significado»). Markup copiado de `GrupoDeRadios`
 * (`features/campaigns/ReglasDeLaMesa.tsx:271`) — no se importa, es de otra feature. El
 * `<select>` de tiempos solo se pinta bajo «Por reloj», y es el mismo `SelectorDeDuracion` de
 * siempre, con el mismo `aria-label="Duración"` que ya usaba el spec de e2e.
 */
function SelectorDeModoDeDuracion({
  modo,
  onCambiarModo,
  duracion,
  onCambiarDuracion,
}: {
  modo: ModoDeDuracion;
  onCambiarModo: (m: ModoDeDuracion) => void;
  duracion: string;
  onCambiarDuracion: (key: string) => void;
}) {
  return (
    <fieldset className="rounded-radius-sm border border-muted bg-surface p-s2">
      <legend className="px-1 font-chrome text-chrome-sm text-text">Cuánto dura</legend>
      <div className="space-y-1">
        {(
          Object.entries(OPCIONES_MODO_DE_DURACION) as [
            ModoDeDuracion,
            { etiqueta: string; frase: string },
          ][]
        ).map(([clave, opcion]) => {
          const elegida = modo === clave;
          return (
            <label
              key={clave}
              className={[
                "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                elegida
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-bg",
              ].join(" ")}
            >
              <input
                type="radio"
                name="modo-de-duracion"
                checked={elegida}
                onChange={() => onCambiarModo(clave)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block font-chrome text-chrome-sm text-text">
                  {opcion.etiqueta}
                </span>
                <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                  {opcion.frase}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {modo === "RELOJ" && (
        <div className="mt-1">
          <SelectorDeDuracion
            id="duracion-condicion"
            etiqueta="Duración"
            valor={duracion}
            onChange={onCambiarDuracion}
          />
        </div>
      )}
    </fieldset>
  );
}

export function Condiciones({
  campaignId,
  characterId,
  puedeEditar,
  variante = "tarjeta",
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
  variante?: "tarjeta" | "chips";
}) {
  const { data: condiciones, isLoading } = useConditions(campaignId, characterId);
  const aplicar = useApplyCondition(campaignId, characterId);
  const quitar = useRemoveCondition(campaignId, characterId);
  const [nueva, setNueva] = useState(CLAVES_CONOCIDAS[0]);
  const [nivel, setNivel] = useState("1");
  // El conjuro en el que se concentra. Va a `note`, que es el campo del servidor pensado para el
  // texto de una condición; la clave se queda con el identificador normalizado.
  const [conjuro, setConjuro] = useState("");
  const [duracion, setDuracion] = useState(DURACION_INDEFINIDA.key);
  // Cómo se cuenta la duración de la que se va a aplicar (E-PE-7). Por defecto «por reloj», que
  // es lo que esta pantalla hacía antes de la puerta de efectos.
  const [modo, setModo] = useState<ModoDeDuracion>("RELOJ");
  // La duración con la que se renovará cada condición vencida, por clave. Se lleva aparte de la
  // del formulario de arriba porque son dos decisiones distintas: renovar «envenenado» una hora
  // no tiene por qué cambiar lo que el DM iba a aplicar después.
  const [duracionDeRenovacion, setDuracionDeRenovacion] = useState<Record<string, string>>({});

  // **El reloj solo se pide si hay algo que contar.** Una condición indefinida no tiene cuenta
  // atrás, y una vencida ya no cuenta: lo que necesita el reloj es una viva con caducidad.
  const hayCuentaAtras = (condiciones ?? []).some((c) => c.expiresAtClock != null && !c.expired);
  const { data: reloj } = useGameClock(campaignId, { enabled: hayCuentaAtras });

  if (isLoading) return null;

  // **Variante chips**, para la cabecera fija: solo el nombre legible de cada condición activa,
  // sin controles — aplicar y quitar siguen siendo cosa de la tarjeta. Todos los hooks de arriba
  // se llaman igual en las dos variantes: lo único que cambia es qué se pinta con sus datos.
  //
  // **El nombre sale de `tituloDe`**, la misma función que usa la tarjeta, para que chip y
  // tarjeta no puedan divergir: ya resuelve la concentración («Concentración en <conjuro>») y el
  // nivel de agotamiento («(nivel N)»), así que aquí no hace falta repetir ninguna de las dos
  // reglas a mano — `NOMBRE_CONDICION[c.key]` a secas se queda `undefined` para la concentración,
  // que no es una clave del SRD.
  //
  // **Las vencidas no entran**: la cabecera dice qué está activo ahora mismo; una condición
  // vencida se gestiona y se ve tachada en la tarjeta de Estado, no aquí.
  if (variante === "chips") {
    const activas = (condiciones ?? []).filter((c) => !c.expired);
    if (activas.length === 0) return null;
    return (
      <ul aria-label="condiciones activas" className="flex flex-wrap gap-s1">
        {activas.map((c) => (
          <li
            key={c.id}
            className="rounded-radius-sm border border-warning-text px-s2 py-0.5 font-chrome text-chrome-xs text-warning-text"
          >
            {tituloDe(c)}
            {/* Spec §5.4: «hasta descanso corto/largo» también en el chip de la cabecera de la
                hoja, no solo en la línea de la tarjeta y en el chip del elenco. Misma tabla
                (`HASTA_EL_DESCANSO`), nunca la clave cruda. */}
            {c.expiresOnRest && ` · ${HASTA_EL_DESCANSO[c.expiresOnRest].corto}`}
          </li>
        ))}
      </ul>
    );
  }

  const efectoDeLaNueva = efectoCondicion(nueva);

  return (
    <div className="flex flex-col gap-s2">
      {!condiciones || condiciones.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">Sin condiciones activas.</p>
      ) : (
        // Ya no son etiquetas en una fila: cada una es un bloque de dos renglones —nombre y
        // efecto—, así que se apilan en columna. Una fila de cápsulas con dos líneas dentro se
        // lee peor cuanto más útil es el texto.
        <ul className="flex flex-col gap-s2">
          {condiciones.map((c) => {
            const efecto = efectoCondicion(c.key);
            const vencida = c.expired === true;
            // Lo que le queda: la resta contra el reloj de la campaña. Solo si hay reloj cargado
            // y la condición sigue viva — de una vencida no se cuenta nada, ya pasó su hora.
            const restante =
              !vencida && c.expiresAtClock != null && reloj
                ? c.expiresAtClock - reloj.seconds
                : null;
            const claveDeRenovacion = duracionDeRenovacion[c.key] ?? DURACION_INDEFINIDA.key;
            return (
              <li
                key={c.key}
                className="flex items-start justify-between gap-s2 rounded-radius-sm border border-muted px-s2 py-1"
              >
                <div className="flex min-w-0 flex-col">
                  {/* Una condición vencida se ve apagada y tachada — pero **no se esconde**: el
                      servidor la deja en la lista a propósito (decisión D-2C-2), para que nadie
                      vea cambiar sus números sin saber por qué. */}
                  <span
                    className={`font-chrome text-chrome-sm ${
                      vencida ? "text-muted line-through" : "text-text"
                    }`}
                  >
                    {tituloDe(c)}
                    {/* La puerta de efectos (§5.4): «hasta descanso corto/largo», nunca la clave
                        cruda `SHORT`/`LONG` — se lee de `HASTA_EL_DESCANSO`, la misma tabla que
                        pinta el radio de aplicarla y el chip del elenco. */}
                    {c.expiresOnRest && ` · ${HASTA_EL_DESCANSO[c.expiresOnRest].corto}`}
                  </span>
                  {vencida ? (
                    // **El texto dice la verdad**: no se quita sola. El servidor deja de
                    // calcularla —no frena la velocidad, no parte los PG— y la deja marcada
                    // hasta que alguien la retire o la renueve. Prometer que desaparecerá sería
                    // exactamente la clase de frase que este proyecto no permite.
                    <span className="font-chrome text-chrome-xs text-warning-text">
                      Vencida: ya no se aplica. Sigue en la lista hasta que la quites o la renueves.
                    </span>
                  ) : (
                    <>
                      {efecto && (
                        <span className="font-chrome text-chrome-xs text-muted">{efecto}</span>
                      )}
                      {restante != null && (
                        <span className="font-chrome text-chrome-xs text-accent-text">
                          Vence en {describirRestante(restante)}
                        </span>
                      )}
                    </>
                  )}
                  {vencida && puedeEditar && (
                    <div className="mt-1 flex flex-wrap items-center gap-s2">
                      <SelectorDeDuracion
                        id={`renovar-duracion-${c.key}`}
                        etiqueta={`Duración al renovar ${tituloDe(c)}`}
                        valor={claveDeRenovacion}
                        onChange={(key) =>
                          setDuracionDeRenovacion((previo) => ({ ...previo, [c.key]: key }))
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          aplicar.mutate({
                            key: c.key,
                            level: c.level ?? undefined,
                            durationSeconds: segundosDeDuracion(claveDeRenovacion) ?? undefined,
                          })
                        }
                        disabled={aplicar.isPending}
                      >
                        Renovar
                      </Button>
                    </div>
                  )}
                </div>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => quitar.mutate(c.key)}
                    aria-label={`Quitar ${nombreCondicion(c.key)}`}
                    className="text-muted hover:text-danger-text"
                  >
                    <IconoQuitar className="h-[1em] w-[1em]" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {puedeEditar && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-s2">
            <label className="sr-only" htmlFor="nueva-condicion">
              Nueva condición
            </label>
            <select
              id="nueva-condicion"
              className={fieldControlClass + " max-w-[12rem]"}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            >
              {CLAVES_CONOCIDAS.map((k) => (
                <option key={k} value={k}>
                  {nombreCondicion(k)}
                </option>
              ))}
              {/* `optgroup` y no una opción suelta: el grupo dice con una palabra por qué está
                  separada de las quince de arriba, sin tener que escribir una nota al pie. */}
              <optgroup label="De la mesa, no del manual">
                <option value={OPCION_CONCENTRACION}>Concentración</option>
              </optgroup>
            </select>
            {nueva === "exhaustion" && (
              <input
                type="number"
                min={1}
                max={6}
                className={fieldControlClass + " w-16"}
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                aria-label="Nivel de agotamiento"
              />
            )}
            {nueva === OPCION_CONCENTRACION && (
              <input
                type="text"
                maxLength={60}
                className={fieldControlClass + " w-40"}
                value={conjuro}
                onChange={(e) => setConjuro(e.target.value)}
                aria-label="Conjuro en el que se concentra"
                placeholder="Bendición"
              />
            )}
          </div>
          {/* El mismo efecto, antes de aplicarla: la pregunta de la mesa es «¿qué hace
              envenenado?», y se hace mirando el selector. */}
          {efectoDeLaNueva && (
            <p className="font-chrome text-chrome-xs text-muted">{efectoDeLaNueva}</p>
          )}
          {/* **Cuánto dura, al aplicarla.** Por defecto por reloj — indefinida, que es lo que
              esta pantalla hacía antes de 2C — y desde la puerta de efectos (E-PE-7), también
              «hasta el próximo descanso corto/largo», el suceso en vez del número.
              **Va ANTES del botón, también en el DOM** (ola de arreglos 1): un usuario de teclado
              o de lector de pantalla tiene que encontrarse la elección de duración antes de
              llegar a «Aplicar», no después de haberlo pulsado. */}
          <SelectorDeModoDeDuracion
            modo={modo}
            onCambiarModo={setModo}
            duracion={duracion}
            onCambiarDuracion={setDuracion}
          />
          <div className="flex items-center gap-s2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                aplicar.mutate({
                  // La clave de una concentración lleva el conjuro normalizado dentro; el nombre
                  // tal y como se escribió va en `note`, que es donde el servidor guarda el texto.
                  key: nueva === OPCION_CONCENTRACION ? claveDeConcentracion(conjuro) : nueva,
                  note: nueva === OPCION_CONCENTRACION ? conjuro : undefined,
                  level: nueva === "exhaustion" ? Number(nivel) : undefined,
                  // `undefined` y no `null`: una condición indefinida **no manda el campo**, que
                  // es lo que el esquema del servidor espera para dejar la caducidad vacía. Y
                  // `durationSeconds`/`expiresOnRest` son exclusivos (E-PE-7): solo viaja el que
                  // corresponda al modo elegido en el grupo de radios.
                  durationSeconds:
                    modo === "RELOJ" ? (segundosDeDuracion(duracion) ?? undefined) : undefined,
                  expiresOnRest: modo === "RELOJ" ? undefined : modo,
                })
              }
              // **Sin conjuro no se aplica**, y el botón lo dice en vez de dejar aplicar una
              // clave `concentrating-` pelada que no distinguiría un conjuro de otro.
              // **Nombre propio, porque no es el único «Aplicar» de la pantalla.** La hoja tiene
              // cinco más —uno por moneda— que ya llevaban el suyo; este se había quedado con el
              // texto pelado, así que en una hoja completa hay seis controles que un lector de
              // pantalla anuncia igual. Lo destapó un recorrido de navegador al no poder pulsarlo.
              aria-label="Aplicar condición"
              disabled={
                aplicar.isPending || (nueva === OPCION_CONCENTRACION && conjuro.trim().length === 0)
              }
              title={
                nueva === OPCION_CONCENTRACION && conjuro.trim().length === 0
                  ? "Escribe en qué conjuro se concentra."
                  : undefined
              }
            >
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
