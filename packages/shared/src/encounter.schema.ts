import { z } from "zod";
import { costeSchema, economiaDelTurnoSchema } from "./action-economy.schema";

// Tarea 2.5.2 — iniciativa y orden de turnos.
//
// **Un encuentro cuelga de la sesión** (`session.schema.ts` ya declara el estado mutable de la
// partida), y dentro hay una lista ORDENADA de combatientes. Cada combatiente apunta a un
// `Character` — desde 2D un PNJ en la mesa ES una fila de `Character`, así que no hace falta un
// segundo tipo de combatiente.
//
// Nació sin pantalla a propósito (§2.5.2 del spec); **2.5.6 es la pantalla**: la tira de orden de
// turnos de la mesa (`apps/web/src/features/encounters/`). La dependencia real que se construyó
// aquí sigue siendo la misma: las condiciones caducan por asaltos (2C.4) contra el mismo reloj de
// campaña que un asalto avanza.

export const encounterStatusSchema = z.enum(["PREPARING", "ACTIVE", "ENDED"]);
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;

/**
 * El bando de un combatiente **dentro de este encuentro**.
 *
 * Vive en el combatiente y no en el personaje a propósito: «enemigo» no es una propiedad de una
 * criatura, es **una relación en un momento**. Un `Character.faction` habría que mantenerlo
 * sincronizado con la ficción y se pudre el día que el mercader se vuelve enemigo; aquí es un dato
 * de vida corta que muere con el encuentro, que es lo correcto.
 *
 * **`NEUTRAL` significa «no se ha dicho»**, no «indiferente»: es lo que traen las filas viejas y lo
 * que trae un combatiente que el DM no clasificó.
 */
export const combatantSideSchema = z.enum(["ALLY", "ENEMY", "NEUTRAL"]);
export type CombatantSide = z.infer<typeof combatantSideSchema>;

/**
 * Un combatiente, ya filtrado por `canView` y con la posición renumerada densa.
 *
 * **Lleva su economía del turno desde la ronda de arreglo 1 de A3/A11.** Hasta esa revisión
 * `EncountersService.get()` serializaba solo cinco campos y se dejaba fuera las cuatro columnas
 * que el propio modelo Prisma ya tenía (tarea A2): la mesa no tenía ninguna fuente de verdad para
 * «qué le queda a cada uno», y `apps/web/src/features/encounters/TiraDeIniciativa.tsx` tuvo que
 * inventarse un estado de cliente que se desincronizaba en cuanto la acción adicional se gastaba
 * por una puerta que no fuera la de gastar directamente (`usar()` de una actividad, tarea A11) —
 * el jugador pulsaba «Usar Furia» y la pantalla seguía diciendo «disponible». Se reutiliza
 * `economiaDelTurnoSchema` con `.shape`, no una copia: es literalmente el mismo dato que ya
 * declaraba A1, con el mismo Zod, así que un campo que se le añada allí llega aquí solo.
 */
export const combatantSchema = z
  .object({
    id: z.string().cuid(),
    characterId: z.string().cuid(),
    initiative: z.number().int(),
    position: z.number().int().nonnegative(),
    side: combatantSideSchema,
    /**
     * **Está a 0 puntos de golpe.** Lo deriva el servidor de `Character.currentHp`, que hasta hoy
     * no salía por aquí: `encounters/` no miraba los PG en ninguna parte.
     *
     * Se llama `derrotado` y **no `muerto`**, y es deliberado. SRD 5.1, «Monsters and Death»:
     * *«Most DMs have a monster die the instant it drops to 0 hit points… Mighty villains and
     * special nonplayer characters are common exceptions.»* Ni siquiera un monstruo a 0 está
     * muerto por regla — es costumbre del DM, con excepciones. Y un personaje jugador a 0 está
     * inconsciente tirando salvaciones, no muerto. Un solo nombre para los dos solo puede ser el
     * que describe lo que se ve: cayó.
     */
    derrotado: z.boolean(),
  })
  .extend(economiaDelTurnoSchema.shape);
export type Combatant = z.infer<typeof combatantSchema>;

export const encounterSchema = z.object({
  id: z.string().cuid(),
  sessionId: z.string().cuid(),
  status: encounterStatusSchema,
  round: z.number().int().positive(),
  /**
   * De quién es el turno, **o `null` si es de alguien que este espectador no puede ver.**
   *
   * `.nullable()` lo puso la revisión de cierre de 2.5.6: el servidor devuelve `null` desde su
   * propia revisión de 2.5.2 —«ahora no te toca a ti» es verdad y no delata a nadie— y este tipo
   * decía que era siempre un número. La pantalla ya lo comprobaba y su prueba tenía que escribir
   * `null as unknown as number` para poder probar lo que el servidor hace de verdad. Un tipo que
   * miente deja pasar `combatants[encuentro.activePosition]` sin que el compilador diga nada.
   */
  activePosition: z.number().int().nonnegative().nullable(),
  combatants: z.array(combatantSchema),
  /**
   * **El sistema propone; el DM decide.** Cierto cuando el encuentro tiene al menos un `ENEMY` y
   * **todos** sus `ENEMY` están a 0 PG.
   *
   * No cierra nada: el encuentro sigue `ACTIVE` hasta que el DM lo termine. Un enemigo a 0 puede
   * estar inconsciente, los enemigos huyen, y un combate se acaba parlamentando con el jefe en
   * pie — un cierre automático sería el servidor decidiendo por él, y es justo lo que la doctrina
   * impresa de las Herramientas del DM prohíbe.
   *
   * **`NEUTRAL` no cuenta**: significa «no se ha dicho», y proponer sobre un silencio sería
   * afirmar algo que nadie declaró.
   *
   * **Llega en `false` a quien no es DM**, y esa es su parte de seguridad: calcularlo para un
   * jugador le diría que ya no queda ningún enemigo en pie **incluido el que no puede ver**. Es la
   * misma fuga que `activePosition` cierra devolviendo `null`.
   */
  finalPropuesto: z.boolean(),
});
export type Encounter = z.infer<typeof encounterSchema>;

/**
 * Empezar un encuentro: quiénes combaten. **El servidor tira la iniciativa**, no se manda un
 * número — el jugador manda a quién representa, no un resultado.
 *
 * Los personajes que compartan `statblockRef` (los PNJ idénticos que 2D instancia) se agrupan
 * automáticamente y comparten una única tirada — el SRD: *"Tu GM hará una única tirada para todo
 * un grupo de criaturas idénticas, de modo que todos los miembros de dicho grupo actuarán a la
 * vez."* Agruparlos no lo decide quien llama: lo decide el servidor mirando `statblockRef`.
 */
export const startEncounterSchema = z
  .object({
    characterIds: z.array(z.string().cuid()).min(1).max(50),
    /**
     * El bando de cada uno, **por id de personaje**. Opcional, y quien falte entra como `NEUTRAL`.
     *
     * **El servidor no lo adivina, y no puede.** No hay ningún dato del que deducirlo: ni el tipo de
     * ficha ni la visibilidad sirven —un PNJ `DM_ONLY` puede ser el aliado que aparece a mitad de
     * escena—. Por eso lo dice quien empieza el encuentro, que siempre es el DM.
     *
     * **Es un mapa aparte y no un array de objetos** para no romper el contrato que la mesa ya usa:
     * `characterIds` sigue diciendo *quiénes combaten*, que es una pregunta distinta de *de qué lado
     * está cada uno*. Una clave que no esté en `characterIds` es un error de quien llama y el
     * servidor la rechaza con un 400, en vez de tragársela en silencio.
     */
    sides: z.record(z.string().cuid(), combatantSideSchema).optional(),
  })
  /**
   * **La comprobación vive aquí y no en el servicio, y eso lo decidió una prueba en rojo.**
   *
   * Estaba en `EncountersService.start`, después de la comprobación de «ya hay un encuentro
   * activo», así que una petición mal construida contra una sesión que ya combatía recibía un
   * **409** en vez de un 400: «llegaste tarde» en lugar de «tu petición está mal». Aquí la aplica
   * el `ZodValidationPipe` antes de que el servicio mire ningún estado, que es lo que la
   * convención del proyecto manda —ninguna validación en el servicio que el esquema ya cubra— y lo
   * que hace que el código de estado diga la verdad.
   */
  .superRefine((valor, ctx) => {
    if (!valor.sides) return;
    const combaten = new Set(valor.characterIds);
    for (const id of Object.keys(valor.sides)) {
      if (!combaten.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sides", id],
          message: "Se ha indicado el bando de alguien que no entra al combate",
        });
      }
    }
  });
export type StartEncounterInput = z.infer<typeof startEncounterSchema>;

/**
 * El DM corrige un número de iniciativa tras la tirada — como en Foundry, y porque el SRD deja
 * los empates a su criterio. Cambia solo ESTE combatiente: si quiere separar a un grupo que
 * actuaba junto, esta es la puerta.
 */
export const setInitiativeSchema = z.object({
  initiative: z.number().int().min(-20).max(60),
});
export type SetInitiativeInput = z.infer<typeof setInitiativeSchema>;

/**
 * El DM corrige el bando con el combate en marcha — un aliado te traiciona al segundo asalto.
 * Hermana de `setInitiativeSchema`: sin ella, el bando sería la única decisión del combate que no
 * se puede rectificar.
 */
export const setSideSchema = z.object({
  side: combatantSideSchema,
});
export type SetSideInput = z.infer<typeof setSideSchema>;

/**
 * Paso 2, tarea A2 — gastar un trozo de la economía del turno (`action-economy.schema.ts`).
 *
 * **`cantidad` solo aplica a `MOVEMENT`, en pies, y por eso es obligatoria justo ahí.** Para los
 * demás costes no significa nada y el servidor la ignora si llega de todos modos — no es un 400,
 * porque «acción, y además 20» no es una petición mal formada, es una petición con un campo de
 * sobra que no cambia lo que se gasta.
 */
export const gastarSchema = z
  .object({
    coste: costeSchema,
    cantidad: z.number().int().positive().max(1000).optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.coste === "MOVEMENT" && valor.cantidad === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cantidad"],
        message: "Cuántos pies de movimiento gasta",
      });
    }
  });
export type GastarInput = z.infer<typeof gastarSchema>;
