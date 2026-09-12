import { ABILITY_KEYS } from "@dnd/shared";
import { TarjetaDeHoja } from "../Tarjeta";
import { ValorDerivado } from "../Traza";
import { TirarBoton } from "../TirarBoton";
import { Caracteristicas } from "../IdentidadEditable";
import { PercepcionPasiva } from "../TarjetasDeEstado";
import {
  ABREVIATURA_CARACTERISTICA,
  NOMBRE_CARACTERISTICA,
  NOMBRE_HABILIDAD,
} from "../vocabulario";
import { HABILIDADES_POR_CARACTERISTICA } from "../habilidades";
import type { PropsDePestana } from "./tipos";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Numeros`: la cadena que
// explica los números («características → salvaciones → habilidades baja por la misma columna
// porque una alimenta a la siguiente», `IdentidadEditable.tsx`). Vivía en `HojaCalculada.tsx`;
// se mueve tal cual, sin reescribir su JSX ni sus comentarios.
export function Numeros({
  campaignId,
  characterId,
  data,
  puedeEditar,
  disposicion,
}: PropsDePestana) {
  const { sheet, character } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-3" : "";
  // Anexo #17, medido: a página las tres columnas son una sola fila y con `items-start` la del
  // medio (Salvaciones + Percepción pasiva) quedaba 42px más corta que sus vecinas — un desnivel
  // por encima del umbral de la medida (`e2e/espacios.spec.ts`, DESNIVEL_MAX_PX=24). A página se
  // igualan las tres al alto de la más alta (`items-stretch`); a mesa, una sola columna, se deja
  // `items-start` como estaba.
  const alineacion = disposicion === "pagina" ? "items-stretch" : "items-start";
  return (
    <div data-pestana="numeros" className={`grid ${alineacion} gap-s4 ${columnas}`}>
      <TarjetaDeHoja titulo="Características" etiqueta="características">
        <Caracteristicas
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          sheet={sheet}
          puedeEditar={puedeEditar}
        />
      </TarjetaDeHoja>

      <div className="flex min-w-0 flex-col gap-s4">
        {/* **Las salvaciones, en dos columnas de una línea** — como la maqueta. Seis valores
            que se leen de un vistazo no necesitan seis bandas. */}
        <TarjetaDeHoja titulo="Salvaciones">
          <div className="grid gap-x-s5 gap-y-1 sm:grid-cols-2">
            {ABILITY_KEYS.map((ability) => (
              <ValorDerivado
                key={ability}
                variante="linea"
                etiqueta={NOMBRE_CARACTERISTICA[ability]}
                valor={sheet.derived[`save.${ability}`]}
                accion={
                  <TirarBoton
                    campaignId={campaignId}
                    characterId={characterId}
                    etiqueta={`Salvación de ${NOMBRE_CARACTERISTICA[ability]}`}
                    modificador={sheet.derived[`save.${ability}`].total}
                    derivado={sheet.derived[`save.${ability}`]}
                    // **Una salvación por característica, y no una sola para las seis.**
                    // `restrained` solo penaliza las de Destreza y el fallo automático de
                    // paralizado alcanza solo Fuerza y Destreza: una entrada única tendría
                    // que mentir en cuatro o callarse en dos.
                    sugerencia={data.rollSuggestions?.saves?.[ability]}
                  />
                }
              />
            ))}
          </div>
        </TarjetaDeHoja>
        <PercepcionPasiva valor={sheet.derived.passivePerception} />
      </div>

      <TarjetaDeHoja titulo="Habilidades">
        <div className="flex flex-col gap-1">
          {ABILITY_KEYS.flatMap((ability) =>
            HABILIDADES_POR_CARACTERISTICA[ability].map((skill) => (
              <ValorDerivado
                key={skill}
                variante="linea"
                etiqueta={`${NOMBRE_HABILIDAD[skill]} (${ABREVIATURA_CARACTERISTICA[ability]})`}
                valor={sheet.derived[`skill.${skill}`]}
                accion={
                  <TirarBoton
                    campaignId={campaignId}
                    characterId={characterId}
                    etiqueta={NOMBRE_HABILIDAD[skill]}
                    modificador={sheet.derived[`skill.${skill}`].total}
                    derivado={sheet.derived[`skill.${skill}`]}
                    // **Fix round 1 (ALTA-2).** Esto decía que ninguna regla del SRD
                    // distingue característica en una prueba, y dejó de ser verdad con la
                    // migración 6: "muy cargado" (SRD 5.1, Variant: Encumbrance) solo
                    // penaliza Fuerza, Destreza y Constitución, así que una tirada de
                    // Persuasión (Carisma) no puede compartir sugerencia con una de
                    // Atletismo (Fuerza). `checks[ability]` es la entrada que sí distingue
                    // —`rollSuggestions.checks`, una por característica igual que
                    // `saves`—, y `ability` ya es la característica de ESTA habilidad
                    // porque el bucle de fuera itera `ABILITY_KEYS.flatMap(...)`.
                    sugerencia={data.rollSuggestions?.checks?.[ability]}
                  />
                }
              />
            )),
          )}
        </div>
      </TarjetaDeHoja>
    </div>
  );
}
