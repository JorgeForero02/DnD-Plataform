import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { triggersDe, type SucesoRegistrado } from "./game-event-triggers";
import { RulesEngineService } from "./rules-engine.service";

/** Lo que `GameEventsService` emite tras escribir. La bandera es la que corta la re-entrada. */
export interface SucesoEmitido extends SucesoRegistrado {
  campaignId: string;
  actorUserId: string;
  fromRulesEngine: boolean;
}

/**
 * El puente entre el log y el motor. **Es una clase aparte a propósito**: el servicio del motor
 * ya hace bastante, y tener el enganche suelto permite probar el enganche sin base de datos y el
 * motor sin emisor.
 *
 * **Por qué escucha en vez de que le llamen.** `GameEventsService` no puede llamar al motor: el
 * motor escribe eventos, así que la llamada directa haría un ciclo entre los dos módulos que
 * Nest solo resuelve con `forwardRef` — esconder el ciclo, no quitarlo.
 */
@Injectable()
export class GameEventBridge {
  private readonly logger = new Logger(GameEventBridge.name);

  constructor(private readonly engine: RulesEngineService) {}

  @OnEvent("game_event.recorded")
  async alRegistrarse(suceso: SucesoEmitido): Promise<void> {
    // **El corte de la re-entrada.** Los efectos del motor escriben eventos; si esos eventos
    // volvieran a entrar aquí, cada uno arrancaría una cascada NUEVA a profundidad 0 y el tope
    // de diez saltos **no lo vería**, porque ese tope cuenta dentro de una cascada, no entre
    // cascadas. El motor ya encadena por dentro (`effect-applier`), así que re-entrar no añade
    // nada y sí puede colgar el proceso.
    if (suceso.fromRulesEngine) return;

    const disparadores = triggersDe(suceso);
    if (disparadores.length === 0) return;

    for (const disparador of disparadores) {
      try {
        await this.engine.evaluate(suceso.campaignId, disparador, suceso.actorUserId);
      } catch (error) {
        // **Una regla rota no puede tumbar lo que la disparó.** El jugador ya perdió sus puntos
        // de golpe y su escritura está confirmada; que el motor falle después es un fallo del
        // motor, y se registra como tal en vez de convertirse en un 500 sobre una operación que
        // sí funcionó. Queda pendiente pintarlo también en la traza (hueco H9).
        this.logger.error(
          `regla fallida al evaluar ${disparador.kind} en la campaña ${suceso.campaignId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
