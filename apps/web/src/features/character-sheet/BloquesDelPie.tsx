import type { ResolvedFeatureDto } from "./api";
import { CAJA_DE_VITELA, PROSA_DE_VITELA, ROTULO_DE_CASILLA, RotuloDeSeccion } from "./Vitela";

// **El pie de la hoja de la maqueta**: tres bloques en fila —competencias e idiomas, rasgos y
// aptitudes, y personalidad—, lo que se lee una vez por sesión y no se consulta en mitad de un
// turno. Aquí van dos de los tres, y el que falta se dice:
//
//  · **Competencias e idiomas no se dibuja.** El catálogo del servidor las tiene
//    (`weaponProficiencies`, en `apps/api/src/rules/catalog/classes.ts`) pero
//    `CharacterSheet` no las devuelve, así que pintarlas exigiría o inventarlas en el navegador
//    o tocar la API. Se reporta como hueco, no se rellena con un recuadro punteado más: un
//    hueco anunciado por bloque está bien, tres seguidos son una hoja de promesas.
//  · **Personalidad sí**, con lo que hay. La maqueta la parte en Rasgo · Ideal · Vínculo ·
//    Defecto, que son cuatro campos que el modelo no tiene; lo que sí tiene es la biografía del
//    personaje, y es donde la mesa escribe justamente eso. Se pinta esa, con su nombre real, y
//    los cuatro campos se declaran pendientes en vez de fingirse con la biografía troceada.

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
    <section aria-label="rasgos y aptitudes" className={CAJA_DE_VITELA}>
      <RotuloDeSeccion>Rasgos y aptitudes</RotuloDeSeccion>
      <ul className="flex flex-col gap-1">
        {features.map((f) => (
          <li key={f.labelKey} className="font-world text-world-base leading-snug text-text">
            {f.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Personalidad. **Es el único bloque de la hoja con filete de cobre en los cuatro lados**, que
 * es el tono cálido que la maqueta le da: lo demás de la hoja son números y este es el trozo que
 * pertenece al mundo, no al instrumento.
 */
export function Personalidad({ bio }: { bio: string | null }) {
  return (
    <section aria-label="personalidad" className={CAJA_DE_VITELA}>
      <RotuloDeSeccion>Personalidad</RotuloDeSeccion>
      {bio ? (
        <p className="whitespace-pre-wrap font-world text-world-base leading-relaxed text-text">
          {bio}
        </p>
      ) : (
        <p className={PROSA_DE_VITELA}>
          Sin nota de personalidad todavía. Se escribe en la biografía, desde el editor del
          personaje.
        </p>
      )}
      <p className={`mt-s3 ${ROTULO_DE_CASILLA}`}>Rasgo · Ideal · Vínculo · Defecto</p>
      <p className={`mt-1 ${PROSA_DE_VITELA}`}>
        Los cuatro por separado llegan cuando el personaje tenga trasfondo: hoy la hoja guarda una
        biografía y no cuatro campos, y trocearla aquí sería inventarse un dato que nadie escribió.
      </p>
    </section>
  );
}
