import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { GameEventsService } from "../../src/game-events/game-events.service";

/**
 * **Puente temporal hasta la tarea 3** (`docs/06-pendientes.md`, «PREPARING sin puerta de
 * salida»). Responder una petición de iniciativa —escribir el número real en el combatiente y,
 * al cerrarse la última, subir el encuentro de `PREPARING` a `ACTIVE`— es la tarea siguiente del
 * plan de 2026-09-05, y todavía no existe.
 *
 * Un e2e que necesita un combate de verdad `ACTIVE` para probar algo que **no** es el reparto por
 * dueño (pasar turno, terminar el combate, que caduque una condición, comparar un ataque) llama
 * aquí. Es **una sola función**, no un puente distinto copiado en cada fichero, y **nunca es un
 * no-op silencioso**: si se llama sobre un encuentro que ya nació `ACTIVE` —nadie ajeno dentro—,
 * `pendientes.length` es cero y la aserción de abajo lo delata como un error de montaje del
 * escenario, no como «no hacía falta».
 *
 * Se borra entera —y sus llamadas, por el flujo real de responder la petición— en cuanto la
 * tarea 3 exista.
 */
export async function resolverPreparingAMano(params: {
  app: NestFastifyApplication;
  prisma: PrismaService;
  tokenDM: string;
  dmUserId: string;
  campaignId: string;
  sessionId: string;
  encUrl: (suffix?: string) => string;
  encounterId: string;
  combatants: { id: string; characterId: string }[];
}): Promise<void> {
  const { app, prisma, tokenDM, dmUserId, campaignId, sessionId, encUrl, encounterId, combatants } =
    params;

  const pendientes = await prisma.rollRequest.findMany({
    where: { encounterId, resolvedAt: null },
  });
  expect(pendientes.length).toBeGreaterThan(0);

  for (const peticion of pendientes) {
    const combatiente = combatants.find((c) => c.characterId === peticion.characterId);
    const patched = await request(app.getHttpServer())
      .patch(encUrl(`/${encounterId}/combatants/${combatiente!.id}`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ initiative: 10 });
    expect(patched.status).toBe(200);
  }

  await prisma.rollRequest.updateMany({
    where: { id: { in: pendientes.map((p) => p.id) } },
    data: { resolvedAt: new Date() },
  });
  await prisma.encounter.update({ where: { id: encounterId }, data: { status: "ACTIVE" } });

  // **`ENCOUNTER_STARTED` se escribe aquí, no antes.** Desde la ronda de arreglo 1 (2026-09-05),
  // `start()` solo lo escribe si el encuentro nace `ACTIVE` — uno que nace `PREPARING` lo
  // pospone a quien lo termine de arrancar, que es exactamente lo que este puente simula.
  await prisma.transaction((tx) =>
    app.get(GameEventsService).record(
      dmUserId,
      campaignId,
      {
        sessionId,
        subjectType: "encounter",
        subjectId: encounterId,
        visibility: "PLAYERS",
        payload: { type: "ENCOUNTER_STARTED", encounterId },
      },
      tx,
    ),
  );
}
