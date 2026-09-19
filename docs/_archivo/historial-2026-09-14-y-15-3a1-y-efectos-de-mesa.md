# Historial — 3A.1 «El libro entra» (2026-09-14) y «Efectos de mesa» (2026-09-15)

**Dos entradas de `07-historial.md` movidas enteras el 2026-09-18**, al escribir la entrada de
cierre de 3A.3 (la barra de acciones y la mesa que converge al prototipo): el fichero estaba en
996 de sus 1000 líneas y estas eran las dos entradas completas más antiguas. No se reescriben.

---

## Efectos de mesa: la tarjeta y la pantalla reaccionan a lo que pasa (2026-09-15) — fusionada a `main` y desplegada (ver arriba)

Qué — a partir del laboratorio `rpg_fx_lab.html` del autor (GSAP, fuera del repositorio), la mesa
anima lo que ya pinta: `features/sessions/elenco/efectos/` compara la lectura anterior de cada
ficha con la nueva (`detectarEfectos.ts`, puro: PG, temporales, nivel, estado de muerte,
condiciones) y de la diferencia saca un texto que flota en una columna («−7», «+12»,
«Envenenado», «Cae», «En pie», «Nivel 5»), una animación de tarjeta —**una por condición del
SRD** con las convenciones de color de los RPG, ámbar genérico para las personalizadas— y, **solo
en la pantalla del jugador dueño**, un destello y una sacudida (`pantalla.store.ts`; el DM no
recibe nada, decisión del autor). Caído a 0 PG = `filter`+`opacity` persistentes, sin transform,
mismo tamaño. **Sin GSAP**: CSS `@keyframes` + tokens, `prefers-reduced-motion` respetado
(D-CF-116). Se dispara por cambio de dato, no por aviso: sirve igual con SSE, sondeo o para quien
aplica el golpe, y `canView` sigue mandando porque solo se anima lo que ya llegó.

Tres arreglos que destapó probarlo en local:

- **`ui/Dialog` sale por portal a `document.body`** (D-CF-117): era `fixed` dentro del `<li>` de
  la ficha, y un antecesor con `filter`/`transform` se convierte en su contenedor — el cajón de
  «Curar» de un caído se pintaba embutido y gris dentro de su tarjeta.
- **«Iniciativa tirada» ya no se queda hasta recargar** (`TiradasPendientes.tsx`): `respondidas`
  era estado local que nunca se vaciaba. Ahora se pinta solo mientras SU encuentro sigue en
  `PREPARING` (derivado en el render, no un efecto que vacíe estado) y todo resultado lleva un
  aspa para cerrarlo.
- **Las condiciones vencidas se cuentan, no se listan** en la tarjeta del elenco («N vencidas»),
  la misma regla que D-CF-43 fijó para la cabecera de la hoja: tras una sesión larga Brann llevaba
  diez chips tachados.

Por qué — el autor quiere sentir el golpe en la mesa sin abrir la hoja; y las tres cosas de arriba
salieron al usarla de verdad, no de una suite.

Cómo se probó — **sin pruebas nuevas, por decisión del autor** («no toca lógica; yo evalúo en
local», 2026-09-15, D-CF-118): `tsc`, eslint y las 1720 unitarias existentes en verde, sonda
Playwright desechable con las tres cuentas demo (0 errores de consola, 0 respuestas ≥ 400), y la
evaluación del autor en local durante la sesión. Queda en `06` la ficha de cubrirlo cuando se
toque de nuevo.

Revertir — `git revert` de los commits de la rama; ninguna migración. Fusionada a `main`
(`334912b`) y desplegada el mismo día por el autor (entrada de arriba).

---

## 3A.1 «El libro entra» (2026-09-14) — cerrada y fusionada a `main`, sin desplegar

Qué — la tanda entera (11 commits sobre `6478092`; [plan](./superpowers/plans/2026-09-14-3a1-el-libro-entra.md),
[T0](./superpowers/specs/2026-09-14-3a1-tarea-0-prueba-de-fuego.md)): un conversor offline y re-ejecutable
(`scripts/convertir-catalogo/`, 63 pruebas puras) lee el YAML de Foundry (estructura y números) y el texto
del **SRD 5.1 en español oficial** (nombres y prosa; PDF de Wizards, CC-BY 4.0, fuera del repo), los casa
por huella estructural (219 solos + 100 a mano), traduce cada `@` a `Origen` (dos formas nuevas:
`nivelDeClase`, `ataqueDeConjuro`) y escribe ficheros dorados en `apps/api/src/rules/catalog/generado/`:
**319 conjuros, 234 aptitudes, 26 rasgos, 22 escalas**, 0 sin nombre español (11 con traducción propia
marcada), prosa española en 228/233 aptitudes. `SRD_CLASSES`/`SRD_RACES` se enriquecen por clave al cargar;
la Furia a mano manda. Lo fuera de A (invocar, transformar, encantar; tres huecos de esquema) queda como
texto y contado en `rechazos.md`. Proceso: rigor según riesgo (sin revisión por tarea), UNA revisión Opus
que muestreó el dorado contra la fuente (nombres 38/38, mecánica 24/38 mal por cinco causas raíz) y UNA
ola que las cerró; re-revisión 18/18; un residuo de cortador arreglado a petición del autor. Decisiones
D-CF-92..115.
Por qué — «primero lo que hace jugable una partida» (D-CF-71): el mago y el clérigo necesitan su libro.
Revertir — `git revert -m 1` del merge; los JSON no tocan la base. **Sin desplegar.**
