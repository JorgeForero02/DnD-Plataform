import type { ArgumentMetadata } from "@nestjs/common";
import type { ZodIssue } from "zod";

/**
 * Traduce los problemas de Zod a español, para gente que no ha visto el esquema.
 *
 * Lo que salía antes por pantalla, literal, era esto:
 *
 *   {"formErrors":["Invalid enum value. Expected 'ac' | 'maxHp' | ..., received 'hp'"], ...}
 *   {"formErrors":[],"fieldErrors":{"kind":["Required"]}}
 *
 * Tres fallos a la vez: en inglés, en la jerga de la librería, y el segundo sin decir qué
 * valores acepta — un DM real probó `{"type":"LONG"}` porque `type` era lo que parecía, y la
 * clave era `kind`.
 *
 * ## La tensión entre el nombre humano y el nombre real del campo
 *
 * Un mensaje del todo humano diría «falta el tipo de descanso». Pero quien recibe ese mensaje
 * tiene que arreglar una petición HTTP, y ahí el campo se sigue llamando `kind`: un nombre
 * bonito que no aparece en ninguna parte de la API deja a la persona buscando un campo que no
 * existe. **Se resuelve así: el nombre del campo se cita siempre literal y entrecomillado
 * —«kind», tal cual lo espera la API—, y el español pone solo la gramática alrededor.**
 * Deliberadamente NO hay diccionario campo→etiqueta en esta capa: sería una segunda fuente de
 * verdad sobre la forma de los datos (que vive una sola vez, en `packages/shared`), se quedaría
 * desfasada al renombrar un campo, y aun estando al día seguiría sin decirle a nadie qué
 * mandar. Las etiquetas amables son trabajo de la interfaz, que sí sabe a qué control
 * corresponde cada campo; aquí lo que hace falta es el nombre que hay que teclear.
 *
 * ## Lo que este módulo no dice nunca
 *
 * - **No repite el valor recibido.** No hace falta para arreglar la petición (quien la manda ya
 *   lo tiene) y evita que un cuerpo con una contraseña, un `token` o un identificador acabe
 *   reflejado en la pantalla y en los registros. Los valores que sí se listan —los de un enum—
 *   salen del esquema, no de la entrada.
 * - **No puede filtrar si algo existe.** Esta capa solo ve la forma del cuerpo; nunca consulta
 *   la base. Un `entityId` con formato válido pero inexistente pasa por aquí sin comentario y
 *   lo rechaza después el servicio con un 404 — así el mensaje de validación no es un oráculo
 *   de identificadores.
 */

/** Detalle estructurado: lo que un cliente necesita para señalar el campo culpable. */
export interface ValidationErrorDetail {
  /** Ruta legible con los nombres **reales** de la API: `trigger.kind`, `items[0].name`. */
  campo: string | null;
  /** La misma ruta sin formatear, para recorrerla con código. */
  ruta: (string | number)[];
  /** Código de Zod, intacto: quien depura no pierde nada. */
  codigo: string;
  /** La frase en español que corresponde a este problema. */
  mensaje: string;
  /** Valores admitidos, solo cuando la lista es corta y cerrada. */
  admitidos?: (string | number)[];
}

export interface ValidationErrorBody {
  statusCode: 400;
  error: "Bad Request";
  /** Frase en español, ya legible: la interfaz la puede pintar tal cual. */
  message: string;
  errores: ValidationErrorDetail[];
}

/** Por encima de esto, listar los valores estorba más de lo que ayuda. */
const MAX_VALORES_LISTADOS = 12;
/** Un mensaje con veinte frases no lo lee nadie; el resto sigue entero en `errores`. */
const MAX_FRASES = 5;

const TIPOS: Record<string, string> = {
  string: "texto",
  number: "número",
  integer: "número entero",
  float: "número decimal",
  bigint: "número entero grande",
  boolean: "booleano (true o false)",
  date: "fecha",
  array: "lista",
  object: "objeto",
  null: "nulo",
  undefined: "ausente",
  nan: "no numérico",
  symbol: "símbolo",
  function: "función",
  map: "mapa",
  set: "conjunto",
};

const FORMATOS: Record<string, string> = {
  email: "un correo electrónico",
  url: "una dirección web",
  uuid: "un identificador UUID",
  cuid: "un identificador",
  cuid2: "un identificador",
  ulid: "un identificador",
  datetime: "una fecha con hora en formato ISO 8601",
  date: "una fecha en formato ISO 8601",
  time: "una hora en formato ISO 8601",
  ip: "una dirección IP",
  emoji: "un emoji",
  regex: "un valor con el formato esperado",
};

function tipo(nombre: string): string {
  return TIPOS[nombre] ?? nombre;
}

/** `["trigger", "kind"]` → `trigger.kind`; `["t", 0, "n"]` → `t[0].n`. */
export function formatPath(path: readonly (string | number)[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") return `${acc}[${String(segment)}]`;
    return acc === "" ? segment : `${acc}.${segment}`;
  }, "");
}

/** Cómo se llama, en español, aquello que falló: siempre con el nombre real entrecomillado. */
function sujeto(campo: string | null, metadata?: ArgumentMetadata): string {
  if (campo !== null) return `El campo «${campo}»`;
  // Sin ruta, el fallo es del valor entero. Si es un parámetro de ruta o de consulta, Nest nos
  // da su nombre en `metadata.data`, que es exactamente el que aparece en la URL.
  if (metadata?.data) {
    return metadata.type === "query"
      ? `El parámetro de consulta «${metadata.data}»`
      : `El parámetro «${metadata.data}»`;
  }
  return "El cuerpo de la petición";
}

/** Igual que `sujeto`, pero para «falta X»: hay que decir si es campo, parámetro o cuerpo. */
function nombreCosa(campo: string | null, metadata?: ArgumentMetadata): string {
  if (campo !== null) return `el campo obligatorio «${campo}»`;
  if (metadata?.data) return `el parámetro obligatorio «${metadata.data}»`;
  return "el cuerpo de la petición";
}

/** «1 carácter» / «60 caracteres»: un mensaje con la concordancia rota se lee como un error. */
function cuenta(n: number | bigint, singular: string, plural: string): string {
  return `${String(n)} ${n === 1 || n === BigInt(1) ? singular : plural}`;
}

function listaAdmitidos(opciones: readonly (string | number)[]): string {
  return opciones.map((o) => `«${String(o)}»`).join(", ");
}

function frasePorValoresAdmitidos(
  campo: string | null,
  opciones: readonly (string | number)[],
  metadata?: ArgumentMetadata,
): string {
  if (opciones.length > MAX_VALORES_LISTADOS) {
    const cuantos = String(opciones.length);
    return `${sujeto(campo, metadata)} no admite ese valor: hay ${cuantos} valores permitidos.`;
  }
  return `${sujeto(campo, metadata)} solo admite estos valores: ${listaAdmitidos(opciones)}.`;
}

function describeIssue(issue: ZodIssue, metadata?: ArgumentMetadata): ValidationErrorDetail {
  const ruta = [...issue.path];
  const campoTexto = formatPath(ruta);
  const campo = campoTexto === "" ? null : campoTexto;
  const base = { campo, ruta, codigo: issue.code };

  switch (issue.code) {
    case "invalid_type": {
      if (issue.received === "undefined") {
        return { ...base, mensaje: `Falta ${nombreCosa(campo, metadata)}.` };
      }
      if (issue.received === "null") {
        return { ...base, mensaje: `${sujeto(campo, metadata)} no puede ser nulo.` };
      }
      const esperado = tipo(issue.expected);
      return {
        ...base,
        mensaje: `${sujeto(campo, metadata)} tiene que ser de tipo ${esperado}; llegó ${tipo(
          issue.received,
        )}.`,
      };
    }
    case "invalid_enum_value": {
      const admitidos = [...issue.options];
      return { ...base, mensaje: frasePorValoresAdmitidos(campo, admitidos, metadata), admitidos };
    }
    case "invalid_union_discriminator": {
      // Los discriminadores de Zod son primitivos; los pintamos como texto para el mensaje.
      const admitidos = issue.options.map((o) => String(o));
      return { ...base, mensaje: frasePorValoresAdmitidos(campo, admitidos, metadata), admitidos };
    }
    case "invalid_literal": {
      const admitidos = [String(issue.expected)];
      return {
        ...base,
        mensaje: `${sujeto(campo, metadata)} solo admite el valor «${admitidos[0]}».`,
        admitidos,
      };
    }
    case "unrecognized_keys": {
      const donde = campo === null ? "El cuerpo de la petición" : `El campo «${campo}»`;
      return {
        ...base,
        mensaje: `${donde} lleva campos que no existen: ${listaAdmitidos(issue.keys)}.`,
      };
    }
    case "invalid_string": {
      const formato =
        typeof issue.validation === "string"
          ? (FORMATOS[issue.validation] ?? "un valor con el formato esperado")
          : "un valor con el formato esperado";
      return { ...base, mensaje: `${sujeto(campo, metadata)} tiene que ser ${formato}.` };
    }
    case "too_small": {
      const suj = sujeto(campo, metadata);
      const min = String(issue.minimum);
      if (issue.type === "string") {
        const cuantos = cuenta(issue.minimum, "carácter", "caracteres");
        return { ...base, mensaje: `${suj} tiene que tener al menos ${cuantos}.` };
      }
      if (issue.type === "array") {
        const cuantos = cuenta(issue.minimum, "elemento", "elementos");
        return { ...base, mensaje: `${suj} tiene que tener al menos ${cuantos}.` };
      }
      return {
        ...base,
        mensaje: issue.inclusive
          ? `${suj} tiene que ser como mínimo ${min}.`
          : `${suj} tiene que ser mayor que ${min}.`,
      };
    }
    case "too_big": {
      const suj = sujeto(campo, metadata);
      const max = String(issue.maximum);
      if (issue.type === "string") {
        const cuantos = cuenta(issue.maximum, "carácter", "caracteres");
        return { ...base, mensaje: `${suj} no puede pasar de ${cuantos}.` };
      }
      if (issue.type === "array") {
        const cuantos = cuenta(issue.maximum, "elemento", "elementos");
        return { ...base, mensaje: `${suj} no puede tener más de ${cuantos}.` };
      }
      return {
        ...base,
        mensaje: issue.inclusive
          ? `${suj} tiene que ser como máximo ${max}.`
          : `${suj} tiene que ser menor que ${max}.`,
      };
    }
    case "not_multiple_of": {
      const paso = String(issue.multipleOf);
      return { ...base, mensaje: `${sujeto(campo, metadata)} tiene que ser múltiplo de ${paso}.` };
    }
    case "invalid_date":
      return { ...base, mensaje: `${sujeto(campo, metadata)} no es una fecha válida.` };
    case "custom": {
      // **Un `refine` o un `superRefine` escriben su propio mensaje, y ese mensaje gana** — es la
      // regla de este fichero llevada hasta el final: un 400 se escribe para que una persona lo
      // lea y sepa qué arreglar. La regla que un `custom` comprueba no la puede adivinar esta
      // capa: «la tabla no puede tener huecos» o «dos filas se solapan en el 7» las sabe quien
      // escribió el esquema, y aquí solo se sabría decir «no tiene un valor válido».
      //
      // **Solo si el esquema escribió una**: Zod pone «Invalid input» por defecto, que está en
      // inglés y no dice nada, y eso sí se traduce a la frase genérica.
      //
      // Lo encontró un e2e de 2C.6: la tabla del DM rechazaba un hueco con un mensaje escrito a
      // propósito y la respuesta llegaba diciendo «El campo «entries» no tiene un valor válido».
      const propio = issue.message?.trim();
      if (propio && propio !== "Invalid input") return { ...base, mensaje: propio };
      return { ...base, mensaje: `${sujeto(campo, metadata)} no tiene un valor válido.` };
    }
    default:
      // Uniones no discriminadas y lo que Zod añada mañana. El código exacto viaja en `codigo`,
      // así que quien depura no se queda sin la pista.
      return { ...base, mensaje: `${sujeto(campo, metadata)} no tiene un valor válido.` };
  }
}

/**
 * Convierte los problemas de Zod en el cuerpo del 400: una frase legible en `message` y el
 * detalle por campo en `errores`. Las dos cosas conviven; ninguna sustituye a la otra.
 */
export function buildValidationErrorBody(
  issues: readonly ZodIssue[],
  metadata?: ArgumentMetadata,
): ValidationErrorBody {
  const errores = issues.map((issue) => describeIssue(issue, metadata));
  const frases = errores.slice(0, MAX_FRASES).map((e) => e.mensaje);
  const restantes = errores.length - frases.length;
  if (restantes > 0) {
    frases.push(
      restantes === 1 ? "Hay 1 problema más." : `Hay ${String(restantes)} problemas más.`,
    );
  }
  return {
    statusCode: 400,
    error: "Bad Request",
    message: frases.join(" ") || "El cuerpo de la petición no es válido.",
    errores,
  };
}
