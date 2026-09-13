import type { AbilityKey } from "@dnd/shared";
import { NumeroEditable, RadiosEditables, SelectorEditable } from "./EdicionEnSitio";
import { useCatalog, useUpdateSheet } from "./hooks";
import type { CharacterRow } from "./api";
import { resumenDeAjustes } from "./formula";
import { opcionesDeClase, opcionesDeRaza, opcionesDeSubraza } from "./opcionesDeCatalogo";
import { AsignarCaracteristicas } from "./AsignarCaracteristicas";
import { useCampaign } from "../campaigns/hooks";
import { reglasCompletas } from "../campaigns/reglas";
import {
  explicacionSubclase,
  NOMBRE_CARACTERISTICA,
  nombreClase,
  nombreRaza,
  nombreSubclase,
  nombreSubraza,
} from "./vocabulario";
import type { CalculatedSheet } from "./api";
import { CAJA_DE_HOJA, PROSA_DE_HOJA, ROTULO_DE_CASILLA } from "./Tarjeta";

// **La identidad del personaje se edita donde se lee.** Ya no hay un diálogo aparte.
//
// Esto sustituye a `EditorFicha`, que era el segundo de los dos botones de «Editar» que tenía la
// hoja. La regla que lo justifica no es de comodidad: en la hoja de papel, **la cadena
// características → salvaciones → habilidades baja por la misma columna porque una alimenta a la
// siguiente**, y esa contigüidad *es* la explicación. Sacar la causa a un diálogo rompe justo eso:
// el jugador ve un número que no le cuadra y tiene que irse a otra pantalla a buscar por qué.
//
// Aquí la puntuación (lo decidido) y el modificador (lo derivado) están pegados, y **solo la
// puntuación tiene afordancia de edición**. La ausencia de subrayado en el modificador significa
// «esto lo calculo yo, edita su causa» — la afordancia como información de dominio.

const CARACTERISTICAS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

/**
 * **La ficha: raza, subraza, clase y nivel.** Vive en su propia tarjeta desde la adopción de la
 * maqueta, separada de las características, porque son dos cosas distintas: esto es lo que el
 * personaje ES, y las características son sus números.
 */
export function FichaEditable({
  campaignId,
  characterId,
  character,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  character: CharacterRow;
  puedeEditar: boolean;
}) {
  const actualizar = useUpdateSheet(campaignId, characterId);
  const { data: catalogo } = useCatalog();
  // Reglas de la mesa (Task 6, D-CF-53) — el catálogo se filtra por lo que el DM permitió.
  const { data: campaign } = useCampaign(campaignId);
  const { permitidos } = reglasCompletas(campaign?.tableRules);

  const razas = opcionesDeRaza(catalogo, permitidos.razas);
  const subrazas = opcionesDeSubraza(catalogo, character.raceKey);
  const clases = opcionesDeClase(catalogo, permitidos.clases);

  // Encargo A8 (2026-09-07) — el camino (subclase) de la clase actual, y a qué nivel se elige.
  // **Ninguna subclase se elige antes de `chosenAtLevel`**, así que el selector ni se pinta hasta
  // entonces (regla vinculante de la pantalla). Con varias subclases se toma la más temprana: es
  // un rasgo de la CLASE, no de cada camino — mismo criterio que ya usa `resolve.ts`.
  const claseActual = catalogo?.classes.find((c) => c.key === character.classKey);
  const subclases = claseActual?.subclasses ?? [];
  const chosenAtLevel =
    subclases.length > 0 ? Math.min(...subclases.map((s) => s.chosenAtLevel)) : undefined;
  // La lista vacía deja todo, misma semántica que `opcionesDeRaza`/`opcionesDeClase`.
  const caminosPermitidos =
    permitidos.subclases.length === 0
      ? subclases
      : subclases.filter((s) => permitidos.subclases.includes(s.key));
  const caminosDeLaClase = caminosPermitidos.map((s) => ({
    valor: s.key,
    texto: s.name,
    explicacion: explicacionSubclase(s.key),
  }));

  const motivo = "Solo el dueño del personaje o el DM pueden editarlo.";

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex flex-wrap items-end gap-s4">
        <label className="flex flex-col gap-0.5">
          <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Raza
          </span>
          <SelectorEditable
            etiqueta="Raza"
            valor={character.raceKey ?? ""}
            opciones={razas}
            vacio="sin elegir"
            nombrarHuerfano={nombreRaza}
            disabled={!puedeEditar}
            motivoDeshabilitado={motivo}
            onGuardar={async (v) => {
              // **Cambiar de raza borra la subraza**, y se hace aquí en la misma escritura en vez
              // de dejar al servidor un elfo alto que ya no es elfo. Un dato huérfano que nadie
              // borra reaparece semanas después como un aviso que nadie entiende.
              await actualizar.mutateAsync({
                ...(v ? { race: { source: "SRD", key: v } } : {}),
                subrace: null,
              });
            }}
          />
        </label>

        {subrazas.length > 0 && (
          <label className="flex flex-col gap-0.5">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Subraza
            </span>
            <SelectorEditable
              etiqueta="Subraza"
              valor={character.subraceKey ?? ""}
              opciones={subrazas}
              vacio="ninguna"
              nombrarHuerfano={nombreSubraza}
              disabled={!puedeEditar}
              motivoDeshabilitado={motivo}
              onGuardar={async (v) =>
                actualizar.mutateAsync({ subrace: v ? { source: "SRD", key: v } : null })
              }
            />
          </label>
        )}

        <label className="flex flex-col gap-0.5">
          <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Clase
          </span>
          <SelectorEditable
            etiqueta="Clase"
            valor={character.classKey ?? ""}
            opciones={clases}
            vacio="sin elegir"
            nombrarHuerfano={nombreClase}
            disabled={!puedeEditar}
            motivoDeshabilitado={motivo}
            onGuardar={async (v) =>
              actualizar.mutateAsync(v ? { class: { source: "SRD", key: v } } : {})
            }
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Nivel
          </span>
          <NumeroEditable
            etiqueta="Nivel"
            valor={character.level}
            min={1}
            max={20}
            ancho="w-14"
            disabled={!puedeEditar}
            motivoDeshabilitado={motivo}
            onGuardar={async (n) => actualizar.mutateAsync({ level: n })}
          />
        </label>
      </div>

      {/* Encargo A8 (2026-09-07), vuelta de arreglo 1 — I3. **No aparece antes de
          `chosenAtLevel` para elegir por primera vez**: ofrecerlo mentiría sobre la regla del
          SRD. Pero **un valor ya guardado nunca desaparece** (`docs/04-convenciones.md`): un
          bárbaro que eligió camino al nivel 3 y a quien luego se le baja el nivel a 1 sigue
          teniendo esa elección en la fila, y el selector tiene que seguir enseñándola aunque el
          nivel actual ya no la justifique. `caminosDeLaClase` no filtra por nivel, así que si
          `subclassKey` sigue siendo una subclase válida de esta clase, aquí se ve marcada y
          editable; si dejó de serlo (cambió de clase sin pasar por aquí), `RadiosEditables` la
          enseña como huérfana — el mismo mecanismo de siempre. */}
      {chosenAtLevel !== undefined &&
        (character.level >= chosenAtLevel || character.subclassKey) && (
          <div className="flex flex-col gap-1">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Camino (se elige al nivel {chosenAtLevel})
            </span>
            <RadiosEditables
              etiqueta="Camino"
              valor={character.subclassKey ?? ""}
              opciones={caminosDeLaClase}
              nombrarHuerfano={nombreSubclase}
              disabled={!puedeEditar}
              motivoDeshabilitado={motivo}
              onGuardar={async (v) =>
                actualizar.mutateAsync({ subclass: v ? { source: "SRD", key: v } : null })
              }
            />
          </div>
        )}
    </div>
  );
}

/**
 * **Las seis casillas de característica.** El modificador grande y arriba, la puntuación pequeña
 * y debajo — la vuelta que da la maqueta a la casilla de la hoja impresa, y tiene razón: en la
 * mesa se usa el modificador y la puntuación es su causa. **La afordancia va al revés que el
 * tamaño**: la puntuación, que es lo editable, es la que lleva el subrayado; el modificador, que
 * es derivado, no lleva ninguno (`docs/04-convenciones.md`).
 */
export function Caracteristicas({
  campaignId,
  characterId,
  character,
  sheet,
  puedeEditar,
  esDM = false,
}: {
  campaignId: string;
  characterId: string;
  character: CharacterRow;
  /** `null` mientras la hoja no se puede derivar: falta raza, clase o alguna característica. */
  sheet: CalculatedSheet | null;
  puedeEditar: boolean;
  /**
   * Reglas de la mesa (Task 6, D-CF-53). **Solo el DM conserva la llave tras elegir con dados**
   * (E-RM-13): con una regla distinta de `LIBRE`, el jugador ve las casillas bloqueadas y el
   * bloque de abajo para fijarlas; el DM sigue editando las seis directamente, como siempre.
   * `false` por defecto: quien no sabe el rol de quien mira se queda con el trato de jugador,
   * que es el más restrictivo.
   */
  esDM?: boolean;
}) {
  const actualizar = useUpdateSheet(campaignId, characterId);
  const motivo = "Solo el dueño del personaje o el DM pueden editarlo.";
  const { data: campaign } = useCampaign(campaignId);
  const regla = reglasCompletas(campaign?.tableRules).abilities;
  const fijaLaMesa = regla.metodo !== "LIBRE" && !esDM;
  const motivoBloqueo = "Las características las fija la regla de la mesa";

  return (
    <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
      {CARACTERISTICAS.map((ability) => {
        const modificador = sheet?.derived[`abilityMod.${ability}`] ?? null;
        const puntuacionDerivada = sheet?.derived[`ability.${ability}`] ?? null;
        const ajustes = puntuacionDerivada ? resumenDeAjustes(puntuacionDerivada) : "";
        return (
          <div
            key={ability}
            className={`${CAJA_DE_HOJA} flex flex-col items-center gap-0.5 px-s2 py-s2 text-center`}
          >
            <p className={ROTULO_DE_CASILLA}>{NOMBRE_CARACTERISTICA[ability]}</p>
            {/* **El modificador va grande y arriba; la puntuación, pequeña y debajo.** Es la
                    vuelta que da la maqueta a la casilla de la hoja impresa, y tiene razón: en la
                    mesa se usa el modificador en cada tirada, y la puntuación es su causa.
                    **Sin afordancia de edición**, que es lo que dice «esto lo calculo yo». */}
            {modificador ? (
              <p
                data-derivado={`abilityMod.${ability}`}
                className="font-data text-chrome-2xl leading-none text-text"
              >
                {modificador.total >= 0 ? "+" : "−"}
                {Math.abs(modificador.total)}
              </p>
            ) : (
              <p className={PROSA_DE_HOJA}>sin calcular</p>
            )}
            <NumeroEditable
              etiqueta={NOMBRE_CARACTERISTICA[ability]}
              valor={character[ability]}
              placeholder="—"
              min={1}
              max={30}
              ancho="w-12"
              disabled={!puedeEditar || fijaLaMesa}
              motivoDeshabilitado={fijaLaMesa ? motivoBloqueo : motivo}
              onGuardar={async (n) => actualizar.mutateAsync({ abilities: { [ability]: n } })}
            />
            {/* Cuando la raza sube la puntuación, la casilla enseñaría un 14 con un +3 al
                    lado y parecería rota. La línea de abajo es la traza en una línea, y solo
                    aparece cuando hay algo que explicar. */}
            {ajustes && (
              <p className={`${PROSA_DE_HOJA} leading-tight`}>
                {ajustes} = {puntuacionDerivada!.total}
              </p>
            )}
          </div>
        );
      })}
      {fijaLaMesa && (
        <div className="col-span-full">
          <AsignarCaracteristicas
            campaignId={campaignId}
            characterId={characterId}
            regla={regla}
            puedeEditar={puedeEditar}
          />
        </div>
      )}
    </div>
  );
}
