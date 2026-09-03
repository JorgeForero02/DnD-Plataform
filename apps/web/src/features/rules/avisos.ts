import { MAX_RULE_CHAIN_DEPTH } from "@dnd/shared";
import type { RuleCondition, RuleEffect, RuleTrigger } from "@dnd/shared";
import { CARRIL_DE_PARTE, nombreDePieza } from "./vocabulario";

// Tarea F5 — los tres fallos que la literatura de la programación disparador-acción documenta
// una y otra vez, detectados **mientras se escribe la regla** y con el arreglo ofrecido, no solo
// señalados.
//
// **Por qué vive en la web y no en la API.** Antes de escribir nada se miró qué había ya en
// `apps/api/src/rules-engine/`. El motor detecta dos de las tres cosas, pero **solo al
// dispararse y solo a posteriori**: `specificity.ts` marca `CONFLICT` cuando dos reglas empatan
// en especificidad, y `engine.ts` corta la cascada con `STOPPED` al pasar de
// `MAX_RULE_CHAIN_DEPTH` saltos. Las dos quedan escritas en la traza — es decir, el DM se entera
// **después de que la partida ya haya ido mal**. Lo que faltaba no era detectar: era avisar
// antes, con la regla delante y sin haberla guardado todavía. Eso se hace con datos que la
// pantalla **ya tiene** (`RuleRow[]` trae disparador, condiciones y efectos de todas las reglas
// de la campaña), así que no hace falta ni un endpoint nuevo ni tocar `@dnd/shared`.
//
// **Esto describe lo que hace el motor; no lo define** (docs/04-convenciones.md). Tres
// afirmaciones de aquí son afirmaciones sobre el servidor, y se copian de él, no se inventan:
//   - **Gana la que tiene más condiciones; si empatan, no se aplica ninguna** — es literal
//     `resolveSpecificity` (`engine/specificity.ts`).
//   - **Solo tres efectos reabren la cascada**: `REVEAL_ENTITY` → `ENTITY_REVEALED`,
//     `SET_FLAG` → `FLAG_SET`, `RAISE_SIGNAL` → `SIGNAL_RAISED`. Los demás son terminales
//     (`engine/effect-applier.ts`, §2.1). `HIDE_ENTITY` **no** encadena, y por eso no puede
//     formar un bucle: si esto dijera lo contrario, mentiría.
//   - **El tope de saltos es `MAX_RULE_CHAIN_DEPTH`**, importado del paquete compartido en vez
//     de copiado como número: un tope escrito a mano se desincroniza el día que cambie.

/** Una regla vista por el detector: sirve igual un borrador a medias que una regla guardada. */
export interface ReglaParaAvisos {
  /** Ausente en el borrador que se está escribiendo. */
  id?: string;
  name: string;
  trigger: RuleTrigger | null;
  conditions: RuleCondition[];
  effects: RuleEffect[];
}

export type ClaseDeAviso = "REVERSION_AUSENTE" | "CONFLICTO_DE_PRIORIDAD" | "BUCLE";

/**
 * El arreglo que el aviso ofrece. Es un dato, no una función: quien lo ejecuta es la pantalla
 * —una parte aquí mismo, otra en `PanelDeReglas.tsx` porque necesita la API— y así el detector
 * sigue siendo puro y se puede probar sin montar nada.
 */
export type AccionDeArreglo =
  /** Crea una regla nueva que quita la marca al cerrarse la sesión. */
  | { tipo: "CREAR_REGLA_DE_REVERSION"; nombre: string; key: string }
  /** Mete una condición en el carril «Si» del borrador que se está escribiendo. */
  | { tipo: "AGREGAR_CONDICION"; kind: RuleCondition["kind"] };

export interface ArregloPropuesto {
  /** El texto del enlace. Es un verbo: dice lo que va a pasar al pulsarlo. */
  etiqueta: string;
  /** Qué deja hecho, para que nadie pulse a ciegas. */
  consecuencia: string;
  accion: AccionDeArreglo;
}

export interface AvisoDeRegla {
  clase: ClaseDeAviso;
  /** Estable dentro de una revisión: sirve de `key` de React y de ancla de una prueba. */
  id: string;
  titulo: string;
  cuerpo: string;
  arreglo?: ArregloPropuesto;
}

// ---------------------------------------------------------------------------------------------
// Lo que un efecto vuelve a lanzar a la cascada
// ---------------------------------------------------------------------------------------------

/**
 * El suceso que un efecto reinyecta en la cascada, si reinyecta alguno. Copia exacta de
 * `engine/effect-applier.ts`: tres efectos encadenan y cinco son terminales.
 */
export function sucesoQueEncadena(efecto: RuleEffect): RuleTrigger | null {
  switch (efecto.kind) {
    case "REVEAL_ENTITY":
      return { kind: "ENTITY_REVEALED", entityId: efecto.entityId };
    case "SET_FLAG":
      return { kind: "FLAG_SET", key: efecto.key };
    case "RAISE_SIGNAL":
      return { kind: "SIGNAL_RAISED", key: efecto.key };
    default:
      return null;
  }
}

/**
 * ¿Este suceso despierta esa regla? Mismo criterio que `engine/matching.ts`: primero el tipo,
 * después los campos que ese tipo declara, y un campo opcional ausente en el disparador acepta
 * cualquier valor.
 *
 * Un hueco todavía sin rellenar (cadena vacía) **no cuenta como coincidencia**: el borrador
 * está a medias y decir que ya choca con algo sería inventarse un problema.
 */
export function despierta(disparador: RuleTrigger, suceso: RuleTrigger): boolean {
  if (disparador.kind !== suceso.kind) return false;
  switch (disparador.kind) {
    case "SESSION_STARTED":
    case "SESSION_CLOSED":
    case "MEMBER_JOINED":
      return true;
    case "ENTITY_OPENED":
    case "ENTITY_COMMENTED":
    case "ENTITY_REVEALED":
    case "DM_EXECUTED":
    case "ENTITY_ATTACKED": {
      const otro = suceso as Extract<RuleTrigger, { entityId: string }>;
      return disparador.entityId !== "" && disparador.entityId === otro.entityId;
    }
    case "FLAG_SET":
    case "SIGNAL_RAISED": {
      const otro = suceso as Extract<RuleTrigger, { key: string }>;
      return disparador.key !== "" && disparador.key === otro.key;
    }
    case "ENTITY_LINKED": {
      const otro = suceso as Extract<RuleTrigger, { kind: "ENTITY_LINKED" }>;
      if (disparador.fromId === "" || disparador.toId === "") return false;
      if (disparador.fromId !== otro.fromId || disparador.toId !== otro.toId) return false;
      if (disparador.label === undefined || otro.label === undefined) return true;
      return disparador.label === otro.label;
    }
    case "ABILITY_ROLL": {
      const otro = suceso as Extract<RuleTrigger, { kind: "ABILITY_ROLL" }>;
      if (disparador.outcome !== otro.outcome) return false;
      if (disparador.skill === undefined || otro.skill === undefined) return true;
      return disparador.skill === otro.skill;
    }
    default:
      return false;
  }
}

/**
 * ¿Pueden dos reglas competir por el mismo suceso? Es `despierta` mirada desde los dos lados:
 * un disparador con un campo opcional en blanco es un comodín, así que basta con que uno de los
 * dos acepte al otro.
 */
export function compitenPorElMismoSuceso(a: RuleTrigger, b: RuleTrigger): boolean {
  return despierta(a, b) || despierta(b, a);
}

// ---------------------------------------------------------------------------------------------
// Los tres avisos
// ---------------------------------------------------------------------------------------------

/** Las marcas que el borrador **pone** y que nadie de la campaña quita. */
function reversionesAusentes(borrador: ReglaParaAvisos, todas: ReglaParaAvisos[]): AvisoDeRegla[] {
  const quitadas = new Set(
    todas.flatMap((regla) =>
      regla.effects.flatMap((efecto) =>
        efecto.kind === "SET_FLAG" && efecto.value === false ? [efecto.key] : [],
      ),
    ),
  );

  const puestas = borrador.effects.flatMap((efecto) =>
    efecto.kind === "SET_FLAG" && efecto.value === true && efecto.key !== "" ? [efecto.key] : [],
  );

  return [...new Set(puestas)]
    .filter((key) => !quitadas.has(key))
    .map((key) => ({
      clase: "REVERSION_AUSENTE" as const,
      id: `REVERSION_AUSENTE:${key}`,
      titulo: `Nadie deshace la marca «${key}».`,
      cuerpo:
        `Esta regla pone «${key}» y ninguna regla de la campaña la quita, así que se queda puesta ` +
        `para siempre y todo lo que dependa de ella seguirá cumpliéndose sesiones después. ` +
        `¿Añades una regla que la quite al cerrarse la sesión?`,
      arreglo: {
        etiqueta: "Añadir reversión",
        consecuencia:
          `Crea y arma una regla aparte: cuando se cierre una sesión, quitar la marca «${key}». ` +
          `Esta regla no se toca.`,
        accion: {
          tipo: "CREAR_REGLA_DE_REVERSION" as const,
          key,
          nombre: `Quitar la marca «${key}» al cerrarse la sesión`,
        },
      },
    }));
}

/** «1 condición» / «2 condiciones». Concordar en la tabla, no concatenar en la pantalla. */
function plural(cuantas: number): string {
  return `${cuantas} ${cuantas === 1 ? "condición" : "condiciones"}`;
}

/** Dos reglas que escuchan el mismo suceso, y **en qué orden** se aplican. */
function conflictosDePrioridad(
  borrador: ReglaParaAvisos,
  otras: ReglaParaAvisos[],
): AvisoDeRegla[] {
  const disparador = borrador.trigger;
  if (!disparador) return [];

  return otras.flatMap((otra) => {
    if (!otra.trigger || !compitenPorElMismoSuceso(disparador, otra.trigger)) return [];

    const mias = borrador.conditions.length;
    const suyas = otra.conditions.length;
    const nombreDelSuceso = nombreDePieza(disparador.kind);
    const cabecera =
      `Esta regla y «${otra.name}» escuchan el mismo suceso: ${nombreDelSuceso}. ` +
      `Cuando llegue, el motor aplica la más específica — la que tiene más condiciones.`;

    if (mias === suyas) {
      return [
        {
          clase: "CONFLICTO_DE_PRIORIDAD" as const,
          id: `CONFLICTO_DE_PRIORIDAD:${otra.id ?? otra.name}`,
          titulo: `Empate de prioridad con «${otra.name}».`,
          cuerpo:
            `${cabecera} Las dos tienen ${suyas} condición${suyas === 1 ? "" : "es"}, así que ` +
            `empatan: el motor no elige por ti y no se aplica ninguna de las dos. Para ` +
            `deshacer el empate, añade una condición al carril «${CARRIL_DE_PARTE.ESTADO}» de la ` +
            `que deba ganar, o cámbiale el suceso a una.`,
        },
      ];
    }

    const gana = mias > suyas ? "esta regla" : `«${otra.name}»`;
    const pierde = mias > suyas ? `«${otra.name}»` : "esta regla";
    return [
      {
        clase: "CONFLICTO_DE_PRIORIDAD" as const,
        id: `CONFLICTO_DE_PRIORIDAD:${otra.id ?? otra.name}`,
        titulo: `«${otra.name}» escucha el mismo suceso que esta regla.`,
        cuerpo:
          `${cabecera} Gana ${gana}, con ${plural(Math.max(mias, suyas))}; ` +
          `${pierde}, con ${Math.min(mias, suyas)}, no se aplica.`,
      },
    ];
  });
}

/**
 * La cadena que vuelve sobre sí misma. Se recorre el grafo «regla → suceso que produce → regla
 * que ese suceso despierta» buscando un ciclo **que pase por el borrador**: los ciclos que no lo
 * tocan son problema de otra regla y no se le echan encima a quien está escribiendo ésta.
 */
function bucles(borrador: ReglaParaAvisos, todas: ReglaParaAvisos[]): AvisoDeRegla[] {
  const clave = (regla: ReglaParaAvisos) => regla.id ?? "__borrador__";
  const inicio = clave(borrador);

  /** Las reglas que despierta lo que produce ésta. */
  function siguientes(regla: ReglaParaAvisos): ReglaParaAvisos[] {
    const sucesos = regla.effects
      .map(sucesoQueEncadena)
      .filter((s): s is RuleTrigger => s !== null);
    return todas.filter(
      (otra) => otra.trigger !== null && sucesos.some((s) => despierta(otra.trigger!, s)),
    );
  }

  /** Primera ruta encontrada de vuelta al borrador, con los nombres por los que pasa. */
  function buscar(actual: ReglaParaAvisos, camino: ReglaParaAvisos[]): ReglaParaAvisos[] | null {
    for (const siguiente of siguientes(actual)) {
      if (clave(siguiente) === inicio) return [...camino, siguiente];
      if (camino.some((r) => clave(r) === clave(siguiente))) continue;
      const encontrado = buscar(siguiente, [...camino, siguiente]);
      if (encontrado) return encontrado;
    }
    return null;
  }

  const ruta = buscar(borrador, [borrador]);
  if (!ruta) return [];

  const nombreDelBorrador = borrador.name.trim() === "" ? "esta regla" : `«${borrador.name}»`;
  const paseo = ruta
    .map((regla, i) => (i === 0 || i === ruta.length - 1 ? nombreDelBorrador : `«${regla.name}»`))
    .join(" → ");

  return [
    {
      clase: "BUCLE",
      id: "BUCLE",
      titulo: "Esto se muerde la cola.",
      cuerpo:
        `${paseo}. Lo que hace esta regla acaba volviendo a despertarla. El motor no se cuelga ` +
        `—corta a los ${MAX_RULE_CHAIN_DEPTH} saltos de encadenamiento y lo deja escrito en la ` +
        `traza—, pero la cadena no va a hacer lo que esperas: se para a mitad y sin avisar en la ` +
        `mesa. Ponle un tope de disparos, o haz que solo pueda dispararse una vez.`,
      arreglo: {
        etiqueta: `Añadir «${nombreDePieza("NEVER_FIRED")}»`,
        consecuencia: `Mete esa condición en el carril «${CARRIL_DE_PARTE.ESTADO}» de esta regla, y con ella la cadena no puede volver por aquí.`,
        accion: { tipo: "AGREGAR_CONDICION", kind: "NEVER_FIRED" },
      },
    },
  ];
}

/**
 * Los avisos del borrador que se está escribiendo, mirándolo contra las demás reglas de la
 * campaña. **No es validación**: una regla con avisos se puede guardar igual. Quien decide si
 * vale es `createRuleSchema`, y quien decide qué pasa al dispararse es el motor.
 */
export function avisosDelBorrador(
  borrador: ReglaParaAvisos,
  otras: ReglaParaAvisos[],
): AvisoDeRegla[] {
  const todas = [borrador, ...otras];
  return [
    ...reversionesAusentes(borrador, todas),
    ...conflictosDePrioridad(borrador, otras),
    ...bucles(borrador, todas),
  ];
}
