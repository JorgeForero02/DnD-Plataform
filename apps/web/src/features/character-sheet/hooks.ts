import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangeHpInput,
  CombatantSide,
  CreateRollInput,
  DeclareRestInput,
  ResolveAttackInput,
  RollAttackInput,
  SetHpInput,
  UpdateCharacterSheetInput,
} from "@dnd/shared";
import * as characterSheetApi from "./api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";
import { useCurrentSession } from "../sessions/hooks";
import { useCurrentEncounter } from "../encounters/hooks";
import { useCharacters } from "../characters/hooks";
import { useNpcs } from "../bestiario/hooks";

// Tarea 2A.10. Claves jerárquicas bajo la raíz `["campaigns", campaignId, ...]`
// (docs/04-convenciones.md): invalidar `sheetKey` invalida solo la hoja de este personaje, y
// las mutaciones de PG/recursos/condiciones/descanso todas terminan invalidando la misma raíz
// porque todas pueden cambiar lo que `GET .../sheet` calcula (un descanso cambia PG y recursos
// a la vez, por ejemplo).
//
// Trampa de vitest documentada en 04-convenciones.md: los tests espían `characterSheetApi.fetchSheet`
// etc. por su espacio de nombres, así que las llamadas internas de este módulo pasan por
// `characterSheetApi.xxx(...)` y no por el import nombrado directo.

export const sheetKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "sheet"] as const;
export const resourcesKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "resources"] as const;
export const conditionsKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "conditions"] as const;

/**
 * El catálogo SRD. **Fuera de la raíz de campaña a propósito**: es el mismo para todas, no
 * cambia mientras la aplicación esté abierta, y meterlo bajo `["campaigns", id]` haría que
 * cambiar de campaña lo volviera a pedir sin motivo.
 */
export const catalogKey = ["catalog"] as const;

export function useSetOverride(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { target: string; value: number; reason?: string }) =>
      characterSheetApi.setOverride(campaignId, characterId, v.target, v.value, v.reason),
    onSuccess: () => void qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) }),
  });
}

export function useClearOverride(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target: string) =>
      characterSheetApi.clearOverride(campaignId, characterId, target),
    onSuccess: () => void qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) }),
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: catalogKey,
    queryFn: () => characterSheetApi.fetchCatalog(),
    staleTime: Infinity,
  });
}

/**
 * **Quince segundos, los mismos que el registro** (`features/sessions/hooks.ts`), y no los treinta
 * del reloj y el inventario.
 *
 * El motivo no es «la vida cambia rápido» a secas: es que **la hoja y el registro se pintan en la
 * misma pantalla**, uno al lado del otro, en el Elenco de la mesa. Con la hoja sin sondear, el DM
 * pulsaba −5 en su portátil, la columna del registro decía a los quince segundos «Pierde 5 PG
 * (23 → 18)» y la barra de al lado seguía pintando 23 hasta que alguien recargara. Una pantalla
 * que se contradice a sí misma es peor que una que va lenta, y en la mesa lo que se mira de reojo
 * es la barra. Dos consultas que se leen juntas se refrescan juntas.
 *
 * Treinta segundos sirven para el reloj y el inventario porque nadie los tiene al lado de su
 * propia contradicción.
 *
 * **Plan 12 · 12.3 — y ahora sale de `lib/sondeo.ts`.** El razonamiento de arriba sigue siendo
 * cierto entre estas dos consultas: se refrescan **juntas**, que era el punto. Lo que cambia es
 * que ya no es el camino principal —lo es el canal en vivo— y que su número lo decide un solo
 * sitio: había diez intervalos con cuatro valores, y once ediciones para cambiar uno.
 */
export const SONDEO_DE_MESA_MS = SONDEO_DE_RED_DE_SEGURIDAD_MS;

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: sheetKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchSheet(campaignId, characterId),
    refetchInterval: SONDEO_DE_MESA_MS,
    enabled: Boolean(campaignId && characterId),
  });
}

export function useUpdateSheet(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCharacterSheetInput) =>
      characterSheetApi.updateSheet(campaignId, characterId, input),
    onSuccess: (data) => {
      qc.setQueryData(sheetKey(campaignId, characterId), data);
      // **Y la lista de personajes, que también enseña el nivel.** Antes solo se refrescaba la
      // hoja: con el editor en un diálogo daba igual, porque al cerrarlo se volvía a la lista y
      // se recargaba. Al editar en el sitio no se cierra nada, así que el nivel del subtítulo y
      // el de la fila se quedaban viejos delante de quien los acababa de cambiar. Lo cazó el
      // recorrido de navegador; ninguna unitaria lo veía.
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "characters"] });
    },
  });
}

/**
 * **Todo lo que escribe un suceso invalida el registro.** Cambiar puntos de golpe no solo
 * cambia la hoja: el servidor anota un `HP_CHANGED` en la partida, y la mesa lo está leyendo en
 * la columna del registro. Sin esta invalidación, el golpe aparecía en la hoja al instante y en
 * el registro solo cuando a la consulta le tocaba refrescar — en una sesión en curso, eso es un
 * registro que va por detrás de lo que pasa. Lo destapó un recorrido de navegador que pedía ver
 * el golpe escrito y no lo encontraba a tiempo.
 */
function invalidarRegistro(qc: ReturnType<typeof useQueryClient>, campaignId: string) {
  void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
}

export function useChangeHp(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeHpInput) =>
      characterSheetApi.changeHp(campaignId, characterId, input),
    onSuccess: (data) => {
      qc.setQueryData(sheetKey(campaignId, characterId), data);
      invalidarRegistro(qc, campaignId);
    },
  });
}

export function useSetHp(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetHpInput) => characterSheetApi.setHp(campaignId, characterId, input),
    onSuccess: (data) => {
      qc.setQueryData(sheetKey(campaignId, characterId), data);
      invalidarRegistro(qc, campaignId);
    },
  });
}

/**
 * Las tiradas que se pueden citar al aplicar daño (2.5.4). **Solo se pide cuando el panel de
 * daño está abierto** (`enabled`): una hoja quieta no tiene por qué cargar el registro.
 */
export function useTiradasCitables(campaignId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "rolls", "citables"] as const,
    queryFn: () => characterSheetApi.fetchTiradasCitables(campaignId),
    enabled: Boolean(campaignId) && enabled,
  });
}

export function useRollDeathSave(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => characterSheetApi.rollDeathSave(campaignId, characterId),
    onSuccess: (data) => qc.setQueryData(sheetKey(campaignId, characterId), data),
  });
}

export function useResources(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: resourcesKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchResources(campaignId, characterId),
    enabled: Boolean(campaignId && characterId),
  });
}

/**
 * Regalar (I8). **Invalida los recursos de LOS DOS**: el de quien da y el de quien recibe, porque
 * las dos listas cambian y la del destinatario está abierta en su hoja mientras juega.
 */
export function useGiveResource(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; toCharacterId: string; amount?: number }) =>
      characterSheetApi.giveResource(
        campaignId,
        characterId,
        vars.key,
        vars.toCharacterId,
        vars.amount ?? 1,
      ),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) });
      void qc.invalidateQueries({ queryKey: resourcesKey(campaignId, vars.toCharacterId) });
    },
  });
}

/**
 * **Ayudar** (plan 08, I8). Invalida las condiciones **del ayudado**, que es quien recibe la marca,
 * y su hoja: la sugerencia de ventaja del ataque sale de ahí y tiene que cambiar en el momento.
 */
export function useHelp(campaignId: string, helperCharacterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { targetCharacterId: string }) =>
      characterSheetApi.help(campaignId, helperCharacterId, vars.targetCharacterId),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: conditionsKey(campaignId, vars.targetCharacterId) });
      void qc.invalidateQueries({ queryKey: sheetKey(campaignId, vars.targetCharacterId) });
    },
  });
}

export const temporaryModifiersKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "temporary-modifiers"] as const;

/**
 * Los modificadores temporales (plan 13, M8). **Conceder y quitar invalidan también la hoja**: el
 * número derivado cambia con ellos, y una lista al día junto a una Fuerza vieja sería peor que no
 * enseñar nada.
 */
export function useTemporaryModifiers(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: temporaryModifiersKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchTemporaryModifiers(campaignId, characterId),
    enabled: Boolean(campaignId && characterId),
  });
}

function invalidarTemporales(qc: ReturnType<typeof useQueryClient>, c: string, ch: string) {
  void qc.invalidateQueries({ queryKey: temporaryModifiersKey(c, ch) });
  void qc.invalidateQueries({ queryKey: sheetKey(c, ch) });
}

export function useGrantTemporaryModifier(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      target: string;
      amount: number;
      reason: string;
      durationSeconds?: number;
    }) => characterSheetApi.grantTemporaryModifier(campaignId, characterId, input),
    onSuccess: () => invalidarTemporales(qc, campaignId, characterId),
  });
}

export function useRemoveTemporaryModifier(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      characterSheetApi.removeTemporaryModifier(campaignId, characterId, id),
    onSuccess: () => invalidarTemporales(qc, campaignId, characterId),
  });
}

export function useSpendResource(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; amount: number; reason?: string }) =>
      characterSheetApi.spendResource(campaignId, characterId, vars.key, vars.amount, vars.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) }),
  });
}

export function useRestoreResource(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; amount: number; reason?: string }) =>
      characterSheetApi.restoreResource(
        campaignId,
        characterId,
        vars.key,
        vars.amount,
        vars.reason,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) }),
  });
}

export function useDeclareRest(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    // La entrada entera de `declareRestSchema`, no tres campos escogidos a mano: así
    // `interrupted` (2C.3) llega hasta el servidor, y cualquier campo que el esquema gane
    // después no exige volver a tocar esta firma.
    mutationFn: (input: DeclareRestInput) =>
      characterSheetApi.declareRest(campaignId, characterId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) });
      qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) });
      qc.invalidateQueries({ queryKey: conditionsKey(campaignId, characterId) });
    },
  });
}

/**
 * El reloj de la campaña, en segundos de juego (2C.4).
 *
 * **Se sondea cada treinta segundos**, como el inventario y la sesión en curso: quien mueve el
 * reloj es el DM desde su portátil, y sin sondeo la cuenta atrás de una condición se quedaría
 * congelada en el navegador del jugador hasta que algo más invalidara la consulta.
 *
 * **Y solo se pide cuando hace falta**: `enabled` lo apaga si el personaje no tiene ninguna
 * condición con caducidad, que es el caso normal. Una hoja sin condiciones temporales no tiene
 * nada que contar y no debe cargar al servidor con una consulta cada medio minuto.
 */
export const clockKey = (campaignId: string) => ["campaigns", campaignId, "clock"] as const;

export function useGameClock(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clockKey(campaignId),
    queryFn: () => characterSheetApi.fetchClock(campaignId),
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
    enabled: Boolean(campaignId) && (options?.enabled ?? true),
  });
}

export function useConditions(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: conditionsKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchConditions(campaignId, characterId),
    // Mismo intervalo y mismo motivo que la hoja: la ficha del Elenco pinta las dos cosas juntas,
    // y una condición que ya venció seguía luciendo al lado de un registro que decía que se le
    // había quitado.
    refetchInterval: SONDEO_DE_MESA_MS,
    enabled: Boolean(campaignId && characterId),
  });
}

export function useApplyCondition(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      key: string;
      level?: number;
      note?: string;
      /** Segundos de juego. Sin esto la condición es indefinida (2C.4). */
      durationSeconds?: number;
    }) =>
      characterSheetApi.applyCondition(
        campaignId,
        characterId,
        vars.key,
        vars.level,
        vars.note,
        vars.durationSeconds,
      ),
    onSuccess: () => {
      // **Y la hoja también.** Una condición no cambia solo su propia lista: cambia la velocidad
      // efectiva desde 2A.12 y, desde 2C.4, **los puntos de golpe máximos** —el agotamiento nivel 4
      // los parte por la mitad—. Invalidar solo `conditionsKey` dejaba la hoja enseñando el número
      // de antes hasta que alguien recargara. Lo encontró el recorrido de navegador de 2C.4, no una
      // unitaria: con la caché simulada, las dos consultas se rehacen siempre.
      void qc.invalidateQueries({ queryKey: conditionsKey(campaignId, characterId) });
      void qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) });
    },
  });
}

export function useRemoveCondition(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => characterSheetApi.removeCondition(campaignId, characterId, key),
    // Quitarla mueve los mismos números que ponerla, así que invalida lo mismo.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: conditionsKey(campaignId, characterId) });
      void qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) });
    },
  });
}

export function useCreateRoll(campaignId: string) {
  return useMutation({
    mutationFn: (input: CreateRollInput) => characterSheetApi.createRoll(campaignId, input),
  });
}

/** Tira con un arma del cuadro de ataques (carril B3). No invalida la hoja: tirar no cambia nada. */
export function useRollAttack(campaignId: string, characterId: string) {
  return useMutation({
    mutationFn: (vars: { attackKey: string; input: RollAttackInput }) =>
      characterSheetApi.rollAttack(campaignId, characterId, vars.attackKey, vars.input),
  });
}

/**
 * Tarea 13 — tira un ataque contra un objetivo y trae el veredicto del servidor. Tampoco invalida
 * la hoja: resolver un ataque no cambia PG ni recursos por sí solo, el DM aplica el daño aparte.
 */
export function useResolveAttack(campaignId: string, characterId: string) {
  return useMutation({
    mutationFn: (vars: { attackKey: string; input: ResolveAttackInput }) =>
      characterSheetApi.resolveAttack(campaignId, characterId, vars.attackKey, vars.input),
  });
}

/** Un combatiente del encuentro, con nombre — la forma que necesita un selector de objetivo. */
export interface CombatienteObjetivo {
  characterId: string;
  nombre: string;
  side: CombatantSide;
}

/**
 * **El bando contrario se propone primero.** Es una preferencia de orden para la mesa habitual
 * —quien mira esta hoja suele atacar al enemigo—, no una puerta: la tercera prueba del brief de
 * la tarea 13 exige que se pueda elegir cualquiera de la lista igual, y esta tabla solo decide en
 * qué orden se ofrecen.
 */
const PRIORIDAD_BANDO: Record<CombatantSide, number> = { ENEMY: 0, NEUTRAL: 1, ALLY: 2 };

/**
 * Los objetivos posibles de un ataque: **los combatientes del encuentro en marcha**, con nombre.
 *
 * **No `useCharacters` a secas.** Esa lista es «quién se sienta a la mesa»
 * (`characters.service.ts:68`, `statblockRef: null`), así que un PNJ —el objetivo más habitual de
 * un ataque— no sale nunca en ella. El objetivo sale de `Encounter.combatants`
 * (`features/encounters/hooks.ts`), que sí los incluye porque desde 2D un PNJ en la mesa es una
 * fila de `Character` igual que cualquier otra; el nombre para pintarlo se cruza con
 * `useCharacters` (jugadores) y `useNpcs` (PNJ), igual que ya hace `ColumnaElenco.tsx`.
 *
 * **La sesión y el encuentro se piden aquí, sin que nadie los pase por parámetro** — mismo motivo
 * que documenta `ColumnaElenco.tsx`: React Query comparte la consulta por clave, así que esto no
 * es una petición de más si la mesa ya la tiene abierta, y esta hoja funciona igual si se abre
 * sola, sin la mesa alrededor.
 *
 * Solo hay objetivos con el encuentro `ACTIVE`: en `PREPARING` (sala de espera) todavía no hay
 * turnos, y `ENDED` ya no es un combate. Fuera de esos casos el botón se queda como estaba: solo
 * tira, sin pedir objetivo.
 */
export function useCombatientesDelEncuentro(
  campaignId: string,
  characterId: string,
): { combatientes: CombatienteObjetivo[]; enCombate: boolean } {
  const { data: sesion } = useCurrentSession(campaignId);
  const { data: encuentro } = useCurrentEncounter(campaignId, sesion?.id);
  const enCombate = encuentro?.status === "ACTIVE";
  const { data: personajes } = useCharacters(campaignId);
  const { data: pnjs } = useNpcs(campaignId, { enabled: enCombate });

  if (!enCombate || !encuentro) {
    return { combatientes: [], enCombate: false };
  }

  const nombreDe = new Map<string, string>();
  for (const p of personajes ?? []) nombreDe.set(p.id, p.name);
  for (const n of pnjs ?? []) nombreDe.set(n.id, n.name);

  const combatientes = encuentro.combatants
    // Nunca a uno mismo (el servidor ya lo rechaza con un 400) y nunca a quien todavía no tiene
    // nombre resuelto — el mismo cruce que hace `ColumnaElenco.tsx` para no pintar un hueco.
    .filter((c) => c.characterId !== characterId && nombreDe.has(c.characterId))
    .map((c) => ({
      characterId: c.characterId,
      nombre: nombreDe.get(c.characterId)!,
      side: c.side,
    }))
    .sort((a, b) => PRIORIDAD_BANDO[a.side] - PRIORIDAD_BANDO[b.side]);

  return { combatientes, enCombate: true };
}
