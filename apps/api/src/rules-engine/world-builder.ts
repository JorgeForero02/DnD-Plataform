import type { RuleTrigger } from "@dnd/shared";
import type { PrismaService } from "../prisma/prisma.service";
import type { EngineRule, WorldSnapshot } from "./engine";

// Arma la fotografía que el núcleo necesita, leyendo de Postgres una sola vez. El núcleo nunca
// vuelve a preguntarle nada a la base de datos — todo lo que puede necesitar una condición o un
// efecto está ya aquí.

/** Los identificadores de ficha que puede necesitar una tanda de reglas: los que fijan sus
 * disparadores y sus efectos, más el sujeto del suceso de entrada. Ni uno más — nunca se
 * consulta "toda ficha con la etiqueta X" (regla de autoridad #3). */
function collectEntityIds(rules: EngineRule[], incomingEvent: RuleTrigger): Set<string> {
  const ids = new Set<string>();
  if ("entityId" in incomingEvent) ids.add(incomingEvent.entityId);
  for (const rule of rules) {
    if ("entityId" in rule.trigger) ids.add(rule.trigger.entityId);
    for (const effect of rule.effects) {
      if (effect.kind === "REVEAL_ENTITY" || effect.kind === "HIDE_ENTITY") {
        ids.add(effect.entityId);
      }
    }
  }
  return ids;
}

export async function buildWorldSnapshot(
  prisma: PrismaService,
  campaignId: string,
  rules: EngineRule[],
  incomingEvent: RuleTrigger,
  rulesEnabled: boolean,
  ruleFireCounts: Record<string, number>,
): Promise<WorldSnapshot> {
  const entityIds = [...collectEntityIds(rules, incomingEvent)];

  const [flagRows, setRows, entityRows, revealedRows, sessionsStarted] = await Promise.all([
    prisma.campaignFlag.findMany({ where: { campaignId } }),
    prisma.campaignSet.findMany({ where: { campaignId }, include: { members: true } }),
    entityIds.length
      ? prisma.entity.findMany({
          where: { id: { in: entityIds }, campaignId },
          select: { id: true, tags: true, visibility: true },
        })
      : Promise.resolve([]),
    // El origen real de "qué se ha revelado" es la columna `subjectId` de un `GameEvent` ya
    // escrito — nunca se filtra dentro de un `payload` (regla de `04-convenciones.md`).
    prisma.gameEvent.findMany({
      where: { campaignId, type: "ENTITY_REVEALED" },
      select: { subjectId: true },
      distinct: ["subjectId"],
    }),
    prisma.gameEvent.count({ where: { campaignId, type: "SESSION_STARTED" } }),
  ]);

  const flags: WorldSnapshot["flags"] = {};
  for (const row of flagRows) flags[row.key] = row.value;

  const sets: WorldSnapshot["sets"] = {};
  for (const set of setRows) {
    sets[set.key] = set.members.map((m) => ({ memberType: m.memberType, memberId: m.memberId }));
  }

  const entityTags: WorldSnapshot["entityTags"] = {};
  const entityExists: WorldSnapshot["entityExists"] = {};
  const entityVisibility: WorldSnapshot["entityVisibility"] = {};
  const foundIds = new Set(entityRows.map((e) => e.id));
  for (const id of entityIds) entityExists[id] = foundIds.has(id);
  for (const row of entityRows) {
    entityTags[row.id] = row.tags;
    entityVisibility[row.id] = row.visibility;
  }

  return {
    rulesEnabled,
    // Sin seguimiento de asistencia todavía (hueco declarado: no hay tabla de presencia por
    // sesión), así que hoy nunca se cumple — se enseña en la regla, no se inventa un dato.
    allPlayersPresent: false,
    sessionNumber: sessionsStarted > 0 ? sessionsStarted : null,
    flags,
    sets,
    entityTags,
    entityExists,
    entityVisibility,
    revealedEntityIds: revealedRows.map((r) => r.subjectId),
    sessionNotes: [],
    ruleArmed: {},
    ruleFireCounts,
  };
}
