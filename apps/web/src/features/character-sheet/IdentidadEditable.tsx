import type { AbilityKey } from "@dnd/shared";
import { NumeroEditable, SelectorEditable } from "./EdicionEnSitio";
import { useCatalog, useUpdateSheet } from "./hooks";
import type { CharacterRow } from "./api";
import { ValorDerivado } from "./Traza";
import {
  ABREVIATURA_CARACTERISTICA,
  NOMBRE_CARACTERISTICA,
  nombreClase,
  nombreRaza,
  nombreSubraza,
} from "./vocabulario";
import type { CalculatedSheet } from "./api";

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

export function IdentidadEditable({
  campaignId,
  characterId,
  character,
  sheet,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  character: CharacterRow;
  /** `null` mientras la hoja no se puede derivar: falta raza, clase o alguna característica. */
  sheet: CalculatedSheet | null;
  puedeEditar: boolean;
}) {
  const actualizar = useUpdateSheet(campaignId, characterId);
  const { data: catalogo } = useCatalog();

  const razas = (catalogo?.races ?? []).map((r) => ({ valor: r.key, texto: r.name }));
  const subrazas = (catalogo?.races.find((r) => r.key === character.raceKey)?.subraces ?? []).map(
    (s) => ({ valor: s.key, texto: s.name }),
  );
  const clases = (catalogo?.classes ?? []).map((c) => ({ valor: c.key, texto: c.name }));

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

      <section
        aria-label="características"
        className="grid grid-cols-2 gap-s3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {CARACTERISTICAS.map((ability) => (
          <div
            key={ability}
            className="rounded-radius-sm border border-muted/50 px-s2 py-s2 text-center"
          >
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              {ABREVIATURA_CARACTERISTICA[ability]}
            </p>
            <NumeroEditable
              etiqueta={NOMBRE_CARACTERISTICA[ability]}
              valor={character[ability]}
              placeholder="—"
              min={1}
              max={30}
              ancho="w-14"
              disabled={!puedeEditar}
              motivoDeshabilitado={motivo}
              onGuardar={async (n) => actualizar.mutateAsync({ abilities: { [ability]: n } })}
            />
            {/* El modificador va pegado a su puntuación y **sin afordancia de edición**: esa
                ausencia es la que dice «esto lo calculo yo, edita el número de arriba».
                Mientras la hoja no se pueda derivar —falta raza o clase— no se inventa un
                modificador: se dice que todavía no hay. */}
            {sheet ? (
              <ValorDerivado
                etiqueta="modificador"
                valor={sheet.derived[`abilityMod.${ability}`]}
              />
            ) : (
              <p className="font-chrome text-chrome-xs text-muted">sin calcular</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
