import { Global, Module } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { EncountersService } from "./encounters.service";
import { TURN_ECONOMY_GATE, type PuertaDeEconomia } from "./gastar-si-en-combate";

/**
 * Task 4b (3A.3) — el puente que evita el ciclo `characters` → `encounters` → `characters`.
 *
 * `EncountersModule` importa `CharactersModule` (por `CharacterSheetService.getInitiativeModifier`,
 * ver `encounters.module.ts`). Si `CharactersModule` importara `EncountersModule` de vuelta —para
 * que `CharacterSheetService.resolveAttack` pudiera gastar la economía del turno—, Nest solo lo
 * resolvería con `forwardRef`, y este proyecto ya declaró que eso es **esconder el ciclo, no
 * quitarlo** (`game-events.service.ts`, sobre el motor de reglas; `members.service.ts`, sobre el
 * mismo problema con `campaigns`).
 *
 * **Primer intento — descartado por un cuelgue real, no por gusto.** La primera versión de este
 * módulo tenía `imports: [EncountersModule]` y `{ provide: TURN_ECONOMY_GATE, useExisting:
 * EncountersService }`. Arrancaba en el resto de la suite, pero `NestFactory.create` colgaba sin
 * lanzar ningún error: un módulo `@Global()` se inyecta implícitamente en TODOS los módulos que
 * Nest descubre —incluido `EncountersModule`—, así que `EncountersModule` acababa "importando" a
 * este módulo global A LA VEZ que este módulo lo importaba a él de forma explícita. Ese ciclo no
 * pasa por el `imports` declarado de ningún fichero —por eso ningún lector lo habría visto—, y
 * Nest no lo detecta como el `forwardRef` que sí sabe resolver: se quedaba esperando para
 * siempre. Se comprobó arrancando la app de verdad (`NestFactory.createApplicationContext`, sin
 * HTTP) con y sin este módulo: sin él, arranca; con la versión de `imports`, cuelga.
 *
 * **La solución: cero `imports`.** El factory de abajo no importa `EncountersModule` en absoluto
 * — pide `ModuleRef` (que SÍ es un proveedor global de framework, sin ciclo posible) y busca
 * `EncountersService` en tiempo de USO, no en tiempo de arranque, con `{ strict: false }` —la
 * búsqueda no local que Nest ofrece para justo este caso: un servicio que vive en otro módulo,
 * sin declarar la arista `imports` que lo convertiría en ciclo. `EncountersService` ya está
 * instanciado de sobra: `AppModule` importa `EncountersModule` directamente.
 *
 * Mismo espíritu que `DiceModule` para `DICE_ROLLER` (`dice.module.ts`): un token `@Global()` que
 * cualquier módulo pide con `@Optional()` sin tener que importar el módulo que lo resuelve de
 * verdad — sólo que aquí ni siquiera este puente lo importa.
 */
@Global()
@Module({
  providers: [
    {
      provide: TURN_ECONOMY_GATE,
      useFactory: (moduleRef: ModuleRef): PuertaDeEconomia => ({
        gastar: (userId, campaignId, sessionId, encounterId, combatantId, input) =>
          moduleRef
            .get(EncountersService, { strict: false })
            .gastar(userId, campaignId, sessionId, encounterId, combatantId, input),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [TURN_ECONOMY_GATE],
})
export class TurnEconomyGateModule {}
