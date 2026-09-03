import { useState } from "react";
import { IconoQuitar } from "../../ui/Iconos";
import { useApplyCondition, useConditions, useGameClock, useRemoveCondition } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { NOMBRE_CONDICION, nombreCondicion } from "./vocabulario";
import {
  DURACIONES_DE_CONDICION,
  DURACION_INDEFINIDA,
  describirRestante,
  segundosDeDuracion,
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
};

/** El efecto de una condición, o `undefined` si la clave no es una de las del SRD. */
export function efectoCondicion(key: string): string | undefined {
  return EFECTO_CONDICION[key];
}

const CLAVES_CONOCIDAS = Object.keys(NOMBRE_CONDICION);

/** El nombre con su nivel, que es como se nombra una condición en toda esta pantalla. */
function tituloDe(c: ConditionRow): string {
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

export function Condiciones({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data: condiciones, isLoading } = useConditions(campaignId, characterId);
  const aplicar = useApplyCondition(campaignId, characterId);
  const quitar = useRemoveCondition(campaignId, characterId);
  const [nueva, setNueva] = useState(CLAVES_CONOCIDAS[0]);
  const [nivel, setNivel] = useState("1");
  const [duracion, setDuracion] = useState(DURACION_INDEFINIDA.key);
  // La duración con la que se renovará cada condición vencida, por clave. Se lleva aparte de la
  // del formulario de arriba porque son dos decisiones distintas: renovar «envenenado» una hora
  // no tiene por qué cambiar lo que el DM iba a aplicar después.
  const [duracionDeRenovacion, setDuracionDeRenovacion] = useState<Record<string, string>>({});

  // **El reloj solo se pide si hay algo que contar.** Una condición indefinida no tiene cuenta
  // atrás, y una vencida ya no cuenta: lo que necesita el reloj es una viva con caducidad.
  const hayCuentaAtras = (condiciones ?? []).some((c) => c.expiresAtClock != null && !c.expired);
  const { data: reloj } = useGameClock(campaignId, { enabled: hayCuentaAtras });

  if (isLoading) return null;

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
            {/* **Cuánto dura, al aplicarla.** Por defecto indefinida, que es lo que esta
                pantalla hacía antes de 2C: se pone y la quita el DM. */}
            <SelectorDeDuracion
              id="duracion-condicion"
              etiqueta="Duración"
              valor={duracion}
              onChange={setDuracion}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                aplicar.mutate({
                  key: nueva,
                  level: nueva === "exhaustion" ? Number(nivel) : undefined,
                  // `undefined` y no `null`: una condición indefinida **no manda el campo**, que
                  // es lo que el esquema del servidor espera para dejar la caducidad vacía.
                  durationSeconds: segundosDeDuracion(duracion) ?? undefined,
                })
              }
              disabled={aplicar.isPending}
            >
              Aplicar
            </Button>
          </div>
          {/* El mismo efecto, antes de aplicarla: la pregunta de la mesa es «¿qué hace
              envenenado?», y se hace mirando el selector. */}
          {efectoDeLaNueva && (
            <p className="font-chrome text-chrome-xs text-muted">{efectoDeLaNueva}</p>
          )}
        </div>
      )}
    </div>
  );
}
