import { MODULE_METADATA } from "@nestjs/common/constants";
import { ACTIVITY_CATALOG } from "./activities.service";
import { actividadCatalogada, ActivitiesModule } from "./activities.module";

// Paso 2, tarea A11 — **`ACTIVITY_CATALOG` se cablea de verdad.**
//
// Hasta esta tarea `activities.module.ts` registraba el token a `undefined` a propósito (vuelta
// de arreglo 2 de A7): no había ninguna actividad completa que ofrecer. `ActivitiesService.usar`
// responde 404 en cuanto `this.catalog?.find(key)` no encuentra nada (`NotFoundException`), así
// que con el catálogo a `undefined` **cualquier clave** —incluida "rage"— caía en ese 404, aunque
// la clase del bárbaro llevara la Furia escrita entera.
//
// **Ronda de arreglo 1 (importante I1): la primera versión de este fichero medía la función,
// nunca el binding.** El hallazgo, medido de verdad: revertir `useValue: CATALOGO_REAL` a
// `useValue: undefined` en el `@Module` deja **1710/1710 en verde**, porque
// `actividadCatalogada` sigue existiendo y sigue funcionando — solo que ya nadie la conecta al
// token que `ActivitiesService` inyecta. El único guardián de ese binding era el e2e que por
// mandato nunca se corre. `Reflect.getMetadata` sobre `@Module` no necesita levantar Nest ni
// Prisma —lee la metadata que el decorador ya escribió— así que esta prueba sí cierra el hueco.

describe("actividadCatalogada — el catálogo real de ACTIVITY_CATALOG", () => {
  it('encuentra "rage" y ya no responde con undefined (lo que causaba el 404 de usar())', () => {
    const furia = actividadCatalogada("rage");
    expect(furia).toBeDefined();
    expect(furia?.activation).toEqual({ coste: "BONUS" });
    expect(furia?.consumption).toEqual([{ recurso: "rage", cantidad: 1 }]);
  });

  // Importante I1 (ronda de arreglo 1): medido, quitar `effects` de `FURIA` en `classes.ts` deja
  // 1710/1710 en verde salvo esta prueba. Sin `effects`, `ActivitiesService.usar` sigue gastando
  // el recurso y la acción adicional, pero el bárbaro entra en furia sin que aparezca su estado —
  // exactamente el segundo defecto que el propio encargo nombraba por su nombre.
  it("la Furia deja su estado: `effects` concede la condición «raging»", () => {
    const furia = actividadCatalogada("rage");
    expect(furia?.effects).toEqual([{ key: "raging", durationSeconds: 60, note: "Furia activa" }]);
  });

  it("una clave que ningún rasgo concede sigue devolviendo undefined, no revienta", () => {
    expect(actividadCatalogada("esto-no-existe-en-ningun-catalogo")).toBeUndefined();
  });

  it("busca también en las aptitudes de SUBCLASE, no solo en las de la clase base", () => {
    // Hoy ningún rasgo de subclase concede una actividad completa (solo la Furia, de clase) —
    // así que esta prueba no puede afirmar un HALLAZGO positivo sin fabricar un segundo grant
    // que el catálogo no tiene: sería exactamente la clase de dato inventado que esta tanda
    // pide no escribir. Lo que SÍ es real y verificable es que el bucle de subclases no revienta
    // ni encuentra nada donde no hay nada — que es la otra mitad honesta de "busca en las dos".
    expect(actividadCatalogada("frenzy")).toBeUndefined();
  });
});

describe("el binding de ACTIVITY_CATALOG en el @Module (importante I1)", () => {
  it("el provider registrado en ActivitiesModule resuelve «rage» de verdad, no `undefined`", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ActivitiesModule) as {
      provide?: unknown;
      useValue?: ActivityCatalogParaLaPrueba;
    }[];
    const proveedor = providers.find((p) => p.provide === ACTIVITY_CATALOG);

    expect(proveedor).toBeDefined();
    // **Aserción de identidad sobre lo que de verdad inyecta Nest**, no sobre la función suelta:
    // si `providers` volviera a declarar `{ provide: ACTIVITY_CATALOG, useValue: undefined }`
    // (la vuelta de arreglo 2 de A7), `proveedor?.useValue` sería `undefined` y `.find` reventaría
    // aquí — que es exactamente el 404 que esta prueba existe para que no vuelva en silencio.
    expect(proveedor?.useValue?.find("rage")).toBeDefined();
  });
});

/** Solo para tipar la lectura de la metadata; `ActivityCatalog` real vive en `activities.service.ts`. */
interface ActivityCatalogParaLaPrueba {
  find(key: string): unknown;
}
