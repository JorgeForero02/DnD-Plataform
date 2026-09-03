import { useState } from "react";
import { IconoQuitar } from "../../ui/Iconos";
import { useApplyCondition, useConditions, useRemoveCondition } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { NOMBRE_CONDICION, nombreCondicion } from "./vocabulario";

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
// **En esta fase las condiciones no tienen duración.** Se ponen y se quitan a mano; la duración
// por turnos nace con la iniciativa, que todavía no existe. Por eso **ninguna de estas líneas
// puede insinuar un temporizador** —ni «expira», ni «rondas», ni una cuenta atrás—, aunque la
// entrada del SRD lo mencione: ahí se corta. Hay una prueba que barre este mapa buscando ese
// vocabulario, porque prometer un temporizador que no existe es peor que no decir nada.
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

  if (isLoading) return null;

  const efectoDeLaNueva = efectoCondicion(nueva);

  return (
    <section aria-label="condiciones" className="flex flex-col gap-s2">
      <p className="font-chrome text-chrome-sm font-semibold text-text">Condiciones activas</p>
      {!condiciones || condiciones.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">Sin condiciones activas.</p>
      ) : (
        // Ya no son etiquetas en una fila: cada una es un bloque de dos renglones —nombre y
        // efecto—, así que se apilan en columna. Una fila de cápsulas con dos líneas dentro se
        // lee peor cuanto más útil es el texto.
        <ul className="flex flex-col gap-s2">
          {condiciones.map((c) => {
            const efecto = efectoCondicion(c.key);
            return (
              <li
                key={c.key}
                className="flex items-start justify-between gap-s2 rounded-radius-sm border border-copper px-s2 py-1"
              >
                <div className="flex flex-col">
                  <span className="font-chrome text-chrome-xs text-copper-text">
                    {nombreCondicion(c.key)}
                    {c.level != null && ` (nivel ${c.level})`}
                  </span>
                  {efecto && (
                    <span className="font-chrome text-chrome-xs text-muted">{efecto}</span>
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
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                aplicar.mutate({
                  key: nueva,
                  level: nueva === "exhaustion" ? Number(nivel) : undefined,
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
    </section>
  );
}
