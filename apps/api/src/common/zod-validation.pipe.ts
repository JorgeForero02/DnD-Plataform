import { ArgumentMetadata, BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

import { buildValidationErrorBody } from "./validation-errors";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  /**
   * Sigue siendo un 400 y sigue llevando el detalle por campo; lo que cambia es que ahora
   * `message` es una frase en español que una persona puede leer y ejecutar, en vez del
   * `flatten()` crudo de Zod («Required», «Invalid enum value…»). El porqué de cada decisión
   * —incluida la de citar el nombre real del campo y no una etiqueta traducida— está en
   * `validation-errors.ts`.
   *
   * `metadata` no es decorativo: cuando el esquema valida un `@Param`/`@Query` suelto, la ruta
   * del problema viene vacía y el único sitio donde está el nombre del parámetro (`target`) es
   * `metadata.data`. Es opcional porque una llamada directa desde una prueba no lo necesita.
   */
  transform(value: unknown, metadata?: ArgumentMetadata) {
    // **Un cuerpo ausente es un cuerpo vacío cuando el esquema no pide nada.** Fastify entrega
    // `undefined` en un POST sin cuerpo, y un `z.object` con todos sus campos opcionales lo
    // rechazaba con «Falta el cuerpo de la petición» — un 400 por no mandar nada cuando no hacía
    // falta mandar nada. Se prueba `{}` **solo si pasa**: si el esquema sí exige campos, el error
    // que sale sigue siendo el de antes, con su frase y su detalle.
    const asImpliedEmpty =
      value === undefined && metadata?.type === "body" ? this.schema.safeParse({}) : null;
    if (asImpliedEmpty?.success) return asImpliedEmpty.data;

    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(buildValidationErrorBody(result.error.issues, metadata));
    }
    return result.data;
  }
}
