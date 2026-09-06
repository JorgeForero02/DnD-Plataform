import type { ResolvedFeatureDto } from "./api";
import { PROSA_DE_HOJA, ROTULO_DE_CASILLA, TarjetaDeHoja } from "./Tarjeta";
import { nombreCompetenciaArma } from "./vocabulario";

// **El pie de la hoja de la maqueta**: tres bloques en fila —competencias, rasgos y aptitudes, y
// personalidad—, lo que se lee una vez por sesión y no se consulta en mitad de un turno.
//
//  · **Competencias con armas sí se dibuja.** Hasta el 2026-09-06 este comentario decía que
//    `CharacterSheet` no devolvía `weaponProficiencies` y que pintarlas exigiría tocar la API —
//    era falso: `character-sheet.service.ts` ya la mete en la respuesta (auditoría de mecánica
//    de 2B); lo que faltaba era que el DTO del navegador la declarase (`features/character-sheet/api.ts`).
//    **Los idiomas siguen sin modelo** —ninguna capa del servidor los guarda todavía—, así que el
//    bloque solo es de armas y no promete idiomas que no tiene.
//  · **Personalidad sí**, con lo que hay. La maqueta la parte en Rasgo · Ideal · Vínculo ·
//    Defecto, que son cuatro campos que el modelo no tiene; lo que sí tiene es la biografía del
//    personaje, y es donde la mesa escribe justamente eso. Se pinta esa, con su nombre real, y
//    los cuatro campos se declaran pendientes en vez de fingirse con la biografía troceada.

/**
 * Competencias con armas: categorías (armas sencillas/marciales) y armas concretas sueltas por
 * un rasgo racial, **cada una una vez** — la clave nunca cruda (`nombreCompetenciaArma`).
 *
 * Sin ninguna (un PNJ instanciado desde un statblock: `deriveNpc` la manda vacía porque un
 * statblock no declara esto), el bloque no se dibuja — mismo criterio que `RasgosYAptitudes`.
 */
export function CompetenciasConArmas({ weaponProficiencies }: { weaponProficiencies: string[] }) {
  if (weaponProficiencies.length === 0) return null;
  return (
    <TarjetaDeHoja titulo="Competencias con armas" etiqueta="competencias con armas">
      <ul className="flex flex-wrap gap-s2">
        {weaponProficiencies.map((clave) => (
          <li
            key={clave}
            className="rounded-radius-sm border border-muted px-s2 py-1 font-chrome text-chrome-sm text-text"
          >
            {nombreCompetenciaArma(clave)}
          </li>
        ))}
      </ul>
    </TarjetaDeHoja>
  );
}

/**
 * Rasgos y aptitudes, **uno por línea** en vez de una fila de cápsulas.
 *
 * La maqueta pone nombre y una línea de qué hace. Nosotros tenemos el nombre y nada más
 * (`ResolvedFeature` trae `name`, no descripción), así que la lista es de nombres — pero en
 * columna, que es como se lee una lista de aptitudes, y no en cápsulas, que es como se lee un
 * conjunto de etiquetas cortas.
 */
export function RasgosYAptitudes({ features }: { features: ResolvedFeatureDto[] }) {
  if (features.length === 0) return null;
  return (
    <TarjetaDeHoja titulo="Rasgos y aptitudes" etiqueta="rasgos y aptitudes">
      <ul className="flex flex-col gap-1">
        {features.map((f) => (
          <li key={f.labelKey} className="font-chrome text-chrome-sm leading-snug text-text">
            {f.name}
          </li>
        ))}
      </ul>
    </TarjetaDeHoja>
  );
}

/**
 * Personalidad. **Es el único bloque de la hoja con filete de cobre en los cuatro lados**, que
 * es el tono cálido que la maqueta le da: lo demás de la hoja son números y este es el trozo que
 * pertenece al mundo, no al instrumento.
 */
export function Personalidad({ bio }: { bio: string | null }) {
  return (
    <TarjetaDeHoja titulo="Personalidad" etiqueta="personalidad">
      {bio ? (
        <p className="whitespace-pre-wrap font-chrome text-chrome-sm leading-relaxed text-text">
          {bio}
        </p>
      ) : (
        <p className={PROSA_DE_HOJA}>
          Sin nota de personalidad todavía. Se escribe en la biografía, desde el editor del
          personaje.
        </p>
      )}
      <p className={`mt-s3 ${ROTULO_DE_CASILLA}`}>Rasgo · Ideal · Vínculo · Defecto</p>
      <p className={`mt-1 ${PROSA_DE_HOJA}`}>
        Los cuatro por separado llegan cuando el personaje tenga trasfondo: hoy la hoja guarda una
        biografía y no cuatro campos, y trocearla aquí sería inventarse un dato que nadie escribió.
      </p>
    </TarjetaDeHoja>
  );
}
