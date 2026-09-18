# Cierre antes de 3A.2 — plan de ejecución

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar las fichas de `docs/06-pendientes.md` que no dependen del paso 3 — RM-2, las
menores de la revisión final del pulido (2026-09-13), `CharacterRow.entityId` y EM-1 — antes de
abrir 3A.2 «Elegir, lanzar y usar», dejando `main` sin deuda barata que compita con la nueva.

**Architecture:** Un solo implementador, un solo árbol (`git worktree`, rama `cierre/antes-de-3a2`,
`WORKTREE_SLOT=1`), **un commit por tarea** en el orden de abajo. Rigor «cierres y mover código»
([04-convenciones.md](../../04-convenciones.md), *Rigor según riesgo*): prueba solo donde cambia
comportamiento, un `pnpm verify` por tarea en primer plano (`timeout: 600000`, INCLUIDO `git commit`,
nunca `run_in_background`), Playwright **solo en los ficheros tocados** con `pnpm --filter @dnd/web
exec playwright test <fichero>`. Al final, **UNA** revisión Opus de la rama entera y **UNA** ola de
arreglos; fusionar solo con permiso del autor. No se despliega.

**Tech Stack:** NestJS + Prisma + Zod (`@dnd/shared`), React + TanStack Query + Tailwind, Vitest/RTL,
jest + supertest (e2e de API contra Postgres real), Playwright (Chromium).

**Spec:** este documento es plan y triaje a la vez: la «spec» es la lista de fichas de
`docs/06-pendientes.md` §«RM-2», §«Fichas menores dejadas por la revisión final de la rama
(2026-09-13)», §«Sin ficha propia · `CharacterRow`» y §«EM-1», leídas contra el código el
2026-09-17 (§0 de abajo dice qué se encontró en cada una).

## Global Constraints

- Código en inglés; interfaz, comentarios de decisión y documentación en español. Ningún valor de
  enumeración llega a la pantalla.
- La validación de entrada es Zod desde `@dnd/shared` vía `ZodValidationPipe`; la forma de los
  datos vive una vez, en `packages/shared/src`. `@dnd/api` importa de `@dnd/shared`, nunca al revés.
- **Ninguna prueba se desactiva, ningún umbral baja, ningún gancho se salta.** Si un control
  molesta se arregla el código.
- Toda pantalla tocada se mide en el navegador (jsdom no maqueta). Regla de interfaz: «se
  deshabilita, nunca se esconde, con su motivo».
- Documentación en el mismo commit: la ficha cerrada se **mueve entera** al archivo
  `docs/_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md`, con una línea de cierre
  encima; `06-pendientes.md` la pierde; `07-historial.md` recibe una entrada por la tanda (tarea
  final). Conteos de pruebas: **no se escriben a mano** (`pnpm check:estado` los regenera).
- Commits: Conventional Commits, en inglés, con la línea `Co-Authored-By: Claude Opus 5 (1M context)
  <noreply@anthropic.com>` al final.
- Un implementador por árbol. El orquestador no commitea en el árbol del implementador.

---

## §0 · Triaje: qué se encontró en cada ficha (2026-09-17, contra `main` = `766d9b8`)

Cada ficha pasó por los cuatro pasos de `04-convenciones.md` §«Antes de abrir una ficha». Veredictos:
**A** = se arregla en esta tanda · **F** = ya estaba cerrada o era falsa (se archiva con el motivo,
sin código) · **D** = se descarta con motivo escrito (se archiva) · **P** = requiere al autor
(§2) · **3A.2** = se resuelve dentro de la tanda siguiente, no aquí.

### RM-2 (reglas de la mesa)

| Ítem | Medido | Veredicto |
|---|---|---|
| M-4 `list` moldea el `payload` a mano | `ability-rolls.service.ts:160-172`: casts sueltos, ningún `parse` | **A** (T1) |
| M-5 `of = 0` viola `abilityRollAttemptSchema.of.min(1)` | `:142` pone `0` cuando la regla no es `DADOS`; la web pinta «Intento N de 0» (`AsignarCaracteristicas.tsx:509`) | **A** (T1): `of` pasa a opcional; sin él la web dice solo «Intento N» |
| M-6 invalidación redundante de `abilityRollsKey` en `useUpdateSheet` | `hooks.ts:133` invalida `[…, "ability-rolls"]`; `:129` ya invalida el prefijo `["campaigns", id, "characters"]`, que **la incluye** (la clave del intento cuelga de ese prefijo) | **A** (T3): se quita la línea y el comentario dice por qué basta el prefijo |
| M-7 `as CreateCharacterInput` | `CharacterEditor.tsx:115`; `character.schema.ts:55` solo exporta `z.infer` | **A** (T3): exportar `CreateCharacterFormInput = z.input<…>` |
| M-8 `r as DesgloseDeTirada` | `DesgloseDeTirada` es un `Pick` de campos que `AbilityRollAttemptDto["rolls"][number]` ya trae (`dc` opcional en ambos) | **A** (T3): probar sin moldear; si no compila, `dc?` |
| M-9 `Number("")` = 0 → 400 técnico de Zod | `ReglasDeLaMesa.tsx:108,145,180,257` mandan el número sin comprobar rango (`puntos` 15–40, `intentos` 1–10, `nivelInicial` 1–20, `cantidadPo` 0–100000) | **A** (T4): comprobación en `onGuardar` con frase en español |
| M-12 `CARACTERISTICAS` duplica `ORDEN_DE_CARACTERISTICAS` | `IdentidadEditable.tsx:33` | **A** (T3) |
| M-14 re-sembrar `borrador` | `ReglasDeLaMesa.tsx:55-63` re-siembra solo si cambia `campaignId`; si el servidor devuelve reglas normalizadas tras guardar, el borrador se queda con lo tecleado | **A** (T4): re-sembrar cuando cambie `reglas` y no haya edición en curso |
| e2e de concurrencia `ability-rolls` | No existe; `concurrencia-puerta.e2e-spec.ts` da el patrón (`Promise.all`, roller en cola) | **A** (T1) |
| `attemptId` bajo `MATRIZ`/`PUNTOS` | `character-sheet.service.ts:982`: `requireAttempt` corre con cualquier regla ≠ `LIBRE` y marca `chosen` un intento caduco | **A** (T1): 400 si `metodo !== "DADOS"` y llega `attemptId` |

### Fichas menores de la revisión final del pulido (2026-09-13)

| Área · ítem | Medido | Veredicto |
|---|---|---|
| Hoja · comentario «ancho mínimo» caducado (`hoja.spec.ts:92`) | La línea 92 no lo dice; los comentarios de «ancho mínimo» viven en `:337` y `:766` y **son verdaderos** (hablan del `w-[6rem]` compartido y de la tabla de ataques) | **F** |
| Hoja · «Vel.» repetido sin motivo | Motivo escrito en `Cabecera.tsx:121-125` (partía línea a 4,75 rem); los tests solo lo citan | **A** (T7): una línea de comentario en `hoja.spec.ts:318` y `Cabecera.test.tsx:90` que apunte a `Cabecera.tsx` |
| Hoja · `>= 4` en vez de `toBe(5)` (`hoja.spec.ts:1014`) | Son 5 casillas (`:339` ya afirma `toHaveCount(5)`) | **A** (T7): `toBe(5)` |
| Hoja · selector `[class*='w-[6rem]']` frágil | `hoja.spec.ts:339,1013` | **A** (T7): `data-casilla="derivada"` en `ValorDerivado` compacta y selector por dato |
| Hoja · `Dialog` fija `--tira-fija-bg` que nadie consume | `Dialog.tsx:227`; lo consume `Cabecera.tsx:100` **cuando la hoja se abre dentro de un diálogo** (sí ocurre: el editor de personaje) | **F**: sí tiene consumidor |
| Hoja · `Field.reservaEspacio` sin `line-height` explícito | `Field.tsx:69`: reserva por `min-h` con el `line-height` heredado | **D**: el *preflight* de Tailwind es dependencia declarada del proyecto; fijar un alto en `rem` duplicaría el token tipográfico |
| Hoja · `campaignId` parseado dos veces | `CampaignDetailPage.tsx:610` hace un solo `useParams`; el resto son props | **F** |
| Hoja · regex `/^\d+px$/` no prueba el `ResizeObserver` | `HojaCalculada.test.tsx:303` | **D**: jsdom no tiene `ResizeObserver` real; lo que mide altura se mide en Playwright (`espacios.spec.ts`), regla de `08-pruebas.md` |
| Hoja · desnivel sin ejercitar (`espacios.spec.ts`) | Cláusula honesta declarada; necesita un personaje con conjuros → **3A.2 lo trae** | **3A.2** |
| Ajustes · `sm` vs `xs` en errores | `AjustesDePersonaje.tsx:179,184` (`xs`, bloque archivado) vs `:219,252` (`sm`, pie) | **A** (T5): todos `text-chrome-sm` (el error se lee, no es nota al pie) |
| Ajustes · `PanelDeDados.test` no fija la rejilla del reloj | Prueba de clases CSS: jsdom no maqueta, y fijar clases es probar Tailwind | **D** |
| Mesa · `min-h-[14rem]` vs `max-h-[32vh]` bajo ~700 px | `CajonDelRegistro.tsx:72`; por CSS `min-height` gana a `max-height`: bajo ~700 px de alto el cajón mide 224 px y el marco encoge | **P** (§2): a 700 px de alto es decisión de diseño «qué cede, el marco o el registro» — D-CF de la ronda 2 dice «el marco manda» pero no fijó el suelo |
| Mesa · dos *chevrons* (`Punta.tsx` + `IconoFlechaIzquierda` rotada) e invertido al plegar | Confirmado: `Punta.tsx` (derecha/abajo) y `CajonDelRegistro.tsx:81-84` (`-rotate-90` plegado = apunta **arriba**, correcto para un cajón inferior; `rotate-90` abierto = abajo) | **A** (T6): `IconoPunta hacia=…` único en `ui/Iconos.tsx`; `Punta.tsx` desaparece |
| Mesa · plegar antes de cargar deja el contador en 0 | `CajonDelRegistro.tsx:45-51`: con `idAlPlegar === null` `nuevas` es 0 siempre | **A** (T6): con `plegado && idAlPlegar === null`, `nuevas = eventos.length` |
| Menú · sin `preventDefault` en Tab | `MenuDeAcciones.tsx:125`: Tab cierra y deja pasar el foco — **es el patrón APG de menú** (Tab sale del menú) | **D** con cita (WAI-ARIA APG, *Menu Button*: «Tab: closes the menu and moves focus to the next element») |
| Menú · Espacio dispara por `keydown` y por `click` | `:118-124`: `preventDefault` + `click()` manual en `keydown`; el nativo dispara `click` en **keyup** de Espacio → dos `onSelect` posibles | **A** (T5): Espacio se maneja en `onKeyUp` con `preventDefault` en ambos |
| Elenco · `FichaDeElenco.test` perdió `queryByRole` de «enemigo» | `FichaDeElenco.test.tsx:175` lo tiene | **F** |
| e2e · timeouts desiguales `hoja`/`sesion` | Ambos usan 15 000 para la primera pintura y 10 000 para el resto | **F** |
| Dados · empate en `kh`/`kl` por posición | `dice.ts:283`: `Array.prototype.sort` es **estable** (ES2019) → con empate se conserva el primero en caer, siempre igual | **A** (T2): una línea de comentario que lo declare + una unitaria `2d20kh1` con `[15, 15]` |
| Dados · `100d6r1` supera `.max(100)` | `roll.schema.ts:186` y `game-event.schema.ts:301` topan `dice` a 100; el evaluador permite 10 términos × 100 dados × 2 (relanzar una vez) = **2 000**. Nadie parsea la salida → hoy no rompe, pero el contrato miente | **A** (T2): `MAX_DADOS_POR_TIRADA = 2000` en shared, unitaria que lo ata a `DICE_LIMITS` |
| Dados · `SelectorDeVentaja` con `disabled` nativo | `BandejaDeDados.tsx:241`: radios inalcanzables por teclado; motivo en `<p>` sin `id` | **A** (T5): `aria-disabled` + `aria-describedby` |
| Dados · `<details>` muestra el error aunque esté plegado | `BandejaDeDados.tsx:83-86`: **a propósito** (el error abre el modo avanzado para no esconderlo; regla de interfaz) | **D** |
| Dados · `resumenAudienciaYCd` tercera traducción | `PanelDeDadosDeLaMesa.tsx:86-95` | **A** (T3): campo `resumen` en `AUDIENCIAS_DE_TIRADA` |
| Dados · `DadoDibujado` e `IconoD20` idénticos | Ambos `IconoDado caras={20}`; 9 importadores de `DadoDibujado` | **A** (T3): se borra `DadoDibujado.tsx`, todos importan `IconoD20` |
| Dados · `conDadoAnadido` sin consumidor | Solo su test la importa | **A** (T3): se retira con su test |
| Hilo · frase con sujeto pierde `(from → to)` | `linea-de-log.ts:206-207` | **A** (T5): «pierde 7 PG (20 → 13) ← Klarg» |
| Elenco · `CorregirBando.tsx` solo exporta un hook | 3 importadores | **A** (T3): renombrar a `accionesDeBando.ts` |
| Bestiario · `DarTemporales.preguntando` no se resetea al fallar | `DarTemporales.tsx:77`: solo `onSuccess` | **A** (T5): `onSettled` |
| Catálogo · `FilterChip` sin `aria-pressed` | `FilterChip.tsx:33` lo tiene | **F** |
| Catálogo · dos `Toolbar` apiladas sin separación | `CampaignItemsCatalogPage.tsx:150,169` | **A** (T5): `aria-label` a cada una y `gap-s2` en el contenedor; se mide |
| Mundo · anillo se solapa con ≥ 9 vecinos | Layout | **P** (§2) |
| Mundo · `normalizar()` copiada | Copias idénticas en `DesgloseDelMundo.tsx:42` y `EditorDeHilos.tsx:50` = `normalizarTexto` de `inventory/filtrarObjetos.ts:26`; la de `wikilinks.ts:53` **es distinta** (pliega espacios) y se queda | **A** (T3): `lib/texto.ts` |
| Mundo · «Leer más» siempre | Necesita medir desborde real (`scrollHeight`) | **P** (§2) |
| Mundo · chip «Sin hilos» se solapa en estrecho | Layout | **P** (§2) |
| Mundo · rótulo > 80 caracteres sin validar en cliente | El servidor corta; el cliente no avisa | **A** (T5): `maxLength={80}` + frase en español al pasarse |
| Mundo · borrar un hilo no invalida el otro extremo | `links/hooks.ts:46-53`: invalida `linksKey(entityId)` y la lista de campaña, no `linksKey(otroExtremo)` | **A** (T4) |
| Mundo · raíces sin hijos abiertas por defecto | Lógica de árbol | **A** (T4) si es un `useState` inicial; si depende de layout, **P** |
| Mundo · editor de hilos bajo el pliegue a 1280×800 | Layout | **P** (§2) |

### Otras

| Ficha | Medido | Veredicto |
|---|---|---|
| `CharacterRow.entityId` | `api.ts:37-70` no lo declara; el servidor lo manda redactado | **A** (T3) |
| EM-1 pruebas de efectos de mesa | `detectarEfectos.ts` puro, sin test; el flotante dura 2,6 s (`efectos.css:31`) y se retira por `onAnimationEnd` | **A** (T8): unitarias del detector + e2e que mida que el flotante sale del DOM |
| Regla candidata `timeout` | Se mide en esta tanda: cierra sola si ningún Bash del implementador queda en fondo | Se anota el resultado en T9 |

## §1 · Orden recomendado y por qué

1. **T1 servidor (RM-2)** primero: es el único cambio de comportamiento con riesgo real (marca
   intentos caducos) y el único que necesita Postgres. Si el e2e de concurrencia falla, mejor
   saberlo antes de gastar el día en cosmética.
2. **T2 contrato de dados**: shared + API, sin pantalla. Cierra dos fichas con dos unitarias.
3. **T3 mover código sin cambiar comportamiento** (web): renombres, duplicados, casts. Muchos
   ficheros, cero lógica nueva — se hace junto para que la revisión lo vea como un solo movimiento.
4. **T4 comportamiento web con prueba RTL**: M-9, M-14, invalidación del otro extremo, raíces
   plegadas.
5. **T5 interfaz que se mide**: Espacio en el menú, `aria-disabled`, temporales, frase del hilo,
   `Toolbar`, 80 caracteres, `sm`. Cada una con su RTL; Playwright solo en `dados.spec.ts`,
   `bestiario.spec.ts` y `mundo-arbol.spec.ts` si existen las pantallas ahí (T5 dice cuáles).
6. **T6 cajón del registro**: `IconoPunta` + contador. Se mide en navegador (dirección de la punta).
7. **T7 higiene de e2e**: `data-casilla`, `toBe(5)`, comentario «Vel.». Va después de T6 para que
   la suite de `hoja.spec.ts` corra una sola vez con todo dentro.
8. **T8 EM-1**: la más cara (un e2e nuevo de mesa). Al final: si el día se acaba, es lo único que
   puede quedarse fuera sin dejar nada a medias.
9. **T9 documentación de la tanda + revisión Opus + ola**.

## §2 · Lo que necesita al autor (no bloquea T1–T9; se pregunta al empezar y se aplica en T9 o queda en ficha)

| # | Pregunta | Recomendación |
|---|---|---|
| P-1 | Cajón del registro bajo ~700 px de alto de ventana: ¿cede el registro (quitar `min-h-[14rem]` y dejar que `32vh` mande) o cede el marco? | **Cede el registro**: D-CF de la ronda 2 del 2026-09-12 ya dijo «el tablero domina el registro». Cambio de una clase, se mide a 1280×700. Si dices sí, entra en T6 |
| P-2 | Los cuatro de layout del árbol del mundo (anillo ≥ 9, «Leer más», chip «Sin hilos», editor bajo el pliegue): ¿se miran ahora en navegador contigo delante, o se dejan en ficha hasta que el árbol se vuelva a tocar? | **Ficha**: son «lo que solo se juzga usándolo», ninguno tiene coste hoy (una mesa de 5 no llega a 9 vecinos), y 3A.2 no toca el árbol. Se dejan en 06 con esta línea |
| P-3 | M-5: `of` opcional (la web dice «Intento 2» sin «de N» cuando la regla ya no es `DADOS`) frente a `of` = número de intentos que había cuando se tiró (habría que guardarlo en la fila: migración). | **Opcional**, sin migración: el dato «de cuántos» solo importa mientras se tira, y entonces la regla es `DADOS` y `of` viaja |

Si no contestas, T1 toma P-3 = opcional (viable, reversible sin migración), T6 no toca el `min-h`
y los cuatro de P-2 se quedan en 06 con la línea de arriba.

---

## Task 0: Árbol aislado y ledger

**Files:**
- Create: `.superpowers/sdd/2026-09-17-cierre-antes-de-3a2/progress.md` (local, en `.gitignore`)

- [ ] **Step 1: Crear el worktree desde `main` al día**

```bash
cd "C:/Users/gogam/Desktop/Trabajo/Mine/D&D-Plataform"
git fetch origin
git status --short   # debe estar vacío
git worktree add -b cierre/antes-de-3a2 ../dnd-cierre-antes-de-3a2 main
cd ../dnd-cierre-antes-de-3a2
pnpm install --frozen-lockfile
```

Expected: `pnpm install` termina sin cambios en el lockfile.

- [ ] **Step 2: Comprobar Postgres y el puerto**

```bash
docker compose up -d
netstat -ano | grep ':3000 ' || echo "3000 libre"
```

Si `:3000` está ocupado por otro proceso: **no matarlo** (memoria «Playwright reutiliza el puerto
ajeno»): exportar `WORKTREE_SLOT=1` en cada comando de e2e de este árbol.

- [ ] **Step 3: Ledger**

Escribir en `.superpowers/sdd/2026-09-17-cierre-antes-de-3a2/progress.md`:

```markdown
# Cierre antes de 3A.2 — ledger
Rama `cierre/antes-de-3a2`, worktree `../dnd-cierre-antes-de-3a2`. Una línea por tarea: fecha, commit, verify (sí/no), Playwright corrido (ficheros).
```

---

## Task 1: RM-2 en el servidor — `of` opcional, `list` parseado, `attemptId` fuera de `DADOS`, concurrencia

**Files:**
- Modify: `packages/shared/src/table-rules.schema.ts:102-126`
- Modify: `apps/api/src/characters/ability-rolls.service.ts:133-175`
- Modify: `apps/api/src/characters/character-sheet.service.ts:975-990`
- Modify: `apps/web/src/features/character-sheet/AsignarCaracteristicas.tsx:508-510`
- Test: `apps/api/src/characters/ability-rolls.service.spec.ts`
- Test: `apps/api/src/characters/character-sheet.service.spec.ts`
- Test: `apps/api/test/reglas-de-la-mesa.e2e-spec.ts`

**Interfaces:**
- Produces: `abilityRollAttemptSchema.of` pasa de `z.number().int().min(1)` a
  `z.number().int().min(1).optional()`. `AbilityRollAttemptDto.of?: number`.

- [ ] **Step 1: Unitaria que falla — `list` devuelve `of` ausente cuando la regla no es `DADOS`, y cada fila pasa por el esquema**

Añadir a `ability-rolls.service.spec.ts`, dentro del `describe` existente (leer primero cómo se
construye el servicio y sus mocks en ese fichero; reutilizar el mismo `beforeEach`):

```ts
it("list: con la regla en MATRIZ las filas no llevan `of` (M-5) y cada una cumple abilityRollAttemptSchema (M-4)", async () => {
  prisma.campaign.findUnique.mockResolvedValue({
    tableRules: { abilities: { metodo: "MATRIZ" } },
  });
  prisma.abilityRollAttempt.findMany.mockResolvedValue([
    {
      id: "a1",
      characterId: "c1",
      values: [15, 14, 13, 12, 10, 8],
      chosen: false,
      rollEventIds: ["e1", "e2", "e3", "e4", "e5", "e6"],
      createdAt: new Date("2026-09-17T10:00:00Z"),
    },
  ]);
  prisma.gameEvent.findMany.mockResolvedValue(
    ["e1", "e2", "e3", "e4", "e5", "e6"].map((id, i) => ({
      id,
      payload: {
        expression: "4d6kh3",
        rolls: [6, 5, 4, 1],
        kept: [6, 5, 4],
        dropped: [1],
        modifier: 0,
        total: 15 - i,
      },
    })),
  );

  const filas = await service.list("dm", "camp", "c1");

  expect(filas).toHaveLength(1);
  expect(filas[0].of).toBeUndefined();
  expect(() => abilityRollAttemptSchema.parse(filas[0])).not.toThrow();
});
```

Importar `abilityRollAttemptSchema` de `@dnd/shared` en el spec. Ajustar los nombres de los mocks
(`prisma.campaign…`) a los que use el fichero — mirar `reglaDe()` en el servicio para saber qué
consulta hace.

- [ ] **Step 2: Correr y ver el rojo**

```bash
pnpm --filter @dnd/api test -- ability-rolls.service
```

Expected: FAIL — `expected 0 to be undefined` (hoy `of` es `0`).

- [ ] **Step 3: Esquema — `of` opcional**

En `packages/shared/src/table-rules.schema.ts`, sustituir la línea `of: z.number().int().min(1),`
por:

```ts
  /**
   * De cuántos intentos permitía la regla **cuando la lista se pide**. Opcional (M-5, 2026-09-17):
   * si el DM cambió después la regla a MATRIZ o PUNTOS, los intentos ya tirados siguen existiendo
   * y no hay ningún «de N» honesto que ponerles — antes se mandaba `0`, que este mismo esquema
   * prohíbe con `min(1)`. Sin migración a propósito: el número solo importa mientras se tira, y
   * entonces la regla es DADOS y el campo viaja.
   */
  of: z.number().int().min(1).optional(),
```

- [ ] **Step 4: Servicio — `of` ausente y `parse` a la salida**

En `ability-rolls.service.ts`, `list()`: sustituir

```ts
    const of = regla.abilities.metodo === "DADOS" ? regla.abilities.intentos : 0;
```

por

```ts
    const of = regla.abilities.metodo === "DADOS" ? regla.abilities.intentos : undefined;
```

y el `return filas.map((f, i) => ({ … }))` completo por:

```ts
    // M-4 (2026-09-17): la fila releída del `payload` pasa por el esquema compartido en vez de
    // moldearse a mano — si el registro guardó algo con otra forma, que reviente aquí con el
    // nombre del campo y no en la pantalla como `undefined`.
    return filas.map((f, i) => {
      const dto = {
        id: f.id,
        values: f.values,
        chosen: f.chosen,
        attempt: i + 1,
        ...(of === undefined ? {} : { of }),
        createdAt: f.createdAt.toISOString(),
        rolls: (f.rollEventIds as string[]).map((id) => {
          const p = porId.get(id)?.payload as Record<string, unknown>;
          return {
            eventId: id,
            expression: p.expression,
            rolls: p.rolls,
            kept: p.kept,
            dropped: p.dropped,
            dice: p.dice,
            modifier: p.modifier,
            total: p.total,
            natural: "NONE",
            outcome: "NO_DC",
          };
        }),
      };
      return abilityRollAttemptSchema.parse(dto);
    });
```

Importar `abilityRollAttemptSchema` de `@dnd/shared` en el servicio. Comprobar que `roll()` (el
`POST`) también devuelve por el esquema: si construye el DTO a mano, envolverlo igual en
`abilityRollAttemptSchema.parse(...)`.

- [ ] **Step 5: Web — «Intento N» sin «de»**

En `AsignarCaracteristicas.tsx:509`:

```tsx
        Intento {intento.attempt}
        {intento.of !== undefined ? ` de ${intento.of}` : ""}
```

- [ ] **Step 6: Correr la unitaria en verde**

```bash
pnpm --filter @dnd/api test -- ability-rolls.service
```

Expected: PASS.

- [ ] **Step 7: Unitaria que falla — `attemptId` con `MATRIZ` → 400**

En `character-sheet.service.spec.ts`, junto a las pruebas existentes de `updateSheet` con reglas
de la mesa (buscar `MATRIZ` en el fichero para copiar el arranque de la campaña y el personaje):

```ts
it("updateSheet: con la regla en MATRIZ un `attemptId` se rechaza con 400 en vez de marcar un intento caduco", async () => {
  // Arranque igual que la prueba de MATRIZ de arriba (campaña con tableRules MATRIZ, personaje sin
  // características); copiar esos mocks aquí.
  await expect(
    service.updateSheet("owner", "camp", "c1", {
      attemptId: "intento-viejo",
      abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    }),
  ).rejects.toMatchObject({
    status: 400,
    message: "Con esta regla las características no se tiran con dados: manda las seis sin attemptId.",
  });
  expect(prisma.abilityRollAttempt.findFirst).not.toHaveBeenCalled();
});
```

Ajustar `status`/`message` a cómo el spec comprueba hoy los `BadRequestException` (mirar un
`rejects.toThrow(BadRequestException)` existente y seguir su forma).

- [ ] **Step 8: Correr y ver el rojo**

```bash
pnpm --filter @dnd/api test -- character-sheet.service
```

Expected: FAIL (hoy `requireAttempt` corre y lanza 404 o marca el intento).

- [ ] **Step 9: Servicio — la puerta**

En `character-sheet.service.ts`, justo después de `if (regla.abilities.metodo !== "LIBRE") {` (línea
~937) y antes del `let arbitrajeDelDM = false;`:

```ts
        // RM-2 (2026-09-17): un `attemptId` solo significa algo con dados. Con MATRIZ o PUNTOS
        // seguía llegando a `requireAttempt` y marcaba `chosen` un intento de una regla anterior
        // — una fila caduca que después bloqueaba al dueño («Las características se fijaron con
        // dados») en una mesa que ya no tira.
        if (regla.abilities.metodo !== "DADOS" && input.attemptId) {
          throw new BadRequestException(
            "Con esta regla las características no se tiran con dados: manda las seis sin attemptId.",
          );
        }
```

- [ ] **Step 10: Correr en verde**

```bash
pnpm --filter @dnd/api test -- character-sheet.service
```

Expected: PASS.

- [ ] **Step 11: e2e — concurrencia y `attemptId` fuera de `DADOS`**

En `apps/api/test/reglas-de-la-mesa.e2e-spec.ts`, al final del `describe`, dos `it` nuevos que
reutilizan `fijarReglas` y `crearPersonaje` (`:64`, `:73`) y los tokens del fichero (leer
`:18-60` para saber cómo se llaman `s`, `tokenDM`, `tokenJugador`, `campaignId`):

```ts
  it("DADOS con intentos: 1 — dos POST a la vez: exactamente un 201 y un 409 (cerrojo FOR UPDATE)", async () => {
    await fijarReglas({ abilities: { metodo: "DADOS", expresion: "4d6kh3", intentos: 1 } });
    const characterId = await crearPersonaje("Carrera");
    const url = `/campaigns/${campaignId}/characters/${characterId}/ability-rolls`;

    const [a, b] = await Promise.all([
      request(s).post(url).set("Authorization", `Bearer ${tokenDM}`),
      request(s).post(url).set("Authorization", `Bearer ${tokenDM}`),
    ]);

    const codigos = [a.status, b.status].sort();
    expect(codigos).toEqual([201, 409]);
    const lista = await request(s).get(url).set("Authorization", `Bearer ${tokenDM}`);
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(1);
  });

  it("MATRIZ: mandar las seis con un `attemptId` → 400 con la frase, y ningún intento queda marcado", async () => {
    await fijarReglas({ abilities: { metodo: "MATRIZ" } });
    const characterId = await crearPersonaje("Sin dados");
    const res = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        attemptId: "cualquiera",
        abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("no se tiran con dados");
  });
```

Si el `PATCH` de la hoja no es `…/sheet` en este fichero, copiar la ruta del `it` de MATRIZ (`:113`).
Comprobar en `roll()` que el segundo POST con el cerrojo tomado devuelve **409** y no 400 (`:66-130`);
si devuelve otro código, el test dice cuál es la verdad y se ajusta **el test**, no el servicio.

- [ ] **Step 12: Correr los e2e tocados**

```bash
pnpm --filter @dnd/api test:e2e -- reglas-de-la-mesa
```

Expected: todos PASS, incluidos los dos nuevos. Pegar la salida en el ledger.

- [ ] **Step 13: Archivo de fichas + verify + commit**

Crear `docs/_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md` con la cabecera:

```markdown
# Pendientes cerrados el 2026-09-17 — tanda «cierre antes de 3A.2»

Movidas enteras desde `06-pendientes.md` al cerrarlas en la rama `cierre/antes-de-3a2`. Plan y
triaje en `superpowers/plans/2026-09-17-cierre-antes-de-3a2.md` (§0 dice qué se midió en cada una
y por qué las marcadas **F**/**D** se cierran sin código). Ver `07-historial.md`, «Cierre antes de 3A.2».
```

Mover **entera** la sección `### RM-2 · …` de `06-pendientes.md` al archivo, con una línea de cierre
encima (`> **Cerrada el 2026-09-17** en T1 de la tanda: M-4, M-5, `attemptId` y el e2e de concurrencia
en el servidor; M-6, M-7, M-8, M-12 en T3; M-9 y M-14 en T4.`). Como RM-2 se termina en T4, la sección
se mueve **en T4**; en T1 solo se añade al final de RM-2 en 06 la línea «M-4, M-5, `attemptId` y
concurrencia: cerradas en T1 (`<commit>`)». Añadir el fichero nuevo del archivo a la lista de
archivos de la cabecera de `06-pendientes.md`.

```bash
pnpm verify
```

(timeout de la herramienta: 600000, primer plano). Expected: verde. Luego:

```bash
git add -A
git commit -m "fix(api): ability rolls — optional \`of\`, parsed list, reject attemptId outside DADOS, concurrency e2e

Closes RM-2 M-4/M-5 and the two server items. \`of\` is optional because 0 violated the
schema's own min(1) once the table switched away from dice; no migration on purpose.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Contrato de dados — tope real de `dice` y empate declarado

**Files:**
- Modify: `packages/shared/src/roll.schema.ts:186`
- Modify: `packages/shared/src/game-event.schema.ts:301`
- Create: `packages/shared/src/dice-limits.ts`
- Modify: `packages/shared/src/index.ts` (exportar)
- Modify: `apps/api/src/dice/dice.ts:278-284`
- Test: `apps/api/src/dice/dice.spec.ts`

- [ ] **Step 1: Unitaria que falla — el tope compartido cubre lo que el evaluador puede producir**

En `dice.spec.ts`:

```ts
import { MAX_DADOS_POR_TIRADA } from "@dnd/shared";

describe("contrato de `dice` (2026-09-17)", () => {
  it("el tope del esquema cubre el peor caso del evaluador: términos × dados × relanzar una vez", () => {
    expect(DICE_LIMITS.maxTerms * DICE_LIMITS.maxDicePerTerm * 2).toBeLessThanOrEqual(
      MAX_DADOS_POR_TIRADA,
    );
  });

  it("100d6r1 con todo unos produce 200 dados y el esquema los acepta", () => {
    let llamadas = 0;
    const roller: Roller = () => (llamadas++ < 100 ? 1 : 6);
    const r = rollExpression("100d6r1", roller);
    const dice = dadosTirados(r.terms);
    expect(dice).toHaveLength(200);
    expect(() => rollResultSchema.shape.dice.parse(dice)).not.toThrow();
  });

  it("empate en kh: se conserva el primero en caer (sort estable), siempre el mismo", () => {
    const r = rollExpression("2d20kh1", () => 15);
    const dice = dadosTirados(r.terms);
    expect(dice.map((d) => d.kept)).toEqual([true, false]);
  });
});
```

Importar `rollResultSchema` de `@dnd/shared` y `dadosTirados` de `./dice` si no están.

- [ ] **Step 2: Rojo**

```bash
pnpm --filter @dnd/api test -- dice.spec
```

Expected: FAIL — `MAX_DADOS_POR_TIRADA` no existe; y `.max(100)` rechaza 200.

- [ ] **Step 3: Shared — la constante y los dos esquemas**

`packages/shared/src/dice-limits.ts`:

```ts
/**
 * Cuántos dados puede traer una tirada como mucho. Es el producto de los límites del evaluador
 * (`apps/api/src/dice/dice.ts`, `DICE_LIMITS`): 10 términos × 100 dados × 2 (cada dado se relanza
 * UNA vez como mucho). Vive aquí porque el esquema de la respuesta lo necesita y `@dnd/shared` no
 * importa de la API; `dice.spec.ts` comprueba que los dos números no se separen.
 *
 * Hasta el 2026-09-17 el tope era 100 y ya lo superaba `100d6+100d6` sin relanzar: nadie parseaba
 * la salida, así que no rompía, pero el contrato mentía.
 */
export const MAX_DADOS_POR_TIRADA = 2000;
```

Exportarla desde `packages/shared/src/index.ts`. En `roll.schema.ts:186` y `game-event.schema.ts:301`:

```ts
  dice: z.array(dieRolledSchema).max(MAX_DADOS_POR_TIRADA).optional(),
```

- [ ] **Step 4: Evaluador — el empate, dicho**

En `dice.ts`, antes de `porValor.sort(...)` (línea ~283):

```ts
  // **Empate**: `Array.prototype.sort` es estable (ES2019), así que dos dados iguales quedan en el
  // orden en que cayeron y se conserva el primero. No cambia la suma; fija cuál se pinta tachado.
```

- [ ] **Step 5: Verde**

```bash
pnpm --filter @dnd/shared build && pnpm --filter @dnd/api test -- dice.spec
```

Expected: PASS ×3.

- [ ] **Step 6: Archivo + verify + commit**

Mover las dos filas «Dados · empate» y «Dados · `100d6r1`» de la tabla de 06 al archivo (como una
subsección `### Dados — empate y tope de dice (cerradas en T2)` con las dos filas y la línea de
cierre). `pnpm verify` (primer plano, 600000). Commit:

```
fix(shared): dice cap matches the evaluator (2000), stable tie-break documented

Closes two minor tickets from the 2026-09-13 review. 100d6r1 legally yields 200 dice.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 3: Mover código sin cambiar comportamiento (web)

**Files:**
- Modify: `apps/web/src/features/character-sheet/hooks.ts:129-133` (M-6)
- Modify: `packages/shared/src/character.schema.ts:55` y `apps/web/src/features/characters/CharacterEditor.tsx:105-115` (M-7)
- Modify: `apps/web/src/features/character-sheet/AsignarCaracteristicas.tsx:515` (M-8)
- Modify: `apps/web/src/features/character-sheet/IdentidadEditable.tsx:33,248` (M-12)
- Modify: `apps/web/src/features/rolls/vocabulario.ts:99-125` y `apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx:80-96` (#6)
- Delete: `apps/web/src/features/rolls/DadoDibujado.tsx`; Modify: sus 9 importadores (#8)
- Modify: `apps/web/src/features/rolls/expresion.ts:26` y `__tests__/expresion.test.ts` (#10)
- Rename: `apps/web/src/features/sessions/elenco/CorregirBando.tsx` → `accionesDeBando.ts` (#11) y sus 3 importadores
- Create: `apps/web/src/lib/texto.ts`; Modify: `inventory/filtrarObjetos.ts:26`, `taller/mundo/DesgloseDelMundo.tsx:42`, `taller/mundo/EditorDeHilos.tsx:50` (#9)
- Modify: `apps/web/src/features/character-sheet/api.ts:37-70` (`entityId`)

Sin pruebas nuevas salvo la de `vocabulario` (#6): todo lo demás es mover; las suites existentes
son la red.

- [ ] **Step 1: M-6** — en `hooks.ts` borrar las líneas 130-133 (el comentario «Reglas de la mesa
  (Task 6)…» y su `invalidateQueries`) y ampliar el comentario de la línea 129:

```ts
      // **Y la lista de personajes, que también enseña el nivel** — y, por prefijo, todo lo que
      // cuelga de este personaje: la hoja, los recursos y los intentos de dados
      // (`abilityRollsKey` empieza por esta misma clave), así que `AsignarCaracteristicas` deja
      // de enseñar «Quedarme con este» sin una invalidación aparte (M-6, 2026-09-17).
```

- [ ] **Step 2: M-7** — en `character.schema.ts` tras la línea 55:

```ts
/** Lo que el formulario manda: `z.input` deja `level` opcional (el `default(1)` es del `parse`, no de quien pide). */
export type CreateCharacterFormInput = z.input<typeof createCharacterSchema>;
```

En `CharacterEditor.tsx`: importar `CreateCharacterFormInput`, quitar `as CreateCharacterInput`, tipar
`const payload: CreateCharacterFormInput = {…}` y recortar el comentario de las líneas 108-111 a:
«`CreateCharacterFormInput` es el tipo de ENTRADA del esquema, con `level` opcional (M-7).»
Comprobar que `create.mutateAsync` acepta ese tipo; si la mutación está tipada con `CreateCharacterInput`,
cambiarla a `CreateCharacterFormInput` en `features/characters/hooks.ts` (o donde viva) — el servidor
parsea igual.

- [ ] **Step 3: M-8** — en `AsignarCaracteristicas.tsx:515` quitar `as DesgloseDeTirada` y el import
  si queda sin uso. Si `tsc` protesta por `dice`, hacerlo así en `ResultadoDeTirada.tsx` **no**: el
  DTO de shared ya lo trae opcional; mirar qué campo choca y decirlo en el ledger antes de tocar el tipo.

- [ ] **Step 4: M-12** — en `IdentidadEditable.tsx`: borrar la línea 33, importar
  `ORDEN_DE_CARACTERISTICAS` de `@dnd/shared` y usarla en la 248.

- [ ] **Step 5: #6 `resumen`** — en `vocabulario.ts`, `AudienciaDeTirada` gana:

```ts
  /** La frase corta que resume la elección cuando el panel está plegado: se lee sola, sin el radio. */
  resumen: string;
```

y las tres entradas: `resumen: "Para la mesa entera"`, `resumen: "Privada del DM"`, `resumen: "A ciegas"`.
Añadir `export function audienciaDeTirada(a: RollAudience): AudienciaDeTirada` que busque en
`AUDIENCIAS_DE_TIRADA` y lance si no está (misma forma que `modoDeTirada`, `:37`). En
`PanelDeDadosDeLaMesa.tsx` la función queda:

```ts
function resumenAudienciaYCd(audiencia: RollAudience, cd: string): string {
  const cdTexto = cd.trim() === "" ? "sin CD" : `CD ${cd.trim()}`;
  return `${audienciaDeTirada(audiencia).resumen} · ${cdTexto}`;
}
```

y su comentario de arriba se recorta a una línea: «El resumen vive en `vocabulario.ts` (#6)». Unitaria en
`apps/web/src/features/rolls/__tests__/vocabulario.test.ts` (crear si no existe, junto a las demás):

```ts
import { AUDIENCIAS_DE_TIRADA, audienciaDeTirada } from "../vocabulario";

it("cada audiencia tiene etiqueta, frase y resumen, y audienciaDeTirada las encuentra", () => {
  for (const a of AUDIENCIAS_DE_TIRADA) {
    expect(a.resumen.length).toBeGreaterThan(0);
    expect(audienciaDeTirada(a.audiencia)).toBe(a);
  }
});
```

- [ ] **Step 6: #8** — borrar `DadoDibujado.tsx`; en los 9 importadores
  (`grep -rl DadoDibujado apps/web/src`) sustituir `import { DadoDibujado } from ".../rolls/DadoDibujado"`
  por `import { IconoD20 } from ".../ui/Iconos"` (ruta relativa correcta) y `<DadoDibujado` por `<IconoD20`.
  Llevar el comentario de cabecera de `DadoDibujado.tsx` (la historia de la mudanza) a `IconoD20` en
  `Iconos.tsx` en dos líneas: «Antes existía `DadoDibujado`, envoltorio idéntico (Tarea F3/7); se fundió aquí el 2026-09-17 (#8)».

- [ ] **Step 7: #10** — borrar `conDadoAnadido` de `expresion.ts` y su `describe` en
  `expresion.test.ts`. Antes: `grep -rn conDadoAnadido apps/web/src` debe dar solo esos dos.

- [ ] **Step 8: #11** — `git mv apps/web/src/features/sessions/elenco/CorregirBando.tsx
  apps/web/src/features/sessions/elenco/accionesDeBando.ts`; actualizar los imports en
  `FichaDeElenco.tsx`, `FichaDePnj.tsx`, `MandosDeCombatiente.tsx`. Si el fichero tiene JSX, se queda
  `.tsx` (`accionesDeBando.tsx`).

- [ ] **Step 9: #9** — crear `apps/web/src/lib/texto.ts`:

```ts
/**
 * «Poción» y «pocion» son la misma búsqueda: se quitan las marcas diacríticas y las mayúsculas.
 * Una sola copia (#9, 2026-09-17): antes vivía repetida en el inventario y dos veces en el árbol del
 * mundo. La de `wikilinks.ts` NO es esta — además pliega espacios — y se queda allí.
 */
export function normalizarTexto(texto: string): string {
  // El rango de marcas diacríticas se escribe escapado: los dos caracteres combinantes en crudo
  // eran invisibles en el editor y un formateador los podía «arreglar».
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
```

Comprobar que la de `filtrarObjetos.ts:26-32` hace exactamente eso (incluido `.trim()`); si no
hace `trim`, la nueva tampoco (comportamiento igual). En `filtrarObjetos.ts`: `export { normalizarTexto } from "../../lib/texto";`
si otros la importan de ahí, o cambiar sus imports. En `DesgloseDelMundo.tsx` y `EditorDeHilos.tsx`:
borrar `normalizar` local, importar `normalizarTexto as normalizar`.

- [ ] **Step 10: `CharacterRow.entityId`** — en `api.ts`, tras `subclassKey`:

```ts
  /**
   * La ficha del mundo de este personaje, si la tiene y quien lee puede verla (`entityIdsVisibleFor`
   * la redacta en el servidor). `null` = sin ficha o sin permiso de verla. Declarado el 2026-09-17:
   * el servidor ya lo mandaba y nadie lo leía.
   */
  entityId: string | null;
```

- [ ] **Step 11: Suites web + verify**

```bash
pnpm --filter @dnd/web test
pnpm verify
```

Expected: verde. Ningún cambio de comportamiento → **sin Playwright** en esta tarea.

- [ ] **Step 12: Archivo + commit**

Mover al archivo las filas cerradas: #6, #8, #9, #10, #11 y `CharacterRow.entityId` (subsección
`### Mover código (cerradas en T3)`). Añadir en RM-2 (06) la línea «M-6, M-7, M-8, M-12: cerradas en T3».

```
refactor(web): fold duplicates — IconoD20, normalizarTexto, audience summary, accionesDeBando

No behaviour change. Closes review minors #6, #8, #9, #10, #11 and RM-2 M-6/M-7/M-8/M-12;
declares CharacterRow.entityId.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 4: Comportamiento web con prueba RTL — M-9, M-14, el otro extremo del hilo, raíces plegadas

**Files:**
- Modify: `apps/web/src/features/campaigns/ReglasDeLaMesa.tsx:50-70`
- Test: `apps/web/src/features/campaigns/__tests__/ReglasDeLaMesa.test.tsx`
- Modify: `apps/web/src/features/links/hooks.ts:45-54`; `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx:207,287`
- Test: `apps/web/src/features/links/__tests__/hooks.test.ts` (crear si no existe)
- Modify: `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx` (estado inicial de plegado)
- Test: `apps/web/src/features/sessions/taller/mundo/__tests__/DesgloseDelMundo.test.tsx`

- [ ] **Step 1: M-9 — RTL que falla**

En `ReglasDeLaMesa.test.tsx` (leer cómo monta `montar()` y cómo captura `update.mutate`):

```tsx
it("M-9: un campo numérico vacío o fuera de rango no se manda — se explica en español", async () => {
  const { mutate } = montar({ abilities: { metodo: "PUNTOS", puntos: 27 } });
  const puntos = screen.getByLabelText(/puntos/i);
  fireEvent.change(puntos, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
  expect(mutate).not.toHaveBeenCalled();
  expect(screen.getByText("Los puntos a repartir van de 15 a 40.")).toBeInTheDocument();
});
```

Ajustar `getByLabelText` al rótulo real del campo (leer `:100-110`).

- [ ] **Step 2: Rojo** — `pnpm --filter @dnd/web test -- ReglasDeLaMesa`. Expected: FAIL (hoy manda `puntos: 0`).

- [ ] **Step 3: M-9 — la comprobación**

En `ReglasDeLaMesa.tsx`, arriba del componente:

```ts
/** Rangos del esquema (`tableRulesSchema`), dichos en español ANTES de mandar: `Number("")` es 0 y
 * volvía como un 400 técnico de Zod. Si el esquema cambia, cambia aquí — y el 400 sigue detrás. */
function motivoDeRango(b: TableRules): string | null {
  if (b.abilities.metodo === "PUNTOS" && (b.abilities.puntos < 15 || b.abilities.puntos > 40))
    return "Los puntos a repartir van de 15 a 40.";
  if (b.abilities.metodo === "DADOS" && (b.abilities.intentos < 1 || b.abilities.intentos > 10))
    return "Los intentos van de 1 a 10.";
  if (b.nivelInicial < 1 || b.nivelInicial > 20) return "El nivel inicial va de 1 a 20.";
  if (b.oroInicial.modo === "ORO_FIJO" && (b.oroInicial.cantidadPo < 0 || b.oroInicial.cantidadPo > 100000))
    return "El oro fijo va de 0 a 100 000 po.";
  return null;
}
```

y en `onGuardar`, tras `setError(null)`:

```ts
    const motivo = motivoDeRango(borrador);
    if (motivo) {
      setError(motivo);
      return;
    }
```

Comprobar los cuatro rangos contra `table-rules.schema.ts:57,61,74,80` antes de escribirlos: si alguno
difiere, manda el esquema.

- [ ] **Step 4: M-14 — RTL que falla**

```tsx
it("M-14: si llegan reglas nuevas del servidor y el DM no ha tocado nada, el borrador se re-siembra", () => {
  const { rerender } = montarConRerender({ nivelInicial: 1 });
  rerender({ nivelInicial: 3 });
  expect(screen.getByLabelText(/nivel inicial/i)).toHaveValue(3);
});

it("M-14: si el DM está editando, un refetch no le pisa lo tecleado", () => {
  const { rerender } = montarConRerender({ nivelInicial: 1 });
  fireEvent.change(screen.getByLabelText(/nivel inicial/i), { target: { value: "5" } });
  rerender({ nivelInicial: 3 });
  expect(screen.getByLabelText(/nivel inicial/i)).toHaveValue(5);
});
```

`montarConRerender` = el `montar` del fichero devolviendo también `rerender` de RTL con las mismas
props salvo `reglas`.

- [ ] **Step 5: M-14 — el re-sembrado**

Sustituir el bloque `seededId` (`:53-63`) por:

```ts
  // Re-sembrar cuando cambien las reglas de fuera (otra campaña, o el servidor devolvió las
  // normalizadas tras guardar) **y no haya edición en curso**. `sucio` se enciende al primer cambio
  // del DM y se apaga al guardar con éxito: un refetch nunca pisa lo que está tecleando (M-14).
  const [sucio, setSucio] = useState(false);
  useEffect(() => {
    if (!sucio) setBorrador(reglas);
  }, [reglas, sucio]);
  const editar = (siguiente: TableRules) => {
    setSucio(true);
    setBorrador(siguiente);
  };
```

Sustituir cada `setBorrador({...borrador, …})` del JSX por `editar({...borrador, …})`, y en `onGuardar`
pasar `{ onSuccess: () => setSucio(false), onError: … }`. Correr `pnpm --filter @dnd/web test -- ReglasDeLaMesa` → PASS.

- [ ] **Step 6: Otro extremo del hilo — la firma**

En `links/hooks.ts`, `useDeleteLink` recibe el enlace, no el id:

```ts
export function useDeleteLink(entityId: string, campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (link: { id: string; otherEntityId: string }) => deleteLink(link.id),
    onSuccess: (_data, link) => {
      qc.invalidateQueries({ queryKey: linksKey(entityId) });
      // **Y el otro extremo**: el hilo es de dos fichas; sin esto la de enfrente se quedaba con el
      // hilo fantasma hasta recargar (revisión final 2026-09-13, cerrada el 2026-09-17).
      qc.invalidateQueries({ queryKey: linksKey(link.otherEntityId) });
      qc.invalidateQueries({ queryKey: campaignLinksKey(campaignId) });
    },
  });
}
```

En `EditorDeHilos.tsx:287`: `quitar.mutate({ id: vecino.hiloId, otherEntityId: vecino.id }, …)` —
comprobar en el tipo de `vecino` cómo se llama el id de la ficha de enfrente. Buscar otros
`useDeleteLink(` en `apps/web/src` y adaptarlos. Test en `links/__tests__/hooks.test.ts`:

```ts
it("borrar un hilo invalida las dos fichas y la lista de campaña", async () => {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, "invalidateQueries");
  vi.spyOn(api, "deleteLink").mockResolvedValue(undefined);
  const { result } = renderHook(() => useDeleteLink("A", "camp"), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  await act(() => result.current.mutateAsync({ id: "h1", otherEntityId: "B" }));
  expect(spy).toHaveBeenCalledWith({ queryKey: linksKey("A") });
  expect(spy).toHaveBeenCalledWith({ queryKey: linksKey("B") });
});
```

(`api` = el módulo que exporta `deleteLink`; mirar el import en `hooks.ts`.)

- [ ] **Step 7: Raíces sin hijos plegadas**

En `DesgloseDelMundo.tsx`, localizar el estado de abierto/plegado por nodo (`grep -n "abiert\|plegad\|expand" …`).
Si el valor inicial es «abierto para las raíces», cambiar a: abierta solo si **tiene hijos**. RTL:

```tsx
it("una raíz sin hijos nace plegada; una con hijos, abierta", () => {
  montar({ arbol: [{ id: "solo" , hijos: [] }, { id: "padre", hijos: [{ id: "h1", hijos: [] }] }] });
  expect(screen.getByRole("button", { name: /solo/i })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: /padre/i })).toHaveAttribute("aria-expanded", "true");
});
```

Adaptar `montar` y los nombres a la forma real del árbol en el fichero. **Si el plegado depende de
medir en pantalla y no de un estado**, no tocar: anotar en el ledger y dejar la fila en 06 como P-2.

- [ ] **Step 8: Playwright en lo tocado + verify + commit**

```bash
WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test mundo-arbol.spec.ts
pnpm verify
```

Mover al archivo: la sección RM-2 entera (ya con la línea de cierre que resume T1/T3/T4), y las filas
«Mundo · borrar un hilo…» y «Mundo · raíces sin hijos…».

```
fix(web): table rules validate ranges in Spanish and reseed when idle; deleting a link refreshes both ends

Closes RM-2 (M-9, M-14) and two mundo minors. Roots without children start collapsed.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 5: Interfaz que se mide — menú, ventaja, temporales, hilo, catálogo, 80 caracteres, `sm`

**Files:**
- Modify: `apps/web/src/ui/MenuDeAcciones.tsx:98-135,161`; Test: `apps/web/src/ui/__tests__/MenuDeAcciones.test.tsx`
- Modify: `apps/web/src/features/rolls/BandejaDeDados.tsx:238-247` y `SelectorDeVentaja` (mismo fichero, `:40-200`); Test: `apps/web/src/features/rolls/__tests__/BandejaDeDados.test.tsx`
- Modify: `apps/web/src/features/bestiario/DarTemporales.tsx:77`; Test: `apps/web/src/features/bestiario/__tests__/DarTemporales.test.tsx`
- Modify: `apps/web/src/features/sessions/linea-de-log.ts:206-207`; Test: `apps/web/src/features/sessions/__tests__/linea-de-log.test.ts`
- Modify: `apps/web/src/features/campaign-items/CampaignItemsCatalogPage.tsx:150-190`
- Modify: `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx` (campo de rótulo libre); Test: `__tests__/EditorDeHilos.test.tsx`
- Modify: `apps/web/src/features/characters/AjustesDePersonaje.tsx:179,184`

- [ ] **Step 1: Espacio una sola vez — RTL que falla**

```tsx
it("Espacio activa el ítem UNA vez: keydown no dispara, keyup sí, y el click nativo no suma", () => {
  const onSelect = vi.fn();
  montar([{ id: "a", etiqueta: "Atacar", onSelect }]);
  fireEvent.click(screen.getByRole("button", { name: /acciones/i }));
  const menu = screen.getByRole("menu");
  fireEvent.keyDown(menu, { key: " " });
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.keyUp(menu, { key: " " });
  expect(onSelect).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: El cambio** — en `alTeclear`, la rama `Enter || " "` pasa a solo `Enter`; añadir:

```ts
  // **Espacio se resuelve en keyup, no en keydown.** El `<button>` nativo dispara su `click` al
  // soltar Espacio (Enter lo dispara al pulsar): manejarlo en keydown y llamar `click()` a mano
  // dejaba dos disparos posibles. Los dos `preventDefault` cortan el nativo en ambos eventos.
  const alSoltar = (e: React.KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      itemsRef.current[activo]?.click();
    }
  };
```

y en `alTeclear`: `else if (e.key === " ") { e.preventDefault(); }` (solo cortar el nativo). En el
`ul` (`:161`): `onKeyDown={alTeclear} onKeyUp={alSoltar}`. Recortar el comentario de `:119-122`.

- [ ] **Step 3: Tab — descartada con cita**, en el mismo fichero, junto a la rama `Tab`:

```ts
      // Tab NO se previene a propósito: el patrón *Menu Button* de WAI-ARIA APG dice «Tab: closes
      // the menu and moves focus to the next element in the tab sequence». (Ficha de la revisión
      // final 2026-09-13, descartada el 2026-09-17.)
```

- [ ] **Step 4: `SelectorDeVentaja` alcanzable — RTL que falla**

```tsx
it("apagado, el radio sigue alcanzable por teclado, dice por qué y no cambia el modo", () => {
  const onModoChange = vi.fn();
  montar({ modo: "NORMAL", onModoChange, valor: bandejaSinD20 });
  const radio = screen.getByRole("radio", { name: /ventaja/i });
  expect(radio).not.toBeDisabled();
  expect(radio).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("radiogroup", { name: "Ventaja" })).toHaveAccessibleDescription(
    "Solo con un d20 al principio de la tirada.",
  );
  fireEvent.click(radio);
  expect(onModoChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: El cambio** — en `SelectorDeVentaja` (leer `:40-200` entero antes): cada `<input
  type="radio">` pasa de `disabled={disabled}` a `aria-disabled={disabled || undefined}`, con
  `onChange={(e) => { if (disabled) return; onChange(...) }}` y clases `aria-disabled:cursor-not-allowed
  aria-disabled:text-muted` en vez de `disabled:…`. En `BandejaDeDados.tsx:238-247`: `<div role="radiogroup"
  aria-label="Ventaja" aria-describedby={ofreceVentaja ? undefined : "ventaja-motivo"}>` y el `<p>` gana
  `id="ventaja-motivo"`. Si `SelectorDeVentaja` se usa en otro sitio con `disabled` (grep), el cambio
  vale igual.

- [ ] **Step 6: `DarTemporales` — RTL que falla**

```tsx
it("si la petición falla, la pregunta se cierra y el error se lee; el siguiente «Dárselos» vuelve a preguntar", async () => {
  montar({ tempHp: 5 });                       // ya tiene temporales → preguntará
  fijarMock.mockRejectedValueOnce(new Error("Sin permiso"));
  fireEvent.change(screen.getByLabelText(/temporales/i), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: /dárselos/i }));
  fireEvent.click(await screen.findByRole("button", { name: /quedarse con los 8/i }));
  expect(await screen.findByText("Sin permiso")).toBeInTheDocument();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});
```

Cambio en `:77`: `{ onSettled: () => setPreguntando(false), onError: (e) => setError((e as Error).message) }`.

- [ ] **Step 7: Frase del hilo con sujeto — unitaria que falla**

En `linea-de-log.test.ts`, junto a las de `HP_CHANGED` con `ctx`:

```ts
it("con sujeto resuelto la frase conserva el (from → to)", () => {
  const frase = lineaDeLog(
    { type: "HP_CHANGED", payload: { from: 20, to: 13, delta: -7, reason: null } },
    { sujeto: "Sylas", sujetoEnCabecera: false, nombres: new Map() },
  );
  expect(frase).toBe("Sylas pierde 7 PG (20 → 13)");
});
```

Adaptar la llamada a la firma real del fichero. Cambio en `:207`:

```ts
        return `${sujetoDeLaFrase}${verbo} ${Math.abs(p.delta)} PG (${p.from} → ${p.to})${tipo}${critico}${origen}${motivo}`;
```

Actualizar las unitarias existentes de esa rama que fijen la frase sin paréntesis (son la misma
verdad, con el número dentro).

- [ ] **Step 8: Catálogo — dos `Toolbar`**: envolver las dos en `<div className="flex flex-col gap-s2">`
  y darles `aria-label="Filtrar por tipo"` / `aria-label="Filtrar por origen"` si `Toolbar` acepta
  `aria-label` (si no, añadir la prop pasándola al `<div role="toolbar">`). Medir en T5 Step 11.

- [ ] **Step 9: Rótulo libre de 80 caracteres**: en el `<input>` del rótulo libre de `EditorDeHilos.tsx`
  (buscar el `Field` cuyo `label` habla de rótulo), `maxLength={80}` y, si `valor.length >= 80`, un
  `hint="Como mucho 80 caracteres; el servidor corta ahí."`. RTL: teclear 81 caracteres → el valor
  tiene 80.

- [ ] **Step 10: `AjustesDePersonaje.tsx:179,184`**: `text-chrome-xs` → `text-chrome-sm`.

- [ ] **Step 11: Suites, Playwright en lo tocado, verify**

```bash
pnpm --filter @dnd/web test
WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test dados.spec.ts bestiario.spec.ts mundo-arbol.spec.ts
```

Y una captura del catálogo de objetos a 1280×800 y a 390 px (abrir con `pnpm dev:web`, o un test
temporal de Playwright que solo saque `page.screenshot`) para ver la separación entre las dos
barras: **se mira**, no se asume. La captura va a `.superpowers/sdd/2026-09-17-cierre-antes-de-3a2/`.

```bash
pnpm verify
```

- [ ] **Step 12: Archivo + commit**

Mover al archivo las filas: Menú (las dos: una A, una D con la cita), `SelectorDeVentaja`, `<details>`
(D), `DarTemporales`, Hilo #5, Catálogo (las dos: una F, una A), 80 caracteres, Ajustes `sm`/`xs`,
`PanelDeDados.test` rejilla (D), `Field.reservaEspacio` (D), `HojaCalculada` regex (D), y las cuatro F
de la hoja/elenco/e2e (`ancho mínimo`, `Dialog`, `campaignId`, `FichaDeElenco`, timeouts).

```
fix(web): space activates a menu item once, advantage radios stay reachable, temp-HP prompt resets

Also: HP line keeps (from → to) with a subject, 80-char cap on free link labels, catalog toolbars
spaced, error text size unified. Closes the 2026-09-13 review minors that measured real.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 6: Cajón del registro — `IconoPunta` único y contador honesto

**Files:**
- Modify: `apps/web/src/ui/Iconos.tsx` (nuevo `IconoPunta`)
- Delete: `apps/web/src/features/sessions/taller/mundo/Punta.tsx`; Modify: `DesgloseDelMundo.tsx`, `EditorDeHilos.tsx` (importadores)
- Modify: `apps/web/src/features/sessions/tablero/CajonDelRegistro.tsx:45-51,81-84`
- Test: `apps/web/src/features/sessions/tablero/__tests__/CajonDelRegistro.test.tsx`

- [ ] **Step 1: RTL que falla — contador con carga tardía**

```tsx
it("plegar antes de que cargue el registro: las líneas que llegan después cuentan como nuevas", () => {
  const { rerender } = render(<CajonDelRegistro eventos={[]}>hilo</CajonDelRegistro>);
  fireEvent.click(screen.getByRole("button", { name: "Registro" }));
  rerender(<CajonDelRegistro eventos={[{ id: "e2" }, { id: "e1" }]}>hilo</CajonDelRegistro>);
  expect(screen.getByRole("button", { name: "Registro, 2 líneas nuevas" })).toBeInTheDocument();
});
```

(`etiqueta` = «Registro»; comprobar en `:66-77`.)

- [ ] **Step 2: El contador**

```ts
  // Plegado sin ninguna línea cargada (`idAlPlegar === null`): todo lo que llegue es nuevo. Antes
  // ese caso devolvía 0 siempre — plegar antes de la primera carga apagaba el contador.
  const nuevas = !plegado
    ? 0
    : idAlPlegar === null
      ? eventos.length
      : (() => {
          const i = eventos.findIndex((e) => e.id === idAlPlegar);
          return i === -1 ? eventos.length : i;
        })();
```

- [ ] **Step 3: `IconoPunta`** en `Iconos.tsx`, junto a las flechas:

```tsx
/**
 * La punta que dice «esto se abre / se cierra». Una silueta para un significado (#7, 2026-09-17):
 * antes había dos — `Punta.tsx` en el árbol del mundo y `IconoFlechaIzquierda` rotada en el cajón
 * del registro. `hacia` es a dónde apunta; quien la usa dice qué significa cada dirección.
 */
export function IconoPunta({
  hacia,
  className,
}: IconoProps & { hacia: "arriba" | "abajo" | "derecha" | "izquierda" }) {
  const giro = { derecha: "", abajo: "rotate-90", izquierda: "rotate-180", arriba: "-rotate-90" }[hacia];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={["h-[1em] w-[1em] shrink-0 transition-transform", giro, className ?? ""].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icono="punta"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}
```

Si los demás iconos del fichero usan un `Marco` común, seguir esa forma en vez de un `<svg>` suelto
(leer `IconoFlechaIzquierda`, `:153`).

- [ ] **Step 4: Sustituir** — `Punta.tsx` se borra; en `DesgloseDelMundo.tsx` y `EditorDeHilos.tsx`,
  `<Punta abierta={x} />` → `<IconoPunta hacia={x ? "abajo" : "derecha"} />`. En `CajonDelRegistro.tsx:81-84`:
  `<IconoPunta hacia={plegado ? "arriba" : "abajo"} className="h-4 w-4" />` (plegado: el cajón está
  abajo y se abre hacia arriba). Si `IconoFlechaIzquierda` se queda sin usos, **no** borrarla sin
  comprobar (`grep`).

- [ ] **Step 5: P-1 (solo si el autor dijo sí)** — en `:72`, `"min-h-[14rem] max-h-[32vh]"` → `"max-h-[32vh]"`,
  y el comentario de `:20-35` gana una línea: «2026-09-17 (P-1): el suelo de 14 rem se quitó — bajo
  700 px de alto el registro cede, el marco no».

- [ ] **Step 6: Medir en el navegador**

```bash
pnpm --filter @dnd/web test -- CajonDelRegistro
WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test mesa-mide.spec.ts mundo-arbol.spec.ts
```

Y captura de la mesa con el cajón plegado y desplegado (la punta debe apuntar arriba plegado, abajo
abierto; en el árbol, derecha plegado y abajo abierto). Guardar en el directorio del ledger.

- [ ] **Step 7: Archivo + verify + commit**

Mover las filas Mesa · chevron y Mesa · contador (y Mesa · `min-h`, si P-1 entró; si no, la fila se
queda en 06 con «P-1 pendiente de decidir»).

```
fix(web): one IconoPunta for every chevron; log drawer counts lines that arrive after folding

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 7: Higiene del e2e de la hoja

**Files:**
- Modify: `apps/web/src/features/character-sheet/ValorDerivado.tsx` (o donde viva la casilla compacta `w-[6rem]`)
- Modify: `apps/web/e2e/hoja.spec.ts:318,339,1013-1014`
- Modify: `apps/web/src/features/character-sheet/__tests__/Cabecera.test.tsx:90`

- [ ] **Step 1: `data-casilla`** — en el elemento de la casilla compacta que lleva `w-[6rem]`
  (`grep -n "w-\[6rem\]" apps/web/src/features/character-sheet/*.tsx`), añadir `data-casilla="derivada"`.
- [ ] **Step 2: Selectores** — `hoja.spec.ts:339`: `cabecera.locator('[data-casilla="derivada"]')`;
  `:1013`: `tira.locator('[data-casilla="derivada"]')`; `:1014`: `expect(cajas.length).toBe(5);`.
  Sobre `:1013` un comentario: «Por dato, no por clase: un cambio de ancho no debe romper el test (revisión 2026-09-13)».
- [ ] **Step 3: «Vel.»** — sobre `hoja.spec.ts:318` y `Cabecera.test.tsx:90`, una línea:
  `// «Vel.» y no «Vel. (pies)»: la unidad baja a la tercera línea de la casilla — motivo en Cabecera.tsx (ronda 2026-09-12).`
- [ ] **Step 4: Correr**

```bash
pnpm --filter @dnd/web test -- Cabecera
WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test hoja.spec.ts
pnpm verify
```

- [ ] **Step 5: Archivo + commit** — mover las cuatro filas Hoja/Casilla.

```
test(web): sheet e2e selects boxes by data-casilla, asserts exactly five, cites the «Vel.» label

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 8: EM-1 — pruebas de los efectos de mesa

**Files:**
- Create: `apps/web/src/features/sessions/elenco/efectos/__tests__/detectarEfectos.test.ts`
- Create: `apps/web/e2e/efectos-de-mesa.spec.ts`

- [ ] **Step 1: Unitarias del detector** (puro, sin DOM):

```ts
import { describe, expect, it } from "vitest";
import { detectarEfectos, type Instantanea } from "../detectarEfectos";

const base: Instantanea = { hp: 20, max: 20, temp: 0, nivel: 1, estado: "alive", condiciones: [] };

describe("detectarEfectos", () => {
  it("la primera lectura no dispara nada", () => {
    expect(detectarEfectos(null, base)).toEqual([]);
  });
  it("daño: delta negativo; fuerte si se lleva ≥ 25 % del máximo", () => {
    expect(detectarEfectos(base, { ...base, hp: 16 })).toEqual([{ tipo: "dano", delta: -4, fuerte: false }]);
    expect(detectarEfectos(base, { ...base, hp: 15 })).toEqual([{ tipo: "dano", delta: -5, fuerte: true }]);
  });
  it("cura y en pie", () => {
    expect(detectarEfectos({ ...base, hp: 0 }, { ...base, hp: 3 })).toEqual([
      { tipo: "cura", delta: 3 },
      { tipo: "en-pie" },
    ]);
  });
  it("temporales solo cuando suben", () => {
    expect(detectarEfectos(base, { ...base, temp: 5 })).toEqual([{ tipo: "temporales", delta: 5 }]);
    expect(detectarEfectos({ ...base, temp: 5 }, { ...base, temp: 2 })).toEqual([]);
  });
  it("cae a 0 sin morir → cae; muere → muerte y no cae", () => {
    expect(detectarEfectos(base, { ...base, hp: 0, estado: "dying" })).toEqual([
      { tipo: "dano", delta: -20, fuerte: true },
      { tipo: "cae" },
    ]);
    expect(detectarEfectos(base, { ...base, hp: 0, estado: "dead" })).toEqual([
      { tipo: "dano", delta: -20, fuerte: true },
      { tipo: "muerte" },
    ]);
  });
  it("nivel solo al subir", () => {
    expect(detectarEfectos(base, { ...base, nivel: 2 })).toEqual([{ tipo: "nivel", nivel: 2 }]);
    expect(detectarEfectos({ ...base, nivel: 2 }, { ...base, nivel: 1 })).toEqual([]);
  });
  it("condición puesta y terminada; una caducada no cuenta como activa", () => {
    const con = { ...base, condiciones: [{ id: "c1", key: "poisoned" }] };
    expect(detectarEfectos(base, con)).toEqual([{ tipo: "condicion", nombre: "Envenenado", clave: "poisoned" }]);
    expect(detectarEfectos(con, base)).toEqual([{ tipo: "condicion-termina", nombre: "Envenenado" }]);
    expect(detectarEfectos(con, { ...base, condiciones: [{ id: "c1", key: "poisoned", expired: true }] })).toEqual([
      { tipo: "condicion-termina", nombre: "Envenenado" },
    ]);
  });
});
```

Comprobar `nombreCondicion("poisoned")` → «Envenenado» en `character-sheet/vocabulario.ts`; si la
clave es otra, usar la real.

- [ ] **Step 2: Rojo/verde** — `pnpm --filter @dnd/web test -- detectarEfectos`. Expected: PASS (el
  detector ya existe; si algo falla, es un hallazgo real: anotar en el ledger, **no** ajustar la prueba a la salida sin entenderlo).

- [ ] **Step 3: e2e — el flotante sale del DOM**

Leer `apps/web/e2e/combate.spec.ts` (o el e2e donde el DM pone daño a un personaje desde la mesa) y
copiar su arranque (registro, campaña, personaje, sesión abierta, dos páginas: DM y jugador). El test:

```ts
test("un golpe pinta «−N» en la ficha del jugador y el texto flotante desaparece del DOM", async ({ browser }) => {
  // …arranque copiado: `paginaDM`, `paginaJugador` en la misma sesión, el jugador mirando su ficha del elenco.
  await paginaDM.getByRole("button", { name: /poner daño/i }).click();
  await paginaDM.getByLabel(/cantidad/i).fill("7");
  await paginaDM.getByRole("button", { name: /aplicar/i }).click();

  const flotante = paginaJugador.locator(".fx-flotante", { hasText: "−7" });
  await expect(flotante).toBeVisible({ timeout: 10_000 });
  // La animación dura 2,6 s (`efectos.css`); tras `animationend` el nodo se retira. Esto es lo que
  // jsdom no puede ver y el laboratorio sí vio fallar.
  await expect(flotante).toHaveCount(0, { timeout: 6_000 });
});
```

Nombres de botones y rótulos: los reales del e2e que se copia. `prefers-reduced-motion`: Playwright
por defecto no lo activa; si el proyecto lo fuerza en `playwright.config.ts`, el flotante puede no
animarse — leer `useEfectosDeFicha.tsx` para ver qué pasa entonces y fijar `reducedMotion: "no-preference"`
en el `test.use` de este fichero.

- [ ] **Step 4: Correr**

```bash
WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test efectos-de-mesa.spec.ts
pnpm verify
```

- [ ] **Step 5: Archivo + commit** — mover EM-1 entera (la cabecera «Dejado por efectos de mesa» se
  queda en 06 con EM-2 y una línea «EM-1 cerrada el 2026-09-17»). `docs/08-pruebas.md`: en la
  sección de e2e de navegador, una línea que diga qué demuestra `efectos-de-mesa.spec.ts` (lo que
  jsdom no mide). El conteo de ficheros lo regenera `check:estado`.

```
test(web): table effects — unit tests for the pure detector, e2e proves the floating text leaves the DOM

Closes EM-1.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## Task 9: Cierre de la tanda — documentación, revisión Opus, ola

**Files:**
- Modify: `docs/06-pendientes.md` (las P-2 con su línea; «Regla candidata timeout» con el resultado medido)
- Modify: `docs/07-historial.md` (entrada «Cierre antes de 3A.2»)
- Modify: `docs/decisiones.md` (D-CF-119…: `of` opcional sin migración; Tab no se previene (APG); `aria-disabled` en radios apagados; P-1/P-2 según el autor)
- Modify: `docs/como-seguir.md` §0 (siguiente: las tres preguntas de 3A.2)

- [ ] **Step 1: Documentar** — 07: qué se cerró (con los commits), qué se descartó y por qué (una
  línea que apunte al §0 de este plan), cómo revertir (rama entera). 06: quitar lo archivado, dejar
  P-2 con la línea de §2, y en «Regla candidata `timeout`» escribir cuántos Bash del implementador
  quedaron en fondo en esta tanda (del ledger). decisiones.md: una línea por decisión de arriba.
- [ ] **Step 2: `pnpm verify`** y commit `docs: close the pre-3A.2 cleanup — archive, history, decisions`.
- [ ] **Step 3: Revisión Opus de la rama entera** (una): `git diff main...cierre/antes-de-3a2`, con el brief
  de siempre + «un catálogo no se toca aquí; buscar comportamiento que cambió sin prueba y pruebas
  que pasan por construcción». Informe a `.superpowers/sdd/2026-09-17-cierre-antes-de-3a2/review.md`.
- [ ] **Step 4: Una ola** con los críticos e importantes; los menores, a 06 con su línea. `pnpm verify`.
- [ ] **Step 5: Parar.** Informar al autor con la salida de `pnpm verify`, la lista de Playwright corridos
  y las capturas. **Fusionar solo con su permiso. No desplegar.**
