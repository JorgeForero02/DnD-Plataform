import {
  ruleConditionSchema,
  ruleEffectSchema,
  ruleTriggerSchema,
  type RuleCondition,
  type RuleEffect,
  type RuleMode,
  type RuleStatus,
  type RuleTrigger,
} from "@dnd/shared";

// Tarea 2A.17 — el vocabulario de la pantalla del motor de reglas.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). El motor habla
// en claves estables (`SESSION_STARTED`, `PROPOSED`, `NATURAL_TWENTY`…) y este fichero es el
// único sitio de `features/rules` donde esas claves se convierten en español.
//
// **Las listas de opciones se derivan del esquema, no se copian a mano.** `ruleTriggerSchema` y
// compañía son uniones discriminadas de Zod: leerles `.options` da exactamente los valores que
// el servidor acepta, ni uno más ni uno menos. Una lista escrita a mano se desincroniza el día
// que alguien añada un suceso al vocabulario cerrado; ésta no puede.
//
// **Si una frase de aquí explica una regla del servidor y discrepan, miente la frase**
// (docs/04-convenciones.md). Estos textos describen lo que hacen `rules-engine.service.ts` y el
// núcleo puro; no lo definen.

function clavesDeUnion(esquema: {
  options: ReadonlyArray<{ shape: { kind: { value: string } } }>;
}): string[] {
  return esquema.options.map((opcion) => opcion.shape.kind.value);
}

/** Los 12 sucesos del vocabulario cerrado, en el orden en que los declara el esquema. */
export const DISPARADORES = clavesDeUnion(ruleTriggerSchema) as RuleTrigger["kind"][];
/** Las 8 condiciones. */
export const CONDICIONES = clavesDeUnion(ruleConditionSchema) as RuleCondition["kind"][];
/** Los 8 efectos. */
export const EFECTOS = clavesDeUnion(ruleEffectSchema) as RuleEffect["kind"][];

// ---------------------------------------------------------------------------------------------
// Los diccionarios
// ---------------------------------------------------------------------------------------------

export const NOMBRE_DISPARADOR: Record<RuleTrigger["kind"], string> = {
  SESSION_STARTED: "Empieza una sesión",
  SESSION_CLOSED: "Se cierra una sesión",
  ENTITY_OPENED: "Un jugador abre una entrada del mundo",
  ENTITY_COMMENTED: "Alguien comenta una entrada del mundo",
  ENTITY_REVEALED: "Se revela una entrada del mundo",
  FLAG_SET: "Se pone o se quita una marca",
  SIGNAL_RAISED: "Se lanza una señal",
  DM_EXECUTED: "El DM la ejecuta a mano",
  ENTITY_LINKED: "Se enlazan dos entradas del mundo",
  ABILITY_ROLL: "Una tirada de característica",
  ENTITY_ATTACKED: "Atacan a una entrada del mundo",
  MEMBER_JOINED: "Alguien se une a la campaña",
};

export const NOMBRE_CONDICION: Record<RuleCondition["kind"], string> = {
  FLAG_IS: "Una marca está puesta (o quitada)",
  SET_SIZE_AT_LEAST: "Un conjunto tiene al menos N miembros",
  IS_IN_SET: "Alguien o algo está en un conjunto",
  ALL_PLAYERS_PRESENT: "Están todos los jugadores presentes",
  SUBJECT_HAS_TAG: "La entrada del suceso lleva una etiqueta",
  REVEALED_WITH_TAG_AT_LEAST: "Ya se han revelado N entradas con una etiqueta",
  SESSION_NUMBER_AT_LEAST: "Vamos por la sesión N o una posterior",
  NEVER_FIRED: "Esta regla no se ha disparado nunca",
};

export const NOMBRE_EFECTO: Record<RuleEffect["kind"], string> = {
  REVEAL_ENTITY: "Revelar una entrada del mundo",
  HIDE_ENTITY: "Ocultar una entrada del mundo",
  SET_FLAG: "Poner o quitar una marca",
  CHANGE_SET_MEMBER: "Añadir o quitar a alguien de un conjunto",
  RAISE_SIGNAL: "Lanzar una señal",
  NOTIFY: "Avisar",
  ADD_SESSION_NOTE: "Anotar en la sesión en curso",
  SET_RULE_ARMED: "Armar o desarmar otra regla",
};

export const NOMBRE_ESTADO_REGLA: Record<RuleStatus, string> = {
  ARMED: "Armada",
  DISARMED: "Desarmada",
  BROKEN: "Rota",
};

export const EXPLICACION_ESTADO_REGLA: Record<RuleStatus, string> = {
  ARMED: "Está escuchando. Si llega su suceso y se cumplen sus condiciones, actúa.",
  DISARMED: "Existe, pero no escucha. Ni se dispara ni deja rastro.",
  BROKEN: "El motor la apartó porque algo a lo que apunta ya no existe. No se borró: se enseña.",
};

export const NOMBRE_MODO: Record<RuleMode, string> = {
  AUTOMATIC: "Automática",
  PROPOSAL: "Propuesta",
};

export const EXPLICACION_MODO: Record<RuleMode, string> = {
  AUTOMATIC:
    "Cuando se cumple, se aplica sola y queda escrita en la traza. Para lo que ya has decidido que pase.",
  PROPOSAL:
    "Cuando se cumple, no cambia nada todavía: te llega a «Propuestas» y decides tú si se aplica o se rechaza.",
};

export const NOMBRE_ESTADO_TRAZA: Record<string, string> = {
  APPLIED: "Aplicada",
  WOULD_APPLY: "Se aplicaría",
  WOULD_PROPOSE: "Se propondría",
  PROPOSED: "Pendiente de tu decisión",
  REJECTED: "Rechazada",
  STOPPED: "Detenida",
  CONFLICT: "En conflicto",
};

export const EXPLICACION_ESTADO_TRAZA: Record<string, string> = {
  APPLIED: "Se hizo de verdad: el mundo cambió.",
  WOULD_APPLY: "En un disparo real cambiaría el mundo. Aquí no: es una simulación.",
  WOULD_PROPOSE: "En un disparo real quedaría pendiente de tu decisión. Aquí no ha pasado nada.",
  PROPOSED: "No ha cambiado nada todavía. Espera a que la apliques o la rechaces.",
  REJECTED: "La rechazaste. No se hizo nada.",
  STOPPED:
    "El motor cortó aquí — por el interruptor de la campaña, por el tope de saltos o por el tope de disparos.",
  CONFLICT:
    "Dos reglas igual de específicas querían lo contrario. El motor no elige por ti: no se hizo nada.",
};

export const NOMBRE_RESULTADO_TIRADA: Record<string, string> = {
  FAILURE: "Fallo",
  SUCCESS: "Éxito",
  NATURAL_ONE: "1 natural",
  NATURAL_TWENTY: "20 natural",
};

export const NOMBRE_TIPO_MIEMBRO: Record<string, string> = {
  user: "Jugador",
  character: "Personaje",
  entity: "Ficha",
};

export const NOMBRE_ACCION_CONJUNTO: Record<string, string> = {
  ADD: "Añadir",
  REMOVE: "Quitar",
};

export const NOMBRE_AUDIENCIA: Record<string, string> = {
  PLAYERS: "Los jugadores",
  DM: "Solo el DM",
};

// ---------------------------------------------------------------------------------------------
// Traducción con fallo visible
// ---------------------------------------------------------------------------------------------

/**
 * Traduce una clave con un diccionario. **Nunca devuelve la clave cruda como si fuera prosa**:
 * si no la reconoce lo dice en pantalla («Sin traducir: X»), que es justo lo que permite a una
 * prueba recorrer el vocabulario entero y fallar en vez de imprimir el inglés en silencio.
 */
export function traducir(diccionario: Record<string, string>, clave: string): string {
  return diccionario[clave] ?? `Sin traducir: ${clave}`;
}

export const nombreDisparador = (k: string) => traducir(NOMBRE_DISPARADOR, k);
export const nombreCondicion = (k: string) => traducir(NOMBRE_CONDICION, k);
export const nombreEfecto = (k: string) => traducir(NOMBRE_EFECTO, k);
export const nombreEstadoRegla = (k: string) => traducir(NOMBRE_ESTADO_REGLA, k);
export const explicacionEstadoRegla = (k: string) => traducir(EXPLICACION_ESTADO_REGLA, k);
export const nombreModo = (k: string) => traducir(NOMBRE_MODO, k);
export const nombreEstadoTraza = (k: string) => traducir(NOMBRE_ESTADO_TRAZA, k);
export const explicacionEstadoTraza = (k: string) => traducir(EXPLICACION_ESTADO_TRAZA, k);

// ---------------------------------------------------------------------------------------------
// Frases completas — un disparador, una condición o un efecto contados en una línea
// ---------------------------------------------------------------------------------------------

/** Resuelve el nombre legible de una ficha por su identificador. Lo aporta quien pinta. */
export type NombreDeFicha = (entityId: string) => string;

/**
 * Sin nadie que resuelva el nombre, la ficha se nombra por su identificador — y **el hueco
 * todavía vacío se dice que lo está** en vez de dejar un «entrada » a medias. Es la misma frase
 * que ya escribía el editor por su cuenta (tarea F1); vive aquí una sola vez desde F6, cuando
 * las plantillas necesitaron leerse antes de tener ninguna ficha elegida.
 */
const fichaAnonima: NombreDeFicha = (id) => (id ? `entrada ${id.slice(-6)}` : "sin elegir");

export function describirDisparador(
  trigger: RuleTrigger,
  nombreFicha: NombreDeFicha = fichaAnonima,
): string {
  const base = nombreDisparador(trigger.kind);
  switch (trigger.kind) {
    case "ENTITY_OPENED":
    case "ENTITY_COMMENTED":
    case "ENTITY_REVEALED":
    case "DM_EXECUTED":
    case "ENTITY_ATTACKED":
      return `${base}: «${nombreFicha(trigger.entityId)}»`;
    case "FLAG_SET":
    case "SIGNAL_RAISED":
      return `${base}: «${trigger.key}»`;
    case "ENTITY_LINKED":
      return `${base}: «${nombreFicha(trigger.fromId)}» → «${nombreFicha(trigger.toId)}»${
        trigger.label ? ` (${trigger.label})` : ""
      }`;
    case "ABILITY_ROLL":
      return `${base}${trigger.skill ? ` de ${trigger.skill}` : ""} con resultado ${traducir(
        NOMBRE_RESULTADO_TIRADA,
        trigger.outcome,
      )}`;
    default:
      return base;
  }
}

export function describirCondicion(condicion: RuleCondition): string {
  switch (condicion.kind) {
    case "FLAG_IS":
      return `La marca «${condicion.key}» está ${condicion.value ? "puesta" : "quitada"}`;
    case "SET_SIZE_AT_LEAST":
      return `El conjunto «${condicion.setKey}» tiene al menos ${condicion.count} miembro${
        condicion.count === 1 ? "" : "s"
      }`;
    case "IS_IN_SET":
      return `${traducir(NOMBRE_TIPO_MIEMBRO, condicion.memberType)} «${condicion.memberId}» está en el conjunto «${condicion.setKey}»`;
    case "ALL_PLAYERS_PRESENT":
      return "Están todos los jugadores presentes en la sesión en curso";
    case "SUBJECT_HAS_TAG":
      return `La entrada del suceso lleva la etiqueta «${condicion.tag}»`;
    case "REVEALED_WITH_TAG_AT_LEAST":
      return `Ya se han revelado al menos ${condicion.count} entradas con la etiqueta «${condicion.tag}»`;
    case "SESSION_NUMBER_AT_LEAST":
      return `Vamos por la sesión ${condicion.count} o una posterior`;
    case "NEVER_FIRED":
      return "Esta regla no se ha disparado nunca";
    default:
      return `Sin traducir: ${(condicion as { kind: string }).kind}`;
  }
}

/**
 * La visibilidad que un efecto deja puesta, si la toca. La forma **legible** de un nivel la
 * escribe `ui/Badge.tsx` y solo ahí (docs/04-convenciones.md: una vez por dominio), así que
 * estas frases no la nombran — quien pinta acompaña la frase con la insignia.
 */
export function visibilidadDeEfecto(efecto: RuleEffect): string | undefined {
  return efecto.kind === "REVEAL_ENTITY" || efecto.kind === "HIDE_ENTITY"
    ? efecto.visibility
    : undefined;
}

export function describirEfecto(
  efecto: RuleEffect,
  nombreFicha: NombreDeFicha = fichaAnonima,
): string {
  switch (efecto.kind) {
    case "REVEAL_ENTITY":
      return `Revelar «${nombreFicha(efecto.entityId)}», dejándola con esta visibilidad:`;
    case "HIDE_ENTITY":
      return `Ocultar «${nombreFicha(efecto.entityId)}», dejándola con esta visibilidad:`;
    case "SET_FLAG":
      return `${efecto.value ? "Poner" : "Quitar"} la marca «${efecto.key}»`;
    case "CHANGE_SET_MEMBER":
      return `${traducir(NOMBRE_ACCION_CONJUNTO, efecto.action)} ${traducir(
        NOMBRE_TIPO_MIEMBRO,
        efecto.memberType,
      ).toLowerCase()} «${efecto.memberId}» ${efecto.action === "ADD" ? "al" : "del"} conjunto «${efecto.setKey}»`;
    case "RAISE_SIGNAL":
      return `Lanzar la señal «${efecto.key}»`;
    case "NOTIFY":
      return `Avisar a ${traducir(NOMBRE_AUDIENCIA, efecto.audience).toLowerCase()}: «${efecto.message}»`;
    case "ADD_SESSION_NOTE":
      return `Anotar en la sesión: «${efecto.note}»`;
    case "SET_RULE_ARMED":
      return `${efecto.armed ? "Armar" : "Desarmar"} otra regla`;
    default:
      return `Sin traducir: ${(efecto as { kind: string }).kind}`;
  }
}

// ---------------------------------------------------------------------------------------------
// Tarea R4 — «ocurrió algo» no es lo mismo que «algo es verdad»
// ---------------------------------------------------------------------------------------------
//
// Es el malentendido número uno de la programación por reglas disparador-acción: la gente no
// separa el **suceso** (un instante que pasa y ya no está) del **estado** (algo que es verdad y
// se comprueba cuando hace falta). El vocabulario del motor ya los separa —son tres uniones
// distintas en `@dnd/shared`, y por eso R4 **no necesitó tocar el esquema compartido**—, pero
// hasta ahora la pantalla no lo decía en ninguna parte: los tres desplegables se parecían.
//
// Estas frases no definen nada. Describen lo que hace `rules-engine.service.ts`; si algún día
// discrepan, el que miente es el texto (docs/04-convenciones.md).

/** Las tres partes de una regla. Una pieza pertenece a una y solo a una. */
export type ParteDeRegla = "SUCESO" | "ESTADO" | "ACCION";

/** Cómo se llama la parte cuando se nombra a secas. */
export const NOMBRE_PARTE: Record<ParteDeRegla, string> = {
  SUCESO: "Suceso",
  ESTADO: "Estado",
  ACCION: "Acción",
};

/** Cómo se llama el carril donde cae esa parte. */
export const CARRIL_DE_PARTE: Record<ParteDeRegla, string> = {
  SUCESO: "Cuando",
  ESTADO: "Si",
  ACCION: "Entonces",
};

/** La distinción, en una línea, dentro de la propia caja. */
export const QUE_ES_PARTE: Record<ParteDeRegla, string> = {
  SUCESO: "Ocurrió algo. Pasa en un instante y despierta la regla.",
  ESTADO: "Algo es verdad. No ocurre: se comprueba en el momento del suceso.",
  ACCION: "Cambia el mundo. Es la única parte de la regla que escribe algo.",
};

/** La misma distinción, contada para el carril vacío. */
export const QUE_PIDE_CARRIL: Record<ParteDeRegla, string> = {
  SUCESO:
    "Arrastra aquí el suceso que despierta la regla. Solo cabe uno: una regla escucha un suceso, no dos.",
  ESTADO:
    "Arrastra aquí lo que tiene que ser verdad en ese momento. Puedes dejarlo vacío: entonces la regla se dispara siempre que llegue su suceso.",
  ACCION: "Arrastra aquí lo que hace la regla. Sin ninguna acción, la regla no sirve de nada.",
};

/** El artículo con el que se nombra la parte en una frase de aviso. */
export const ARTICULO_PARTE: Record<ParteDeRegla, string> = {
  SUCESO: "un suceso",
  ESTADO: "un estado",
  ACCION: "una acción",
};

// --- Tarea F2 — los carriles dispuestos como se leen ------------------------------------------
//
// La glosa es lo que se le pide al carril dicho en tres palabras, para que el rótulo —«Cuando»,
// «Si», «Entonces»— no tenga que cargar solo con la explicación. Va **debajo del rótulo**, y los
// tres carriles van uno junto a otro: la frase se lee de izquierda a derecha porque está
// dispuesta como se lee.
//
// El paréntesis lo cierra `ARTICULO_PARTE` en vez de repetir aquí el nombre de la parte. Es la
// regla de la casa —la forma legible se escribe una vez por dominio (docs/04-convenciones.md)—
// y aquí además evita una discrepancia concreta: la maqueta glosaba la tercera parte como «un
// efecto» mientras el resto de la pantalla la llama «una acción». Dos nombres para lo mismo es
// exactamente el fallo que la regla prohíbe.

/**
 * La glosa del **grupo de la paleta**, en dos o tres palabras.
 *
 * Sale de la maqueta, que rotula sus tres grupos «SUCESOS (UN INSTANTE)», «ESTADOS (SE
 * COMPRUEBA)» y «EFECTOS». Se adopta la forma —el paréntesis que distingue el grupo de un
 * vistazo, sin gastar un párrafo por grupo— y **no la palabra**: la tercera parte se llama
 * «Acción» en toda esta pantalla, y llamarla «efecto» aquí sería el fallo de los dos nombres
 * para la misma cosa que `GLOSA_CARRIL` ya evita unas líneas más abajo.
 */
export const GLOSA_DE_GRUPO: Record<ParteDeRegla, string> = {
  SUCESO: "un instante",
  ESTADO: "se comprueba",
  ACCION: "cambia el mundo",
};

/** El verbo del carril: qué se le pide, sin nombrar todavía la parte. */
export const GLOSA_CARRIL: Record<ParteDeRegla, string> = {
  SUCESO: "pasa algo",
  ESTADO: "se cumple",
  ACCION: "haz esto",
};

/** La glosa entera: «pasa algo (un suceso)». */
export function glosaDeCarril(parte: ParteDeRegla): string {
  return `${GLOSA_CARRIL[parte]} (${ARTICULO_PARTE[parte]})`;
}

/**
 * La parte a la que pertenece cada clave del vocabulario cerrado. Se deriva de las tres listas,
 * que a su vez salen del esquema compartido: una clave nueva en `@dnd/shared` aparece aquí sola.
 */
export function parteDe(clave: string): ParteDeRegla | undefined {
  if ((DISPARADORES as string[]).includes(clave)) return "SUCESO";
  if ((CONDICIONES as string[]).includes(clave)) return "ESTADO";
  if ((EFECTOS as string[]).includes(clave)) return "ACCION";
  return undefined;
}

/** El nombre legible de una clave cualquiera, mire a la parte que mire. */
export function nombreDePieza(clave: string): string {
  const parte = parteDe(clave);
  if (parte === "SUCESO") return nombreDisparador(clave);
  if (parte === "ESTADO") return nombreCondicion(clave);
  if (parte === "ACCION") return nombreEfecto(clave);
  return `Sin traducir: ${clave}`;
}

/**
 * Las parejas que de verdad se confunden en nuestro vocabulario, y no una lista teórica: son
 * las que se dicen casi igual en español y viven en partes distintas. «Se pone una marca» es un
 * instante; «una marca está puesta» es un estado que sigue siendo verdad al día siguiente.
 */
export const PAREJAS_CONFUNDIBLES: Record<string, string[]> = {
  FLAG_SET: ["FLAG_IS", "SET_FLAG"],
  FLAG_IS: ["FLAG_SET", "SET_FLAG"],
  SET_FLAG: ["FLAG_SET", "FLAG_IS"],
  SESSION_STARTED: ["SESSION_NUMBER_AT_LEAST"],
  SESSION_NUMBER_AT_LEAST: ["SESSION_STARTED"],
  MEMBER_JOINED: ["ALL_PLAYERS_PRESENT"],
  ALL_PLAYERS_PRESENT: ["MEMBER_JOINED"],
  ENTITY_REVEALED: ["REVEALED_WITH_TAG_AT_LEAST", "REVEAL_ENTITY"],
  REVEALED_WITH_TAG_AT_LEAST: ["ENTITY_REVEALED"],
  REVEAL_ENTITY: ["ENTITY_REVEALED"],
  IS_IN_SET: ["CHANGE_SET_MEMBER"],
  CHANGE_SET_MEMBER: ["IS_IN_SET"],
  SIGNAL_RAISED: ["RAISE_SIGNAL"],
  RAISE_SIGNAL: ["SIGNAL_RAISED"],
};

/**
 * La frase de desambiguación que va **dentro de la caja**, no en una ayuda que nadie abre.
 * Devuelve una lista vacía cuando la pieza no se parece a ninguna otra.
 */
export function avisosDeConfusion(clave: string): string[] {
  const parejas = PAREJAS_CONFUNDIBLES[clave] ?? [];
  return parejas.flatMap((otra) => {
    const parte = parteDe(otra);
    if (!parte) return [];
    return [`No es «${nombreDePieza(otra)}», que es ${ARTICULO_PARTE[parte]}.`];
  });
}
