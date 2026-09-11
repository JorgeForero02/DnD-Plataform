import { NOMBRE_SIN_IDENTIFICAR, type ResolvedItem } from "@dnd/shared";
import { canView, type Viewer, type ViewableResource } from "../../common/visibility";

// Migración 7 (D-CF-15, tickets I3 / M2B-15) — «lo tengo pero no sé qué es».
//
// **Reutiliza el principio de `redactado()`** (`character-sheet.service.ts`, ficha de la
// auditoría de 2B): se sustituye la IDENTIDAD, nunca el número. `ref`, `effects`, `weapon`,
// `armor`, `weightOz`, `costCp`... todo lo que alimenta el motor sigue intacto; solo cambian
// `name` y `description`. Es una capa **ortogonal** a `canView`: esta decide si la fila se ve o
// no, esta otra decide si, viéndose, se ve por su nombre real. `canView` sigue siendo el único
// dueño de la primera pregunta — esta función no la responde ni la repite, solo recibe ya
// resuelto si quien mira puede ver la fila y si es el DM.

/** Lo mínimo de la fila de inventario que hace falta para decidir su identidad. */
export interface FilaConIdentificacion {
  identified: boolean;
  unidentifiedName: string | null;
}

/**
 * Mezcla el estado de identificación de la fila en el objeto ya resuelto del catálogo, y lo
 * redacta si quien mira no es el DM y el objeto no está identificado.
 *
 * **El DM siempre ve `name` real** más `identified`/`unidentifiedName` sueltos, para poder
 * decidir si lo revela y con qué alias. **Quien no es el DM** ve `identified` (para pintar la
 * etiqueta «sin identificar»), pero `name` ya viene sustituido por el alias —o por el título
 * genérico si el DM no ha puesto ninguno— y `description`/`unidentifiedName` no viajan: la
 * descripción sería la pista que delata qué es, y el alias ya está en `name`, repetirlo no
 * añade nada.
 */
export function conIdentificacion(
  item: ResolvedItem,
  fila: FilaConIdentificacion,
  viewerEsDM: boolean,
): ResolvedItem {
  // `!== false` y no `fila.identified` a secas: la columna nace `true` (la migración la puso
  // `NOT NULL DEFAULT true`), y aquí se trata igual un `true` explícito que un mock de prueba
  // que no la menciona — ninguno de los dos es "el DM lo marcó sin identificar".
  const identificado = fila.identified !== false;
  if (viewerEsDM) {
    return { ...item, identified: identificado, unidentifiedName: fila.unidentifiedName };
  }
  if (identificado) {
    return { ...item, identified: true, unidentifiedName: undefined };
  }
  return {
    ...item,
    identified: false,
    name: fila.unidentifiedName ?? NOMBRE_SIN_IDENTIFICAR,
    description: undefined,
    unidentifiedName: undefined,
    // Fix round 1 (B8) — **solo para un objeto del SRD.** `ref` se queda intacto para un
    // `CAMPAIGN:<cuid>` (el `cuid` no significa nada fuera de la base), pero un `SRD:<key>` SÍ
    // delata identidad por su cuenta: `nombreDeRefDeObjeto` (`character-sheet/vocabulario.ts`)
    // traduce cualquier `item.SRD:chain-mail` de la traza de la CA a «Cota de malla» leyendo un
    // diccionario ESTÁTICO que no sabe nada de identificación — nada impide al DM marcar una
    // fila del SRD sin identificar, y el `ref` real se lo diría igual. Entre "mantener el ref
    // real" y "que la traza lo traduzca", se elige tocar el `ref`: es la misma solución que
    // `redactado()` ya aplica por visibilidad, y aquí sigue siendo mentira una mitad menor que
    // la identidad entera — el número (`effects`, `weapon`, `armor`) no se toca.
    ...(item.source === "SRD" ? { ref: "SRD:objeto-sin-identificar" } : {}),
  };
}

/**
 * El nombre que oye LA MESA para esta fila: real si está identificada, el alias (o el título
 * genérico) si no — **sin importar quién mira**. Es `conIdentificacion(item, fila,
 * false).name`, y existe porque hay sitios que no pintan una pantalla para un visor concreto: el
 * registro de la partida, la traza de un modificador temporal, y los mensajes de error 400/409
 * de equipar. Esos tres son infraestructura COMPARTIDA —cualquiera que pueda ver al personaje los
 * lee, DM incluido— y el DM ya sabe qué es por su propio panel; no hace falta que el registro
 * también se lo diga con el nombre real (fix round 1, H1/H2/M5).
 */
export function nombreVisible(item: ResolvedItem, fila: FilaConIdentificacion): string {
  return conIdentificacion(item, fila, false).name;
}

/**
 * Fix round 2 (R5) — la pareja de `nombreVisible` para `ref`. Para un `CAMPAIGN:<cuid>` no
 * cambia nada (el `cuid` no dice nada por sí solo, y desde R1 tampoco se puede usar para
 * resolverlo sin pasar por `canView`); para un `SRD:<key>` sin identificar, es el mismo
 * `"SRD:objeto-sin-identificar"` que ya produce `conIdentificacion` — el `ref` real de un
 * objeto del SRD ES su nombre (una clave pública, traducible por cualquiera con el catálogo a
 * mano), así que el registro de la partida —que cualquiera con acceso al personaje lee— tampoco
 * lo escribe cuando la fila está sin identificar.
 */
export function refVisible(item: ResolvedItem, fila: FilaConIdentificacion): string {
  return conIdentificacion(item, fila, false).ref;
}

/**
 * Fix round 2 (R5) — la fila CRUDA que devuelve un `POST`/`PATCH` (`InventoryItem` de Prisma,
 * sin resolver contra el catálogo) filtrada para quien no es el DM. `unidentifiedName` ya se
 * limpiaba desde fix round 1; `srdKey`/`campaignItemId` no — y para un objeto del SRD, `srdKey`
 * ES el nombre real («dagger», «chain-mail»): la fila cruda del dueño de un anillo sin
 * identificar del SRD delataba lo que la lista y la hoja ya redactaban. Para una fila
 * IDENTIFICADA no se toca nada: `srdKey`/`campaignItemId` no delatan nada que la propia `name`
 * ya resuelta no diga, y hay una prueba que depende de verlo (`inventory.e2e-spec.ts`, "el
 * dueño mete una daga del SRD").
 */
export function filaCrudaVisible<
  T extends {
    identified: boolean;
    unidentifiedName: string | null;
    srdKey: string | null;
    campaignItemId: string | null;
  },
>(fila: T, viewerEsDM: boolean): T {
  if (viewerEsDM) return fila;
  if (fila.identified) return { ...fila, unidentifiedName: null };
  return { ...fila, unidentifiedName: null, srdKey: null, campaignItemId: null };
}

/**
 * Fix round 2 (R2) — **la fila tal y como la ve UN VISOR concreto, en un solo sitio**, para que
 * `InventoryService.list()` y `CharacterSheetService.equipoEquipado()` decidan exactamente lo
 * mismo. Compone dos capas ortogonales:
 *
 * 1. **Visibilidad del CATÁLOGO** (`canView` sobre el `CampaignItem`, si lo hay): decide si la
 *    fila se ve EN ABSOLUTO. La única excepción es el DUEÑO del personaje (fix round 1, M4a):
 *    su propia fila nunca desaparece, se ve REDACTADA — forzada a "sin identificar" para la
 *    decisión de nombre, sea cual sea `fila.identified` de verdad, porque el catálogo dice que
 *    esto no se ve y `conIdentificacion` es el único camino que ya sabe redactar sin tocar el
 *    número.
 * 2. **Identificación de la FILA** (`conIdentificacion`): decide, ya viéndose, si se ve por su
 *    nombre real.
 *
 * Devuelve `visible: false` cuando ni siquiera el dueño puede verla (un compañero de mesa sin
 * concesión): quien llama decide qué hacer con eso — `list()` la descarta sin más, `equipoEquipado`
 * la sustituye por `redactado()` porque sus números siguen contando en la CA de la hoja.
 */
/**
 * Fix round 3 (R8) — la ÚNICA verdad de "¿está identificada de verdad esta fila?", para que
 * escritura y lectura dejen de poder discrepar. `fila.identified` a secas es una MENTIRA
 * potencial: nada impedía (antes de este fix) que quedara en `true` mientras el catálogo del
 * objeto ya es invisible para el dueño del personaje (p.ej. el DM baja la visibilidad del
 * `CampaignItem` con la fila ya identificada — M4b bloquea el camino inverso, pero no éste). Los
 * caminos de LECTURA (`list()`, `equipoEquipado()`, vía `filaComoLaVeElViewer`) ya resuelven esto
 * fila a fila; esta función existe para que los caminos de ESCRITURA (eventos, la razón de un
 * modificador temporal, los 400/409 de equipar, la etiqueta de una tirada,
 * `ATTACK_RESOLVED.attackName`) usen EXACTAMENTE el mismo criterio en vez de leer
 * `row.identified` en crudo.
 *
 * Es sólo la fórmula que ya vive dentro de `filaComoLaVeElViewer` para el dueño, aislada para
 * poder reutilizarse fuera de un `Viewer` de pantalla: aquí el segundo parámetro es siempre el
 * `Viewer` DEL DUEÑO del personaje (nunca el de quien dispara la escritura), porque lo que
 * cuenta para decidir "identificada de verdad" es si SU dueño puede ver el catálogo — igual que
 * decide `filaComoLaVeElViewer` para esa misma fila.
 */
export function identificacionEfectiva(
  fila: FilaConIdentificacion,
  catalogo: ViewableResource | null,
  ownerViewer: Viewer,
): FilaConIdentificacion {
  const puedeVerCatalogo = !catalogo || canView(ownerViewer, catalogo);
  return {
    identified: fila.identified !== false && puedeVerCatalogo,
    unidentifiedName: fila.unidentifiedName,
  };
}

export function filaComoLaVeElViewer(
  item: ResolvedItem,
  fila: FilaConIdentificacion,
  catalogo: ViewableResource | null,
  viewer: Viewer,
  esDueño: boolean,
): { visible: boolean; item: ResolvedItem } {
  const puedeVerCatalogo = !catalogo || canView(viewer, catalogo);
  if (!puedeVerCatalogo && !esDueño) {
    return { visible: false, item };
  }
  const filaParaIdentidad: FilaConIdentificacion =
    !puedeVerCatalogo && esDueño
      ? { identified: false, unidentifiedName: fila.unidentifiedName }
      : fila;
  return {
    visible: true,
    item: conIdentificacion(item, filaParaIdentidad, viewer.role === "DM"),
  };
}
