import type {
  AbilityKey,
  ChangeHpInput,
  CreateRollInput,
  DamageType,
  DeathSaveInput,
  DeathState,
  DeclareRestInput,
  DerivationWarning,
  RollSuggestions,
  DerivedValue,
  RollAttackInput,
  RollResult,
  SetHpInput,
  TraceStep,
  UpdateCharacterSheetInput,
  WeaponProperty,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2A.10 — el cliente HTTP de la hoja. `apiFetch` es el único que habla HTTP
// (docs/04-convenciones.md); este fichero es la única puerta de esta feature hacia la API que
// construyeron 2A.6 a 2A.13. **No se toca la API**: los tipos de abajo son la forma del JSON tal
// y como lo devuelven esos endpoints, calcada a mano (el mismo patrón que ya usa
// `features/characters/api.ts` con `Character`) porque `CharacterSheet`, `PendingChoice` y
// `ResolvedFeature` viven en `apps/api/src/rules/...` y la web no puede — ni debe — importar de
// `apps/api`.

/** Una fila de `Character`, con las columnas de la hoja de 2A.6/2A.7 además de las heredadas. */
export interface CharacterRow {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number;
  bio: string | null;
  visibility: string;
  str: number | null;
  dex: number | null;
  con: number | null;
  int: number | null;
  wis: number | null;
  cha: number | null;
  raceKey: string | null;
  subraceKey: string | null;
  classKey: string | null;
  choices: Record<string, string[]> | null;
  currentHp: number | null;
  tempHp: number;
  version: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  /**
   * **El color de su voz y de su retrato** (plan 05, D3). El servidor manda la fila entera, así
   * que viaja igual que `archivedAt`; se declara para que la hoja pueda pasar el personaje a
   * `vozDePersonaje` sin inventarse el campo. `null` = no ha elegido, y entonces manda la huella.
   */
  color: string | null;
  /**
   * **Cuándo se archivó, o `null` si está en la mesa.** El servidor manda la fila entera
   * (`character-sheet.service.ts`, `return { character, ... }`), así que este campo **ya viajaba**
   * y solo faltaba declararlo. Sin él, la hoja de un personaje archivado —a la que se llega por
   * una URL vieja, porque la lista ya no lo enseña— se pintaba idéntica a la de uno vivo.
   */
  archivedAt: string | null;
  /** Anulaciones manuales del DM sobre valores derivados: `{ "ac": 18 }`. */
  overrides: Record<string, number> | null;
}

export interface PendingChoiceDto {
  grantId: string;
  labelKey: string;
  kind: "abilityChoice" | "skillChoice";
  choose: number;
  from: string[];
  excluding?: string[];
}

export interface ResolvedFeatureDto {
  sourceKey: string;
  labelKey: string;
  /** Ya en español — lo pone el catálogo (`FeatureGrant.name`), no se traduce aquí. */
  name: string;
}

export interface SpellSlotDto {
  spellLevel: number;
  slots: number;
}

/** La hoja calculada (`CharacterSheet` en `apps/api/src/rules/catalog/index.ts`). */
export interface CalculatedSheet {
  derived: Record<string, DerivedValue>;
  warnings: DerivationWarning[];
  pendingChoices: PendingChoiceDto[];
  features: ResolvedFeatureDto[];
  speeds: Partial<Record<"walk" | "climb" | "swim" | "fly" | "burrow", number>>;
  raceKey: string;
  subraceKey?: string;
  classKey: string;
  attacksPerAction: number;
  spellSlots: SpellSlotDto[];
  spellSlotResetOn: "SHORT_REST" | "LONG_REST" | "NONE";
}

/** `AttackDamage` de `apps/api/src/rules/attacks.ts`, calcada a mano — mismo motivo que arriba. */
export interface AttackDamageDto {
  expression: string;
  dice: string;
  modifier: number;
  type: DamageType;
}

/**
 * Un ataque tal y como lo calcula `buildAttacks` (`apps/api/src/rules/attacks.ts`, carril B3):
 * una fila por arma equipada, con su bono **y su traza**, y la expresión de daño ya montada por
 * el servidor — la pantalla nunca compone `1d8+3` por su cuenta.
 */
export interface AttackDto {
  key: string;
  name: string;
  ref: string;
  ability: AbilityKey;
  attackBonus: DerivedValue;
  damage: AttackDamageDto;
  /** Solo en un arma versátil: el dado a dos manos. */
  versatileDamage?: AttackDamageDto;
  properties: WeaponProperty[];
  rangeNormalFt?: number;
  rangeLongFt?: number;
  proficient: boolean;
}

/** La bolsa: las cinco monedas del SRD, en piezas enteras. */
export interface MoneyDto {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface HpState {
  current: number | null;
  max: number | null;
  temp: number;
  version: number;
  exceedsMax: boolean;
}

/** La respuesta compartida entre `GET .../sheet` y cada mutación de PG (`character-sheet.service.ts`). */
export interface SheetResponse {
  character: CharacterRow;
  sheet: CalculatedSheet | null;
  reason?: string;
  /**
   * El cuadro de ataques (carril B3). El servidor lo manda siempre —vacío sin armas equipadas o
   * sin hoja—; **opcional en el tipo** para no obligar a los mocks de otras pantallas
   * (`features/sessions`, fuera de esta frontera) a conocer un campo que no usan. La pantalla que
   * sí lo pinta (`AtaquesYLanzamiento.tsx`) cae a la lista vacía si no llega.
   */
  attacks?: AttackDto[];
  /** La bolsa (carril B3). Misma razón que `attacks` para ser opcional en el tipo. */
  money?: MoneyDto;
  hp: HpState;
  deathSaves: DeathState;
  /**
   * Velocidad **ya afectada por las condiciones**, con su traza, por tipo de movimiento.
   *
   * Solo viene en `GET .../sheet`. La primera versión de esta pantalla la calculaba aquí,
   * copiando la función del servidor letra por letra porque no había endpoint; ahora la regla
   * vive una sola vez, donde vive el resto de las reglas.
   */
  effectiveSpeeds?: Record<string, { total: number; steps: DerivedValue["steps"] }>;
  /**
   * La sugerencia de modo de tirada (2.5.5), con sus causas por clave. **Opcional en el tipo por
   * la misma razón que `attacks` y `money`**: los mocks de otras pantallas no tienen por qué
   * conocer un campo que no usan. Quien la pinta cae a «sin sugerencia» si no llega, que es lo
   * mismo que dice el servidor cuando no hay ninguna condición encima.
   */
  rollSuggestions?: RollSuggestions;
  /**
   * Tarea 2.5.1 — **por qué el daño no fue el que se tecleó**.
   *
   * Solo viene en la respuesta de `POST .../hp`, y **solo cuando de verdad se redujo o se
   * agravó algo**: el servidor la omite si el golpe no llevaba tipo, si el personaje no tiene
   * statblock detrás o si su statblock no declara modificadores para ese tipo. Los `steps` son
   * la misma forma que cualquier otra traza de la hoja, así que se pintan con `ListaDeTraza`
   * (`Traza.tsx`) en vez de con una lista propia.
   *
   * `notes` es la **prosa que limita la regla** («de ataques no mágicos»), copiada del
   * statblock: el servidor no la interpreta, la enseña.
   */
  damageTrace?: { total: number; steps: TraceStep[]; notes: string[] };

  /**
   * **El golpe ha pedido una salvación de concentración**, y el servidor ya la ha creado como
   * petición de tirada (`character-sheet.service.ts:1046`): `requestId` es esa petición y `dc`
   * la CD que salió del daño (mitad del daño, mínimo 10).
   *
   * Llega solo cuando de verdad ocurre: daño positivo, no masivo, el personaje seguía en pie y
   * estaba concentrado. **Hasta el 2026-09-04 no lo leía ninguna pantalla**, así que quien
   * aplicaba el golpe no se enteraba de que acababa de pedir una tirada — el jugador la veía
   * aparecer en su bandeja y el DM no sabía por qué. Es la ficha del §8 de la auditoría.
   */
  concentrationSave?: { requestId: string; dc: number };
}

// --- Anulaciones manuales (solo DM; el servidor lo impone) ---

export function setOverride(
  campaignId: string,
  characterId: string,
  target: string,
  value: number,
  reason?: string,
): Promise<SheetResponse> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/overrides/${target}`, {
    method: "PUT",
    body: JSON.stringify({ value, reason }),
  });
}

export function clearOverride(
  campaignId: string,
  characterId: string,
  target: string,
): Promise<SheetResponse> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/overrides/${target}`, {
    method: "DELETE",
    // Mismo motivo que en `removeCondition`: `apiFetch` siempre manda Content-Type JSON y
    // Fastify rechaza esa cabecera con el cuerpo vacío de verdad.
    body: JSON.stringify({}),
  });
}

// --- Catálogo SRD (para los selectores; el servidor sigue validando) ---

export interface CatalogRace {
  key: string;
  name: string;
  subraces: { key: string; name: string }[];
}

export interface Catalog {
  races: CatalogRace[];
  classes: { key: string; name: string; hitDie: number }[];
  armor: { key: string; name: string; category: string }[];
}

export function fetchCatalog(): Promise<Catalog> {
  return apiFetch<Catalog>("/catalog");
}

export function fetchSheet(campaignId: string, characterId: string): Promise<SheetResponse> {
  return apiFetch<SheetResponse>(`/campaigns/${campaignId}/characters/${characterId}/sheet`);
}

export function updateSheet(
  campaignId: string,
  characterId: string,
  input: UpdateCharacterSheetInput,
): Promise<SheetResponse> {
  return apiFetch<SheetResponse>(`/campaigns/${campaignId}/characters/${characterId}/sheet`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changeHp(
  campaignId: string,
  characterId: string,
  input: ChangeHpInput,
): Promise<SheetResponse> {
  return apiFetch<SheetResponse>(`/campaigns/${campaignId}/characters/${characterId}/hp`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setHp(
  campaignId: string,
  characterId: string,
  input: SetHpInput,
): Promise<SheetResponse> {
  return apiFetch<SheetResponse>(`/campaigns/${campaignId}/characters/${characterId}/hp`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function rollDeathSave(
  campaignId: string,
  characterId: string,
  input: DeathSaveInput = {},
): Promise<SheetResponse & { deathSaves: DeathState }> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/death-saves`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Las tiradas recientes, para atar un daño a la suya (2.5.4) ---

/** Una tirada del registro, reducida a lo que hace falta para elegirla en un desplegable. */
export interface TiradaCitable {
  /** El `id` del `GameEvent`, que es lo que `changeHp` espera en `rollEventId`. */
  id: string;
  expression: string;
  total: number;
  createdAt: string;
  natural?: "TWENTY" | "ONE";
}

/**
 * Las últimas tiradas de la campaña, para responder «¿de qué tirada sale este daño?».
 *
 * **Duplica cinco líneas de `features/rolls/api.ts` a sabiendas**, por el mismo motivo que ya
 * está escrito arriba para `createRoll`: la hoja no depende de la pantalla de dados ni al revés,
 * y la forma de los datos sigue viviendo una sola vez en `@dnd/shared`.
 *
 * **El servidor ya filtró por `canView`**: una tirada a ciegas del DM no viaja, y por eso no se
 * puede citar. Es correcto — citar lo que no puedes ver sería filtrarlo por el registro.
 */
export async function fetchTiradasCitables(campaignId: string): Promise<TiradaCitable[]> {
  const pagina = await apiFetch<{
    events: {
      id: string;
      createdAt: string;
      payload: { type: string; expression?: string; total?: number; natural?: "TWENTY" | "ONE" };
    }[];
  }>(`/campaigns/${campaignId}/rolls?limit=20`);
  return (
    pagina.events
      // `changeHp` solo acepta `ABILITY_ROLL` y `DEATH_SAVE` (`character-sheet.service.ts`), y una
      // salvación de muerte no es de lo que sale un daño: ofrecer lo demás sería ofrecer un 400.
      .filter((e) => e.payload.type === "ABILITY_ROLL")
      .map((e) => ({
        id: e.id,
        expression: e.payload.expression ?? "",
        total: e.payload.total ?? 0,
        createdAt: e.createdAt,
        ...(e.payload.natural ? { natural: e.payload.natural } : {}),
      }))
  );
}

// --- Recursos (2A.8) ---

export interface ResourceRow {
  id: string;
  characterId: string;
  key: string;
  label: string;
  current: number;
  max: number | null;
  resetOn: "NONE" | "SHORT_REST" | "LONG_REST";
  grantedBy: "DM_ONLY" | "OWNER";
}

export function fetchResources(campaignId: string, characterId: string): Promise<ResourceRow[]> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/resources`);
}

export function spendResource(
  campaignId: string,
  characterId: string,
  key: string,
  amount: number,
  reason?: string,
): Promise<ResourceRow> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/resources/${key}/spend`, {
    method: "POST",
    body: JSON.stringify({ amount, reason }),
  });
}

export function restoreResource(
  campaignId: string,
  characterId: string,
  key: string,
  amount: number,
  reason?: string,
): Promise<ResourceRow> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/resources/${key}/restore`, {
    method: "POST",
    body: JSON.stringify({ amount, reason }),
  });
}

// --- Descansos (2A.8) ---

/**
 * Declarar un descanso.
 *
 * **`interrupted` lo arbitra el DM, y hasta 2026-09-04 esta función ni siquiera lo dejaba
 * mandar**: el campo existía en `declareRestSchema` y en el servicio, y ninguna pantalla podía
 * llegar a él. El SRD 5.1 dice que una hora de actividad agotadora obliga a empezar el descanso
 * otra vez (<https://5thsrd.org/adventuring/resting/>), y la máquina no puede saber que os
 * atacaron a la tercera hora: lo dice quien arbitra.
 */
export function declareRest(
  campaignId: string,
  characterId: string,
  input: DeclareRestInput,
): Promise<CharacterRow> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/rest`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Condiciones (2A.12) ---

export interface ConditionRow {
  id: string;
  characterId: string;
  key: string;
  level: number | null;
  note: string | null;
  appliedById: string;
  createdAt: string;
  /**
   * Segundos del reloj de la campaña en que vence, o `null` si es indefinida (2C.4). El
   * servidor lo calcula **al aplicarla**, sumando la duración al reloj de ese momento.
   */
  expiresAtClock?: number | null;
  /**
   * **Derivado en el servidor**, nunca aquí: `expired` es una resta contra el reloj de la
   * campaña que `ConditionsService.list` hace al leer. La pantalla no vuelve a calcularlo —si
   * lo hiciera habría dos verdades y una acabaría discrepando—; solo lo pinta.
   *
   * Opcional en el tipo porque otras pantallas fuera de esta feature
   * (`features/sessions/MesaDeSesion.tsx`) construyen filas sin él en sus pruebas.
   */
  expired?: boolean;
}

/** El reloj de la campaña (`GET /campaigns/:id/clock`), en **segundos de juego**. */
export interface ClockStateDto {
  seconds: number;
}

export function fetchClock(campaignId: string): Promise<ClockStateDto> {
  return apiFetch(`/campaigns/${campaignId}/clock`);
}

export function fetchConditions(campaignId: string, characterId: string): Promise<ConditionRow[]> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/conditions`);
}

/**
 * `durationSeconds` son **segundos de juego** y solo viaja si la condición tiene duración: una
 * condición indefinida **no manda el campo**, que es lo que el esquema compartido espera
 * (`applyConditionSchema`, opcional) y lo que deja la caducidad en `null` en la base.
 */
export function applyCondition(
  campaignId: string,
  characterId: string,
  key: string,
  level?: number,
  note?: string,
  durationSeconds?: number,
): Promise<ConditionRow> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/conditions/${key}`, {
    method: "PUT",
    body: JSON.stringify({ level, note, durationSeconds }),
  });
}

export function removeCondition(
  campaignId: string,
  characterId: string,
  key: string,
): Promise<{ deleted: boolean }> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/conditions/${key}`, {
    method: "DELETE",
    // apiFetch siempre manda Content-Type: application/json; Fastify rechaza esa cabecera con
    // un cuerpo de verdad vacío (mismo comentario en features/entities/api.ts).
    body: JSON.stringify({}),
  });
}

// --- Tiradas (2A.13) ---

export function createRoll(campaignId: string, input: CreateRollInput): Promise<RollResult> {
  return apiFetch(`/campaigns/${campaignId}/rolls`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Tirar con un arma equipada (carril B3, fase 2B/2C) ---

/**
 * Tira con un arma del cuadro de ataques. **La expresión la compone el servidor**
 * (`character-sheet.service.ts`): esta pantalla solo dice qué ataque, qué mitad —`ATTACK` o
 * `DAMAGE`— y, si aplica, con qué mano y si es crítico. Mandar la expresión ya montada es
 * exactamente lo que `RollAttackInput` no tiene campo para hacer.
 */
export function rollAttack(
  campaignId: string,
  characterId: string,
  attackKey: string,
  input: RollAttackInput,
): Promise<RollResult> {
  return apiFetch(
    `/campaigns/${campaignId}/characters/${characterId}/sheet/attacks/${attackKey}/roll`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
