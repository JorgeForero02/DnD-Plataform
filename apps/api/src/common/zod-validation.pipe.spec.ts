import { ArgumentMetadata, BadRequestException } from "@nestjs/common";
import { z } from "zod";

import type { ValidationErrorBody } from "./validation-errors";
import { ZodValidationPipe } from "./zod-validation.pipe";

/** Ejecuta el pipe esperando el 400 y devuelve el cuerpo ya tipado. */
function rechazo(
  schema: z.ZodSchema,
  value: unknown,
  metadata?: ArgumentMetadata,
): ValidationErrorBody {
  const pipe = new ZodValidationPipe(schema);
  try {
    pipe.transform(value, metadata);
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const exception = error as BadRequestException;
    expect(exception.getStatus()).toBe(400);
    return exception.getResponse() as ValidationErrorBody;
  }
  throw new Error("Se esperaba que el pipe rechazara este valor y lo aceptó");
}

describe("ZodValidationPipe", () => {
  it("deja pasar un valor válido y devuelve lo parseado", () => {
    const pipe = new ZodValidationPipe(z.object({ kind: z.enum(["SHORT", "LONG"]) }));
    expect(pipe.transform({ kind: "LONG" })).toEqual({ kind: "LONG" });
  });

  describe("enum: dice qué valores admite", () => {
    // El caso literal que recibió el DM: PATCH .../override/hp sobre `overridableKeySchema`.
    const targetSchema = z.enum(["ac", "maxHp", "initiative", "speed.walk", "passivePerception"]);
    const metadata: ArgumentMetadata = { type: "param", data: "target", metatype: String };

    it("nombra el parámetro y lista los valores admitidos", () => {
      const body = rechazo(targetSchema, "hp", metadata);

      expect(body.message).toBe(
        "El parámetro «target» solo admite estos valores: «ac», «maxHp», «initiative», " +
          "«speed.walk», «passivePerception».",
      );
      expect(body.errores).toEqual([
        {
          campo: null,
          ruta: [],
          codigo: "invalid_enum_value",
          mensaje: body.message,
          admitidos: ["ac", "maxHp", "initiative", "speed.walk", "passivePerception"],
        },
      ]);
    });

    it("no repite el valor recibido ni deja jerga de la librería", () => {
      const body = rechazo(targetSchema, "hp", metadata);

      expect(body.message).not.toContain("'hp'");
      expect(body.message).not.toMatch(/Invalid|Expected|received|formErrors|fieldErrors/);
    });
  });

  describe("campo obligatorio ausente", () => {
    const schema = z.object({ kind: z.enum(["SHORT", "LONG"]), reason: z.string().optional() });

    it("dice el nombre real del campo, no una etiqueta traducida", () => {
      const body = rechazo(schema, {});

      expect(body.message).toBe("Falta el campo obligatorio «kind».");
      expect(body.errores[0]).toMatchObject({
        campo: "kind",
        ruta: ["kind"],
        codigo: "invalid_type",
      });
    });

    it("el cuerpo mantiene el 400 y el detalle señalable por campo", () => {
      const body = rechazo(schema, { reason: 4 });

      expect(body.statusCode).toBe(400);
      expect(body.errores.map((e) => e.campo)).toEqual(["kind", "reason"]);
      expect(body.message).toContain("Falta el campo obligatorio «kind».");
      expect(body.message).toContain(
        "El campo «reason» tiene que ser de tipo texto; llegó número.",
      );
    });
  });

  it("tipo equivocado: dice el tipo esperado y el que llegó, sin el valor", () => {
    const schema = z.object({ spendHitDice: z.number().int().min(0).max(20) });
    const body = rechazo(schema, { spendHitDice: "tres" });

    expect(body.message).toBe("El campo «spendHitDice» tiene que ser de tipo número; llegó texto.");
    expect(body.message).not.toContain("tres");
  });

  it("límites: traduce mínimos y máximos de texto y de número", () => {
    const schema = z.object({ name: z.string().min(1).max(60), ac: z.number().max(30) });

    expect(rechazo(schema, { name: "", ac: 10 }).message).toBe(
      "El campo «name» tiene que tener al menos 1 carácter.",
    );
    expect(rechazo(schema, { name: "Bree", ac: 999 }).message).toBe(
      "El campo «ac» tiene que ser como máximo 30.",
    );
  });

  describe("anidado: un objeto dentro de otro", () => {
    // La forma real de `ruleTriggerSchema`: una unión discriminada por `kind` dentro del cuerpo.
    const schema = z.object({
      name: z.string().min(1),
      trigger: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("SESSION_STARTED") }),
        z.object({ kind: z.literal("FLAG_SET"), key: z.string().min(1).max(60) }),
      ]),
    });

    it("la ruta completa aparece en el mensaje, con puntos", () => {
      const body = rechazo(schema, { name: "Aviso", trigger: {} });

      expect(body.message).toBe(
        "El campo «trigger.kind» solo admite estos valores: «SESSION_STARTED», «FLAG_SET».",
      );
      expect(body.errores[0]).toEqual({
        campo: "trigger.kind",
        ruta: ["trigger", "kind"],
        codigo: "invalid_union_discriminator",
        mensaje: body.message,
        admitidos: ["SESSION_STARTED", "FLAG_SET"],
      });
    });

    it("un campo de la rama elegida también sale con su ruta completa", () => {
      const body = rechazo(schema, { name: "Aviso", trigger: { kind: "FLAG_SET", key: "" } });

      expect(body.message).toBe("El campo «trigger.key» tiene que tener al menos 1 carácter.");
      expect(body.errores[0].ruta).toEqual(["trigger", "key"]);
    });

    it("dentro de una lista, la ruta lleva el índice entre corchetes", () => {
      const conLista = z.object({ effects: z.array(z.object({ amount: z.number().int() })) });
      const body = rechazo(conLista, { effects: [{ amount: 1 }, { amount: 2.5 }] });

      expect(body.message).toBe(
        "El campo «effects[1].amount» tiene que ser de tipo número entero; llegó número decimal.",
      );
      expect(body.errores[0].ruta).toEqual(["effects", 1, "amount"]);
    });
  });

  it("no es un oráculo: un identificador con formato válido no se comenta", () => {
    // La validación solo mira la forma. Un cuid bien formado pero inexistente pasa por aquí sin
    // decir nada — quien decide es el servicio, con un 404. Aquí solo puede fallar el formato.
    const schema = z.object({ entityId: z.string().cuid() });
    const pipe = new ZodValidationPipe(schema);

    expect(pipe.transform({ entityId: "ckqv1z2x30000abcd1234efgh" })).toEqual({
      entityId: "ckqv1z2x30000abcd1234efgh",
    });

    const body = rechazo(schema, { entityId: "no-es-un-cuid" });
    expect(body.message).toBe("El campo «entityId» tiene que ser un identificador.");
    expect(body.message).not.toMatch(/existe|encontr|desconocid/i);
  });

  it("con muchos problemas, el mensaje se corta pero el detalle no", () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      d: z.string(),
      e: z.string(),
      f: z.string(),
      g: z.string(),
    });
    const body = rechazo(schema, {});

    expect(body.errores).toHaveLength(7);
    expect(body.message).toContain("Hay 2 problemas más.");
    expect(body.message.startsWith("Falta el campo obligatorio «a».")).toBe(true);
  });
});

describe("un mensaje escrito por el esquema llega entero (2C.6)", () => {
  // La regla de este dominio, llevada hasta el final: un 400 se escribe **para que una persona lo
  // lea y sepa qué arreglar**. La regla que comprueba un `superRefine` no la puede adivinar la
  // capa de traducción; la sabe quien escribió el esquema.
  //
  // Lo encontró un e2e de 2C.6: la tabla del DM rechazaba un hueco con un mensaje escrito a
  // propósito y la respuesta llegaba diciendo «El campo «entries» no tiene un valor válido».

  it("**el mensaje del esquema gana** sobre la frase genérica", () => {
    const conMensaje = z.object({ entries: z.array(z.number()) }).superRefine((_v, ctx) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "Falta el resultado 6: la tabla no puede tener huecos.",
      });
    });
    const cuerpo = rechazo(conMensaje, { entries: [] });
    expect(cuerpo.message).toContain("no puede tener huecos");
  });

  it("pero el «Invalid input» por defecto de Zod NO llega: está en inglés y no dice nada", () => {
    const sinMensaje = z.object({ n: z.number() }).refine(() => false);
    const cuerpo = rechazo(sinMensaje, { n: 1 });
    expect(cuerpo.message).not.toContain("Invalid input");
    expect(cuerpo.message).toMatch(/no tiene un valor válido/);
  });
});
