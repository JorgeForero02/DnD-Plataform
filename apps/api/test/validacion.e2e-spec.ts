import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Q2 — los errores de validación, vistos desde fuera.
//
// Las unitarias de `src/common/zod-validation.pipe.spec.ts` ya prueban la traducción. Lo que
// solo se puede comprobar aquí es que ese cuerpo **sobrevive el viaje**: que Nest y Fastify lo
// serializan tal cual, que sigue siendo un 400, y que las dos peticiones exactas que un DM real
// mandó ahora responden algo que se puede leer y ejecutar. No hay filtro de excepciones global
// en `main.ts`, así que el cuerpo que sale es el que construye el pipe — esta prueba es lo que
// avisará si algún día se añade uno que lo aplaste.

describe("Errores de validación legibles (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-val${Date.now()}@b.com`;
  let tokenDM = "";
  let campaignId = "";
  let characterId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    tokenDM = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de validación" })
    ).body.id;
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Kelemvor", class: "warlock", level: 3, visibility: "PLAYERS" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: emailDM } });
    await app.close();
  });

  const s = () => app.getHttpServer();

  it("el descanso sin «kind» dice qué campo falta, en español", async () => {
    // La petición literal del informe: el DM mandó `type` porque `type` era lo que parecía.
    const res = await request(s())
      .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "LONG" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Falta el campo obligatorio «kind».");
    expect(res.body.errores).toEqual([
      {
        campo: "kind",
        ruta: ["kind"],
        codigo: "invalid_type",
        mensaje: "Falta el campo obligatorio «kind».",
      },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Required|fieldErrors|formErrors/);
  });

  it("una anulación con un objetivo inventado lista los objetivos que existen", async () => {
    const res = await request(s())
      .put(`/campaigns/${campaignId}/characters/${characterId}/overrides/hp`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ value: 3, reason: "prueba" });

    expect(res.status).toBe(400);
    // El nombre del parámetro sale de `metadata.data`, así que es el que aparece en la ruta.
    expect(res.body.message).toContain("El parámetro «target» solo admite estos valores:");
    expect(res.body.message).toContain("«maxHp»");
    expect(res.body.errores[0].admitidos).toContain("maxHp");
    expect(res.body.message).not.toContain("'hp'");
  });

  it("un campo anidado sale con su ruta completa y con los valores del discriminador", async () => {
    const res = await request(s())
      .post(`/campaigns/${campaignId}/rules`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Regla sin disparador", trigger: {}, effects: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("El campo «trigger.kind» solo admite estos valores:");
    expect(res.body.message).toContain("«SESSION_STARTED»");
    const trigger = res.body.errores.find((e: { campo: string }) => e.campo === "trigger.kind") as {
      ruta: unknown[];
      admitidos: string[];
    };
    expect(trigger.ruta).toEqual(["trigger", "kind"]);
    expect(trigger.admitidos).toContain("FLAG_SET");
    // Y el segundo problema del mismo cuerpo sigue ahí: la lista de efectos está vacía.
    expect(res.body.errores.map((e: { campo: string }) => e.campo)).toContain("effects");
  });

  it("no es un oráculo: dos identificadores inexistentes son indistinguibles", async () => {
    // Dos cuid con formato válido y ninguno de esta campaña. La respuesta tiene que ser la
    // **misma** para los dos: si el mensaje de validación llegara a decir «esa ficha no existe»
    // —o si distinguiera un id inexistente de uno ajeno—, sería un oráculo de identificadores.
    const pedir = (entityId: string) =>
      request(s())
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Regla con ficha ajena",
          trigger: { kind: "ENTITY_OPENED", entityId },
          effects: [{ kind: "ADD_SESSION_NOTE", note: "hola" }],
        });

    const uno = await pedir("ckqv1z2x30000abcd1234efgh");
    const otro = await pedir("ckqv1z2x30000abcd1234efgi");

    expect(uno.status).toBe(otro.status);
    expect(uno.body.message).toEqual(otro.body.message);
    expect(JSON.stringify(uno.body)).not.toMatch(/no existe|inexistente/i);
  });
});
