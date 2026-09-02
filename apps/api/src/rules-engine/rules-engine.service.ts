import { randomUUID } from "crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Rule } from "@prisma/client";
import {
  ruleConditionSchema,
  ruleEffectSchema,
  ruleTriggerSchema,
  type CreateRuleInput,
  type DryRunRuleInput,
  type ResolveProposalInput,
  type RuleTrigger,
  type UpdateRuleInput,
} from "@dnd/shared";
import { z } from "zod";
import { MembershipService } from "../campaigns/membership.service";
import { canView, type Viewer } from "../common/visibility";
import { GameEventsService } from "../game-events/game-events.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  runEngine,
  type EffectApplication,
  type EngineRule,
  type EvaluationOutcome,
} from "./engine";
import {
  isTriggerReachableToday,
  parseTraceEffectsPayload,
  toEffectApplications,
  type PersistedEffectRecord,
  type TraceEffectsPayload,
} from "./trace-payload";
import { buildWorldSnapshot } from "./world-builder";

// Tarea 2A.16 — el servicio. Es la única capa que toca Postgres: lee las reglas y el mundo,
// llama al núcleo puro, y traduce su decisión en escrituras reales — entidad por entidad, con
// la autoridad del DM que armó la regla (`rule.createdById`), nunca con la del jugador que la
// disparó (regla de autoridad #2). `evaluate()` queda exportado para que el módulo de eventos
// lo llame cuando le toque: esta carpeta no engancha nada por su cuenta.

@Injectable()
export class RulesEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly gameEvents: GameEventsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------------------------------
  // CRUD — solo DM
  // ------------------------------------------------------------------------------------------

  async create(dmUserId: string, campaignId: string, input: CreateRuleInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    const rule = await this.prisma.rule.create({
      data: {
        campaignId,
        name: input.name,
        createdById: dmUserId,
        mode: input.mode,
        trigger: input.trigger,
        conditions: input.conditions,
        effects: input.effects,
        maxFires: input.maxFires ?? null,
      },
    });
    return withReachability(rule);
  }

  async list(dmUserId: string, campaignId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    const rows = await this.prisma.rule.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(withReachability);
  }

  async get(dmUserId: string, campaignId: string, ruleId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    const rule = await this.requireRule(campaignId, ruleId);
    return withReachability(rule);
  }

  /** Editar una regla sube su versión — la traza guarda con qué versión se disparó, así que
   * auditar una cascada vieja no depende de que nadie haya vuelto a tocar la regla. */
  async update(dmUserId: string, campaignId: string, ruleId: string, input: UpdateRuleInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    await this.requireRule(campaignId, ruleId);
    const data: Record<string, unknown> = { version: { increment: 1 } };
    if (input.name !== undefined) data.name = input.name;
    if (input.trigger !== undefined) data.trigger = input.trigger;
    if (input.conditions !== undefined) data.conditions = input.conditions;
    if (input.effects !== undefined) data.effects = input.effects;
    if (input.mode !== undefined) data.mode = input.mode;
    if (input.maxFires !== undefined) data.maxFires = input.maxFires;
    if (input.status !== undefined) {
      data.status = input.status;
      // Salir de BROKEN a mano borra el motivo: quien la reactiva ha decidido que ya no aplica.
      if (input.status !== "BROKEN") data.brokenReason = null;
    }
    const rule = await this.prisma.rule.update({ where: { id: ruleId }, data });
    return withReachability(rule);
  }

  async remove(dmUserId: string, campaignId: string, ruleId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    await this.requireRule(campaignId, ruleId);
    await this.prisma.rule.delete({ where: { id: ruleId } });
    // Revocación sin ventana residual (punto 6 de la autoridad): al borrarse la fila, no hay
    // ejecución en curso que pueda seguir corriendo con esta regla — cada evaluación relee
    // Postgres desde cero.
    return { deleted: true };
  }

  private async requireRule(campaignId: string, ruleId: string): Promise<Rule> {
    const rule = await this.prisma.rule.findFirst({ where: { id: ruleId, campaignId } });
    if (!rule) throw new NotFoundException("Regla no encontrada");
    return rule;
  }

  // Duplicado a sabiendas con el de los otros servicios (`GameEventsService`,
  // `NotificationsService`): la deuda de extraer `viewerFor` a `common/` ya está declarada en
  // `docs/06-pendientes.md` y no es de esta tarea resolverla de tapadillo.
  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  /**
   * Punto 5 de la autoridad: por cada efecto que cambia una visibilidad, comprueba si el
   * jugador que disparó la regla podría ver el resultado por `canView` — y lo deja escrito,
   * resultado incluido. Los demás efectos no tocan la matriz de visibilidad y lo dicen
   * explícitamente (`applicable: false`) en vez de dejar el campo ambiguo.
   */
  private async auditEffectsWithCanView(
    campaignId: string,
    triggeredByUserId: string,
    applications: EffectApplication[],
  ): Promise<PersistedEffectRecord[]> {
    const targets = applications
      .map((a) =>
        a.effect.kind === "REVEAL_ENTITY" || a.effect.kind === "HIDE_ENTITY"
          ? a.effect.entityId
          : undefined,
      )
      .filter((id): id is string => id !== undefined);

    if (targets.length === 0) {
      return applications.map((a) => ({ ...a, canView: { applicable: false } }));
    }

    const viewer = await this.viewerFor(triggeredByUserId, campaignId);
    const entities = await this.prisma.entity.findMany({
      where: { id: { in: targets }, campaignId },
      include: { grants: true },
    });
    const entityById = new Map(entities.map((e) => [e.id, e]));

    return applications.map((a) => {
      if (a.effect.kind !== "REVEAL_ENTITY" && a.effect.kind !== "HIDE_ENTITY") {
        return { ...a, canView: { applicable: false } };
      }
      const entity = entityById.get(a.effect.entityId);
      const result = entity
        ? canView(viewer, {
            visibility: a.effect.visibility,
            createdById: entity.createdById,
            grantedUserIds: entity.grants.map((g) => g.userId),
          })
        : false;
      return {
        ...a,
        canView: { applicable: true, checkedUserId: triggeredByUserId, role: viewer.role, result },
      };
    });
  }

  // ------------------------------------------------------------------------------------------
  // Ensayo en seco — dice qué haría, no hace nada
  // ------------------------------------------------------------------------------------------

  async dryRun(dmUserId: string, campaignId: string, ruleId: string, input: DryRunRuleInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    await this.requireRule(campaignId, ruleId); // 404 si no es de esta campaña

    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    const rows = await this.prisma.rule.findMany({ where: { campaignId } });
    const engineRules = rows.map(toEngineRule);
    const fireCounts = Object.fromEntries(rows.map((r) => [r.id, r.fireCount]));

    // El ensayo simula contra TODAS las reglas armadas de la campaña, no solo la elegida: un
    // conflicto o un encadenamiento solo tienen sentido con el resto del vecindario delante.
    const world = await buildWorldSnapshot(
      this.prisma,
      campaignId,
      engineRules,
      input.trigger,
      campaign.rulesEnabled,
      fireCounts,
    );

    // Nada de lo que devuelve se persiste: ni traza, ni disparo, ni escritura real. Es
    // exactamente la misma decisión que tomaría `evaluate()`, congelada antes del último paso.
    const outcome = runEngine(engineRules, input.trigger, world);
    return {
      ...outcome,
      // No se finge que un disparador sin `GameEventType` correspondiente va a llegar nunca:
      // el ensayo dice qué pasaría **si** el suceso ocurriera, y aquí dice si hoy puede ocurrir.
      triggerReachableToday: isTriggerReachableToday(input.trigger.kind),
    };
  }

  // ------------------------------------------------------------------------------------------
  // La traza — paginada, filtrada por canView
  // ------------------------------------------------------------------------------------------

  async listTraces(userId: string, campaignId: string, query: { limit: number; cursor?: string }) {
    const viewer = await this.membership.requireMember(campaignId, userId);
    const rows = await this.prisma.ruleTrace.findMany({
      where: { campaignId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    if (viewer.role === "DM") {
      return {
        traces: rows,
        nextCursor: rows.length === query.limit ? rows[rows.length - 1].id : null,
      };
    }

    // Un jugador solo ve la traza de lo que él mismo podría ver — nunca la mecánica en bruto de
    // reglas que ni siquiera sabe que existen. Se resuelve la visibilidad efectiva de cada
    // traza a partir de sus efectos, con la misma matriz de siempre (`canView`).
    const visible = await this.filterTracesForPlayer(campaignId, userId, rows);
    return {
      traces: visible,
      nextCursor: rows.length === query.limit ? rows[rows.length - 1].id : null,
    };
  }

  private async filterTracesForPlayer(
    campaignId: string,
    userId: string,
    rows: Array<{ id: string; effects: unknown; [k: string]: unknown }>,
  ) {
    const revealTargets = new Set<string>();
    for (const row of rows) {
      for (const rec of parseTraceEffectsPayload(row.effects).effects) {
        if (rec.effect.kind === "REVEAL_ENTITY" || rec.effect.kind === "HIDE_ENTITY") {
          revealTargets.add(rec.effect.entityId);
        }
      }
    }
    const entities =
      revealTargets.size > 0
        ? await this.prisma.entity.findMany({
            where: { id: { in: [...revealTargets] }, campaignId },
            include: { grants: true },
          })
        : [];
    const entityById = new Map(entities.map((e) => [e.id, e]));

    const out: typeof rows = [];
    for (const row of rows) {
      const recs = parseTraceEffectsPayload(row.effects).effects;
      const entityEffect = recs.find(
        (r) => r.effect.kind === "REVEAL_ENTITY" || r.effect.kind === "HIDE_ENTITY",
      );
      if (entityEffect) {
        const entityId = (entityEffect.effect as { entityId: string }).entityId;
        const entity = entityById.get(entityId);
        // La ficha se borró desde entonces: se trata como DM_ONLY (deniega) en vez de enseñarla
        // por defecto — fallar cerrado, nunca abierto.
        const visible = entity
          ? canView(
              { userId, role: "PLAYER", isAdmin: false },
              {
                visibility: entity.visibility,
                createdById: entity.createdById,
                grantedUserIds: entity.grants.map((g) => g.userId),
              },
            )
          : false;
        if (visible) out.push(row);
        continue;
      }
      const worldEffect = recs.find(
        (r) => r.effect.kind === "SET_FLAG" || r.effect.kind === "CHANGE_SET_MEMBER",
      );
      if (worldEffect) {
        out.push(row); // convención ya establecida por `WorldStateService`: visibilidad PLAYERS
        continue;
      }
      // El resto (señales, avisos, notas de sesión, armar/desarmar reglas, y los cortes sin
      // efecto — STOPPED/CONFLICT) son mecánica de mesa: DM_ONLY, como `raiseSignal`.
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------
  // La bandeja de propuestas — solo DM
  // ------------------------------------------------------------------------------------------

  async listProposals(dmUserId: string, campaignId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    return this.prisma.ruleTrace.findMany({
      where: { campaignId, status: "PROPOSED" },
      orderBy: { createdAt: "desc" },
    });
  }

  async resolveProposal(
    dmUserId: string,
    campaignId: string,
    traceId: string,
    input: ResolveProposalInput,
  ) {
    await this.membership.requireDM(campaignId, dmUserId);
    const trace = await this.prisma.ruleTrace.findFirst({ where: { id: traceId, campaignId } });
    if (!trace) throw new NotFoundException("Traza no encontrada");
    if (trace.status !== "PROPOSED") {
      throw new ForbiddenException("Esta propuesta ya se resolvió");
    }

    if (input.action === "REJECT") {
      return this.prisma.ruleTrace.update({
        where: { id: traceId },
        data: { status: "REJECTED", reason: input.reason ?? trace.reason },
      });
    }

    // APLICAR: exactamente los efectos que ya se calcularon al proponer — nada se recalcula
    // contra un mundo que pudo haber cambiado mientras tanto. Es la ficha 2.8: la batuta marcó,
    // y ahora el DM da la señal.
    const applications = toEffectApplications(parseTraceEffectsPayload(trace.effects));
    await this.applyRealEffects(campaignId, trace.delegatedByUserId, applications);
    return this.prisma.ruleTrace.update({
      where: { id: traceId },
      data: { status: "APPLIED", reason: input.reason ?? trace.reason },
    });
  }

  // ------------------------------------------------------------------------------------------
  // evaluate() — lo llamará `game-events` cuando le toque. Exportado, no enganchado.
  // ------------------------------------------------------------------------------------------

  /**
   * Evalúa un suceso (y su posible cascada) contra las reglas de una campaña, y aplica de
   * verdad lo que el núcleo decida que se aplique. Nunca se llama a sí mismo recursivamente
   * para la cascada — el núcleo la resuelve entera en una sola pasada sobre el mundo inyectado;
   * aquí solo se traduce el resultado a escrituras reales, en el mismo orden que produjo.
   */
  async evaluate(
    campaignId: string,
    event: RuleTrigger,
    triggeredByUserId: string,
  ): Promise<EvaluationOutcome> {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    const rows = await this.prisma.rule.findMany({ where: { campaignId } });
    const engineRules = rows.map(toEngineRule);
    const ruleById = new Map(rows.map((r) => [r.id, r]));
    const fireCounts = Object.fromEntries(rows.map((r) => [r.id, r.fireCount]));

    const world = await buildWorldSnapshot(
      this.prisma,
      campaignId,
      engineRules,
      event,
      campaign.rulesEnabled,
      fireCounts,
    );

    const outcome = runEngine(engineRules, event, world);
    const chainId = randomUUID();

    for (const trace of outcome.traces) {
      const rule = trace.ruleId ? ruleById.get(trace.ruleId) : undefined;
      const delegatedByUserId = rule?.createdById ?? triggeredByUserId;

      if (trace.status === "APPLIED" && trace.effects) {
        await this.applyRealEffects(campaignId, delegatedByUserId, trace.effects);
      }
      if (trace.status === "PROPOSED" && rule) {
        // La batuta marca, no toca (§2.8): se avisa al DM y no se hace nada más.
        await this.notifications.notify(rule.createdById, {
          type: "RULE_PROPOSAL",
          campaignId,
          payload: { ruleId: rule.id, ruleName: rule.name },
          subjectType: "rule",
          subjectId: rule.id,
        });
      }

      if (trace.status === "CONFLICT" && trace.conflictingRuleIds) {
        // `RuleTrace.ruleId` es una clave foránea obligatoria y un conflicto no tiene UNA
        // regla: se escribe una fila por cada regla empatada, todas con el mismo `chainId` y
        // el mismo motivo, para que auditar cualquiera de las dos lleve a las demás.
        for (const conflictingId of trace.conflictingRuleIds) {
          const conflictingRule = ruleById.get(conflictingId);
          const payload: TraceEffectsPayload = {
            conditions: trace.conflictingConditions?.[conflictingId] ?? [],
            effects: [],
          };
          await this.prisma.ruleTrace.create({
            data: {
              campaignId,
              ruleId: conflictingId,
              ruleVersion: conflictingRule?.version ?? 0,
              triggeredByUserId,
              delegatedByUserId: conflictingRule?.createdById ?? triggeredByUserId,
              depth: trace.depth,
              chainId,
              status: "CONFLICT",
              effects: payload as unknown as object,
              reason: trace.reason ?? null,
            },
          });
        }
        continue;
      }

      if (!trace.ruleId) {
        // El único corte sin regla alguna que producir: el interruptor general de campaña
        // apagado, antes de evaluar nada. No hay fila que escribir en una tabla cuya clave
        // foránea a `Rule` es obligatoria — el propio `campaign.rulesEnabled` en falso ya es
        // la explicación, y `evaluate()` la devuelve igualmente en `outcome.traces`.
        continue;
      }

      // Punto 5 de la autoridad: la traza no solo dice qué efecto se aplicó, dice si esa
      // escritura pasó por `canView` y qué contestó — para el jugador que la disparó.
      const persistedEffects = await this.auditEffectsWithCanView(
        campaignId,
        triggeredByUserId,
        trace.effects ?? [],
      );
      const payload: TraceEffectsPayload = {
        conditions: trace.conditions ?? [],
        effects: persistedEffects,
      };

      await this.prisma.ruleTrace.create({
        data: {
          campaignId,
          ruleId: trace.ruleId,
          ruleVersion: trace.ruleVersion ?? rule?.version ?? 0,
          triggeredByUserId,
          delegatedByUserId,
          depth: trace.depth,
          chainId,
          status: trace.status,
          effects: payload as unknown as object,
          reason: trace.reason ?? null,
        },
      });
    }

    for (const broken of outcome.brokenRules) {
      await this.prisma.rule.update({
        where: { id: broken.ruleId },
        data: { status: "BROKEN", brokenReason: broken.reason },
      });
    }

    for (const [ruleId, delta] of Object.entries(outcome.fireCountDeltas)) {
      await this.prisma.rule.update({
        where: { id: ruleId },
        data: { fireCount: { increment: delta }, lastFiredAt: new Date() },
      });
    }

    return outcome;
  }

  /** Traduce las decisiones puras del núcleo en escrituras reales — con la autoridad del DM
   * que armó la regla (regla de autoridad #2), nunca con la del jugador que la disparó. */
  private async applyRealEffects(
    campaignId: string,
    delegatedByUserId: string,
    applications: EffectApplication[],
  ) {
    for (const app of applications) {
      const { effect } = app;
      switch (effect.kind) {
        case "REVEAL_ENTITY":
        case "HIDE_ENTITY": {
          if (app.before === app.after) break; // idempotente: sin cambio real, sin ruido en el log
          await this.prisma.entity.updateMany({
            where: { id: effect.entityId, campaignId },
            data: { visibility: effect.visibility },
          });
          if (effect.kind === "REVEAL_ENTITY") {
            await this.gameEvents.recordFromEngine(delegatedByUserId, campaignId, {
              subjectType: "campaign",
              subjectId: effect.entityId,
              visibility: effect.visibility,
              payload: { type: "ENTITY_REVEALED" },
            });
          }
          break;
        }
        case "SET_FLAG": {
          if (app.before === app.after) break;
          await this.prisma.campaignFlag.upsert({
            where: { campaignId_key: { campaignId, key: effect.key } },
            create: {
              campaignId,
              key: effect.key,
              value: effect.value,
              setById: delegatedByUserId,
            },
            update: { value: effect.value, setById: delegatedByUserId },
          });
          await this.gameEvents.recordFromEngine(delegatedByUserId, campaignId, {
            subjectType: "campaign",
            subjectId: campaignId,
            visibility: "PLAYERS",
            payload: { type: "FLAG_SET", key: effect.key, value: effect.value },
          });
          break;
        }
        case "CHANGE_SET_MEMBER": {
          const set = await this.prisma.campaignSet.upsert({
            where: { campaignId_key: { campaignId, key: effect.setKey } },
            create: { campaignId, key: effect.setKey, label: effect.setKey },
            update: {},
          });
          if (effect.action === "ADD") {
            await this.prisma.campaignSetMember.upsert({
              where: {
                setId_memberType_memberId: {
                  setId: set.id,
                  memberType: effect.memberType,
                  memberId: effect.memberId,
                },
              },
              create: {
                setId: set.id,
                memberType: effect.memberType,
                memberId: effect.memberId,
                addedById: delegatedByUserId,
              },
              update: {},
            });
          } else {
            await this.prisma.campaignSetMember.deleteMany({
              where: { setId: set.id, memberType: effect.memberType, memberId: effect.memberId },
            });
          }
          await this.gameEvents.recordFromEngine(delegatedByUserId, campaignId, {
            subjectType: "campaign",
            subjectId: campaignId,
            visibility: "PLAYERS",
            payload: {
              type: "SET_CHANGED",
              setKey: effect.setKey,
              action: effect.action === "ADD" ? "ADDED" : "REMOVED",
              memberType: effect.memberType,
              memberId: effect.memberId,
            },
          });
          break;
        }
        case "RAISE_SIGNAL": {
          await this.gameEvents.recordFromEngine(delegatedByUserId, campaignId, {
            subjectType: "campaign",
            subjectId: campaignId,
            visibility: "DM_ONLY",
            payload: { type: "SIGNAL_RAISED", key: effect.key },
          });
          break;
        }
        case "ADD_SESSION_NOTE": {
          const session = await this.prisma.session.findFirst({
            where: { campaignId, status: "IN_PROGRESS" },
          });
          if (!session) break; // sin sesión en curso no hay dónde anotar; no es un error
          const notes = Array.isArray(session.notes) ? (session.notes as string[]) : [];
          if (!notes.includes(effect.note)) {
            await this.prisma.session.update({
              where: { id: session.id },
              data: { notes: [...notes, effect.note] },
            });
          }
          break;
        }
        case "SET_RULE_ARMED": {
          const target = await this.prisma.rule.findFirst({
            where: { id: effect.ruleId, campaignId },
          });
          if (!target) break; // apunta a una regla que no es de esta campaña: no se hace nada
          await this.prisma.rule.update({
            where: { id: effect.ruleId },
            data: { status: effect.armed ? "ARMED" : "DISARMED" },
          });
          break;
        }
        case "NOTIFY": {
          // Sin `NotificationType` que le corresponda en el vocabulario cerrado de
          // `@dnd/shared` (fuera de esta frontera de tarea): queda completo en la traza —
          // antes, después y mensaje — pero hoy no llega a la bandeja de notificaciones.
          break;
        }
      }
    }
  }
}

/** Interpreta la fila de Prisma (con `trigger`/`conditions`/`effects` como `Json`) como la
 * regla tipada que el núcleo necesita. Vuelve a pasar por Zod aunque ya se validó al escribir:
 * un `Json` en la base no se consulta nunca por dentro sin pasar antes por su esquema. */
function toEngineRule(row: Rule): EngineRule {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    createdById: row.createdById,
    mode: row.mode,
    status: row.status,
    trigger: ruleTriggerSchema.parse(row.trigger),
    conditions: z.array(ruleConditionSchema).parse(row.conditions),
    effects: z.array(ruleEffectSchema).parse(row.effects),
    maxFires: row.maxFires,
  };
}

/** Añade a la fila de `Rule` si su disparador es alcanzable hoy — sin persistirlo: se calcula
 * en cada lectura a partir del propio `trigger`, así que nunca puede quedar desactualizado. */
function withReachability(rule: Rule): Rule & { triggerReachableToday: boolean } {
  const trigger = ruleTriggerSchema.safeParse(rule.trigger);
  return {
    ...rule,
    triggerReachableToday: trigger.success ? isTriggerReachableToday(trigger.data.kind) : true,
  };
}
