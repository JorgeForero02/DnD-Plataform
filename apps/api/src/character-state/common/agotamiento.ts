import type { DerivedValue } from "@dnd/shared";
import type { CondicionConVencimiento } from "../conditions/vencimiento";

// Tarea 2C.4, hueco H-2C-5 — **el agotamiento llegando al motor**.
//
// Hasta 2C las condiciones solo alimentaban la velocidad (`../speed/effective-speed.ts`). El
// agotamiento tiene seis niveles y **el cuarto parte los PG máximos por la mitad** (SRD 5.1,
// tabla de agotamiento: «Hit point maximum halved»), así que una hoja con agotamiento 4 enseñaba
// unos Puntos de Golpe máximos que la regla dice que ese personaje no tiene — y curaba hasta ese
// número equivocado. **Es el mismo fallo que 2B tuvo con el equipo, en la otra mitad del sistema**:
// un dato que existe en la base y no llega al cálculo.
//
// **Se aplica como un paso de traza, no como una resta silenciosa.** El proyecto entero se apoya
// en poder responder «¿de dónde sale este número?», y unos PG máximos que caen a la mitad sin
// explicación son justo la pregunta que más se hace en una mesa.

/** El nivel a partir del cual el SRD parte los PG máximos. */
export const NIVEL_DE_AGOTAMIENTO_QUE_PARTE_LOS_PG = 4;

/**
 * El último nivel de la tabla, y el único cuyo efecto es una sola palabra: **«Death»**
 * (SRD 5.1, tabla de agotamiento, nivel 6: *"Death"*).
 *
 * Es la ficha **C2C-9**, tarea 2.5.5: hasta aquí un personaje con agotamiento 6 se guardaba
 * tan tranquilo y **seguía vivo con la mitad de los PG** —el nivel 4 sí calculaba—, así que la
 * hoja enseñaba un muerto en pie. La comprobación es esta línea; lo caro era darse cuenta.
 */
export const NIVEL_DE_AGOTAMIENTO_QUE_MATA = 6;

/**
 * ¿Mata este nivel de agotamiento?
 *
 * **Se deriva, no se guarda**, igual que el vencimiento de una condición y que el resto de la
 * hoja: la muerte por agotamiento es una lectura del nivel que hay puesto, así que quitar el
 * agotamiento devuelve al personaje —que es lo que un DM espera de deshacer un error— y no queda
 * una segunda verdad («muerto») que pueda discrepar de la primera.
 *
 * **Y no toca las casillas de salvación de muerte.** Morir de agotamiento no es caer a 0 PG: no
 * hay tres fracasos que anotar ni nadie a quien estabilizar. Escribir en `deathSaveFailures`
 * mentiría sobre lo que pasó en la mesa.
 */
export function muertoPorAgotamiento(nivel: number): boolean {
  return nivel >= NIVEL_DE_AGOTAMIENTO_QUE_MATA;
}

/** El nivel de agotamiento activo, o 0. Solo cuenta la condición `exhaustion`. */
export function nivelDeAgotamiento(condiciones: CondicionConVencimiento[]): number {
  const agotamiento = condiciones.find((c) => c.key === "exhaustion");
  return agotamiento?.level ?? 0;
}

/**
 * Los PG máximos con el agotamiento aplicado, **con su paso en la traza**.
 *
 * La mitad **se redondea hacia abajo**, que es lo que «halved» significa en 5.ª edición salvo que
 * la regla diga lo contrario: 25 PG con agotamiento 4 son 12, no 13.
 *
 * Los niveles 5 y 6 no vuelven a partirlos: el efecto **no se acumula por nivel**, es una entrada
 * de la tabla que se cumple a partir del 4. Partirlos otra vez en el 5 sería inventar una regla.
 */
export function maxHpConAgotamiento(maxHp: DerivedValue, nivel: number): DerivedValue {
  if (nivel < NIVEL_DE_AGOTAMIENTO_QUE_PARTE_LOS_PG) return maxHp;
  const mitad = Math.floor(maxHp.total / 2);
  return {
    ...maxHp,
    total: mitad,
    steps: [
      ...maxHp.steps,
      {
        // `cap` y no `add`: es un techo que se impone al total, igual que la mitad de velocidad
        // del agotamiento 2. Y el `amount` es el **delta**, que es la invariante de la traza —los
        // pasos tienen que poder sumarse hasta el total.
        op: "cap",
        amount: mitad - maxHp.total,
        sourceType: "manual",
        sourceKey: `exhaustion:${nivel}`,
        labelKey: "maxHp.exhaustion.half",
      },
    ],
  };
}
