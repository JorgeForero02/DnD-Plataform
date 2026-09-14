import { Global, Module } from "@nestjs/common";
import { defaultRoller, DICE_ROLLER } from "./dice";

// Puerta de efectos, ola de arreglos 1 (2026-09-13, Critical 2 de la revisión de API).
//
// **Hasta hoy `DICE_ROLLER` no estaba registrado en ningún módulo**: todas las inyecciones son
// `@Optional()` y caían al tirador por defecto. Eso era correcto en producción y un agujero en
// las pruebas de extremo a extremo: `Test.createTestingModule(...).overrideProvider(DICE_ROLLER)`
// sobre un token que ningún módulo provee es un **no-op silencioso** en Nest, así que un e2e que
// creía fijar los dados estaba tirando al azar — `puerta-de-efectos.e2e-spec.ts` pasó su paso
// «B falla» con probabilidad 0,70 y su bandeja de daño falló con un `MISS` que «no podía» salir.
//
// El proveedor existe ahora, con **el mismo valor que ya se usaba por omisión** (`defaultRoller`,
// `crypto.randomInt`): producción no cambia de comportamiento en nada; solo hay algo que un e2e
// pueda sustituir. Es `@Global()` porque el tirador lo piden seis servicios en cinco módulos
// (`rolls`, `characters`, `activities`, `level-up`, `statblocks`) y ninguno debería tener que
// importar un módulo para conseguir un azar que ya recibía.
@Global()
@Module({
  providers: [{ provide: DICE_ROLLER, useValue: defaultRoller }],
  exports: [DICE_ROLLER],
})
export class DiceModule {}
