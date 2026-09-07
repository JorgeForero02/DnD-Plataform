import { z } from "zod";
import { abilityKeySchema } from "./rules/trace.schema";

// Tarea A4 (paso 2) — de dónde sale un número.
//
// Foundry construye las partes de un ataque con nombre (`mod`, `prof`, `weaponMagic`,
// `ammoMagic`) y las tira con un `.join(" + ")`: están a una línea de tener nuestra traza y no
// la tienen. `Origen` es esa línea que sí damos: cada número que entra en una actividad dice de
// dónde sale, y el motor lo resuelve a un paso de traza sin trabajo extra.
//
// **Nunca una cadena evaluable.** `simplifyBonus` de Foundry (`module/utils.mjs`) evalúa texto
// como `"@mod + 2"` y devuelve 0 en silencio si algo no evalúa. Un `Origen` es una unión
// discriminada: no hay fórmula que parsear, y por tanto no hay fórmula que falle en silencio.
//
// El borrador de la tarea tenía cuatro variantes. Tras mapear diez conjuros del SRD a mano
// (tarea 0), son siete: sin `lanzamiento` no cabe `cure-wounds` (1d8 + '@mod', donde `@mod` es
// la característica de lanzamiento de quien conjura, no una fija); sin `nivelDeEspacio` no cabe
// `bless` (sus objetivos son `'@item.level + 2'`); sin `cdDeConjuro` no cabe `fireball`
// (`save.dc.calculation: spellcasting`, que ya deriva `spellSaveDc` con su propia traza). El
// razonamiento completo está en
// `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/esquema-corregido.md`, sección 1.
export const origenSchema = z.discriminatedUnion("tipo", [
  /** Un número escrito a mano: el 2 de un escudo, el 1d8 de un dado de daño sin más. */
  z.object({ tipo: z.literal("fijo"), valor: z.number().int() }),
  /** El modificador de una característica concreta y nombrada. */
  z.object({ tipo: z.literal("modificador"), ability: abilityKeySchema }),
  /**
   * El bonificador de competencia, por nivel. **Solo por nivel.** Un PNJ lo saca de su valor de
   * desafío (`competenciaDeMonstruo`, en `engine.ts`), no de esta variante: `resolverOrigen` no
   * tiene un valor de desafío en su contexto, y hasta que una actividad de PNJ lo necesite de
   * verdad no se le añade uno que nadie usa.
   */
  z.object({ tipo: z.literal("competencia") }),
  /** Un tramo por nivel de una tabla de escala: la Furia del bárbaro, un cantrip que escala. */
  z.object({ tipo: z.literal("escala"), clave: z.string().min(1).max(60) }),
  /**
   * El modificador de la característica de LANZAMIENTO de quien usa la actividad. No es
   * `modificador` con una `ability` fija porque un conjuro no puede nombrar una característica
   * concreta: depende de la clase de quien lo lanza (mago = int, clérigo = wis...).
   */
  z.object({ tipo: z.literal("lanzamiento") }),
  /** El nivel del espacio con el que se lanzó la actividad. */
  z.object({ tipo: z.literal("nivelDeEspacio") }),
  /** La CD de conjuro de quien lanza — `spellSaveDc`, ya derivada con traza por el motor. */
  z.object({ tipo: z.literal("cdDeConjuro") }),
]);
export type Origen = z.infer<typeof origenSchema>;
