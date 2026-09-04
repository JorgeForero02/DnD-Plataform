import { SEGUNDOS_POR_DIA, SEGUNDOS_POR_HORA, SEGUNDOS_POR_MINUTO } from "@dnd/shared";
import type { GameEventRow } from "./log-api";

// B1 — **la cabecera de escena, y por qué se deriva en vez de guardarse.**
//
// El reseño de la mesa (§5) dice que el hueco donde irá el tablero no está vacío: lo ocupa una
// cabecera viva —dónde está la escena, qué hora es en la campaña, quién está— que **cambia sola
// con los sucesos que ya emitimos**. La frase que lo fija es del autor: *«El DM revela "El Puerto
// Viejo" y la cabecera pasa a decirlo.»*
//
// Eso se puede hacer HOY, sin tocar el servidor, y esa es la razón de que esté aquí: revelar una
// ficha ya escribe un `ENTITY_REVEALED` con su `entityName`, y el registro de la mesa ya baja al
// navegador filtrado por `canView`. Lo único que faltaba era leerlo.
//
// **Y es importante que no se guarde en ningún sitio.** Un campo «escena actual» en la sesión
// sería un segundo estado que mantener al día, y se desincronizaría del registro el primer día
// que alguien revelara un lugar sin actualizarlo. Derivarlo del registro hace imposible esa
// discrepancia: la cabecera **es** una lectura del registro, no una copia suya.
//
// La corrección que la investigación le hizo a esta idea, y que justifica el fichero entero: *un
// hilo a secas es un tablón, no un escenario.* Lo que convierte una columna de texto en un lugar
// es precisamente esta cabecera.

/** Lo que la cabecera necesita saber del mundo. Solo el tipo, para no arrastrar el módulo entero. */
export interface EntidadParaEscena {
  id: string;
  type: string;
  name: string;
}

export interface LugarDeLaEscena {
  id: string;
  nombre: string;
}

/**
 * El lugar donde pasa la escena: **la última ficha de tipo `LOCATION` que el DM reveló**.
 *
 * Dos filtros y ninguno es cosmético:
 *
 *  - **Solo `LOCATION`.** Revelar un PNJ o un objeto no cambia dónde estás. El tipo no viaja en el
 *    suceso, así que se cruza con las fichas que el espectador ya tiene — y eso significa que un
 *    lugar cuya ficha no puede ver **no aparece**, que es el comportamiento correcto y no un
 *    efecto colateral.
 *  - **La última.** El registro llega del servidor con lo más reciente primero, pero esta función
 *    no se fía de ese orden: lo comprueba por fecha. Un orden supuesto es la clase de detalle que
 *    aguanta hasta que alguien cambia el `ORDER BY`.
 *
 * Devuelve `null` cuando no hay ninguno, y la cabecera dice entonces lo que de verdad sabe. **No
 * se inventa un nombre de lugar**: es lo que la maqueta hacía —una tarjeta sin dato detrás— y lo
 * que `docs/04-convenciones.md` prohíbe explícitamente al copiarla.
 */
export function lugarDeLaEscena(
  eventos: readonly GameEventRow[],
  entidades: readonly EntidadParaEscena[],
): LugarDeLaEscena | null {
  const porId = new Map(entidades.map((e) => [e.id, e]));

  let mejor: { fecha: number; lugar: LugarDeLaEscena } | null = null;
  for (const evento of eventos) {
    if (evento.payload.type !== "ENTITY_REVEALED") continue;
    const ficha = porId.get(evento.subjectId);
    if (!ficha || ficha.type !== "LOCATION") continue;

    const fecha = Date.parse(evento.createdAt);
    if (Number.isNaN(fecha)) continue;
    if (mejor && fecha <= mejor.fecha) continue;

    // El nombre del suceso es el que tenía la ficha **cuando se reveló**; el de la ficha es el de
    // ahora. Gana el de ahora: si el DM le cambió el nombre, la mesa está en el sitio nuevo.
    mejor = { fecha, lugar: { id: ficha.id, nombre: ficha.name } };
  }
  return mejor?.lugar ?? null;
}

export interface MomentoDeLaCampana {
  /** `23:40`. */
  hora: string;
  /** `Día 12`. */
  dia: string;
  /** Solo decide cómo se pinta la cabecera. **No significa nada en las reglas.** */
  esNoche: boolean;
}

/**
 * La hora del mundo, partida para la cabecera.
 *
 * `relojEnPalabras` de `game-clock/vocabulario.ts` ya da «Día 12, 23:40» en una sola cadena, y
 * **no se toca**: es la forma legible del reloj y su sitio sigue siendo aquel. Aquí hacen falta
 * las dos mitades por separado porque se pintan con tamaños distintos, así que esto **reparte**,
 * no traduce — no hay dos vocabularios del reloj, sigue habiendo uno.
 *
 * **`esNoche` es una decisión de pintura y se declara como tal:** de 20:00 a 05:59. El SRD no fija
 * ninguna hora de anochecer, así que esto no puede presentarse como una regla; solo elige si la
 * cabecera va en tono frío o cálido. Si alguna vez significa algo mecánico —visión en la
 * oscuridad—, tendrá que salir del servidor y no de aquí.
 */
export function momentoDeLaCampana(segundos: number): MomentoDeLaCampana {
  const seguro = Number.isFinite(segundos) && segundos > 0 ? Math.floor(segundos) : 0;
  const dias = Math.floor(seguro / SEGUNDOS_POR_DIA);
  const restoDelDia = seguro % SEGUNDOS_POR_DIA;
  const horas = Math.floor(restoDelDia / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((restoDelDia % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO);

  return {
    hora: `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`,
    dia: `Día ${dias + 1}`,
    esNoche: horas >= 20 || horas < 6,
  };
}
