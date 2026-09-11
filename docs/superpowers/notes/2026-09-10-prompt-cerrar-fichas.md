# Prompt de arranque — clasificar el tablero y cerrar lo que se cierra sin el autor

> Se copia y se pega entero al abrir la sesión. Escrito el 2026-09-10 sobre `main` = `4ced2bc`,
> dos días después del reconocimiento del 2026-09-08 (dieciocho fichas archivadas por falsas).
> **No sustituye al plan del paso 3**: ese tiene sus tres decisiones del autor y es sesión propia.

**Contexto del día, para quien lo lea después:** producción sirve `6eb2590` y `main` lleva 70
ficheros sin desplegar. Once fichas P1/P2 abiertas; cinco de ellas ya absorbidas por el plan
`2026-09-08-paso-3`. Desde hoy `.claude/` del repo (ignorado por git) trae dos skills
(`prisma-patterns`, `contract-first`, ambas con nota de las reglas de este repo) y tres agentes
(`silent-failure-hunter`, `type-design-analyzer`, `pr-test-analyzer`), sacados de `affaan-m/ECC`
y evaluados en `~/.claude/evaluacion-ecc-2026-09-09.md`. Este prompt los estrena. (`/agents` ya no
existe como comando en Claude Code; se comprueba preguntándole al modelo qué subagentes ve.)

---

```text
Lee, en este orden: CLAUDE.md, docs/00-INDEX.md, docs/como-seguir.md, docs/06-pendientes.md y
docs/decisiones.md. Después docs/04-convenciones.md entero antes de tocar código. No leas
docs/superpowers/ entero: son registro fechado; abre solo lo que una fila de decisiones.md enlace.
Antes de nada, lista los subagentes que tienes disponibles en esta sesión. Tienen que estar
silent-failure-hunter, type-design-analyzer y pr-test-analyzer (vienen de .claude/agents/ del
repo). Si falta alguno, dilo y para: la fase 2 los necesita.

Objetivo de la sesión: cerrar fichas del tablero. En dos fases, y la segunda no empieza sin mi OK.

FASE 1 — Clasificar, sin tocar código.
Recorre TODAS las secciones abiertas de docs/06-pendientes.md (busca por identificador o texto,
nunca por posición: el orden del documento no es fiable). Para cada ficha, comprueba contra el
código y contra git log que sigue siendo cierta — el reconocimiento del 2026-09-08 ya encontró
dieciocho falsas y no quiero una decimonovena. Clasifícala en uno de cuatro cubos:

  A · FALSA — el código ya la contradice. Evidencia: fichero:línea y fecha del commit.
  B · CERRABLE POR MÍ — le caben los cuatro pasos de docs/04-convenciones.md, no cae en ninguno
      de los cuatro casos en que el paso 1 no aplica, y no está absorbida por el plan del paso 3.
      Estima tamaño: S (un commit, <1 h), M (un commit, una tarde), L (no es de esta sesión).
  C · ABSORBIDA POR EL PASO 3 — P1 mago, P2-4, P2-5, P2-9, A11-lanzado, L2-traza-dano y
      cualquier otra que el plan 2026-09-08 cite. No se toca: es su sesión.
  D · DECIDE EL AUTOR — decisión tomada que habría que rediseñar, migración, sin prueba que la vea
      fallar, solo se juzga usándolo, o sección vieja sin fecha cuya vigencia solo sé yo.
      Para las D, no me hagas la pregunta: mándame la medición y las salidas que ves.

Entrega la tabla completa (id · título corto · cubo · evidencia · tamaño si B) y PARA.

FASE 2 — Tras mi OK sobre la tabla, cerrar el cubo B en orden S → M, una ficha por vez:
- Rama por ficha desde main. Prueba que falle antes; arreglo; verificación por mutación del
  código tocado (romper, ver fallar, restaurar, anotarlo).
- Antes del commit, pasa el diff por silent-failure-hunter y type-design-analyzer, y por
  pr-test-analyzer si añadiste pruebas. Sus hallazgos se atienden o se refutan por escrito; no
  se ignoran.
- Un commit por ficha, mensaje en inglés (Conventional Commits), con la cita del SRD si hubo duda
  de reglas. Documentación en el mismo commit: la ficha sale del 06 y va ENTERA a
  _archivo/pendientes-cerrados-2026-09-10.md (con su fila en el README de _archivo), una línea en
  07-historial.md con qué / por qué / cómo revertir, y una fila en decisiones.md si decidiste algo.
- pnpm verify verde sin saltarse el gancho. pnpm verify NO incluye los e2e: córrelos aparte, una
  sola tanda de Playwright, y cierra lo que abras. Si el 3000 está ocupado, WORKTREE_SLOT=1;
  pnpm db:slot está roto, la base se crea con prisma migrate deploy.
- Las falsas del cubo A se archivan igual, sin código, con su evidencia de cuándo.
- Tope: tres fichas extra abiertas en toda la sesión, y solo por pantalla ajena o de verdad grande.
- Al cerrar la tanda: pnpm update:estado, tabla de observabilidad de docs/04 (una fila por ficha:
  vueltas, qué encontró cada mutación, tiempo perdido y en qué), y relee 01–05 y 09 — el 07 no es
  documentación de estado.

Reglas de toda la sesión:
- Evidencia antes que afirmación: nada se declara verde sin la salida del comando.
- Una transacción se abre con PrismaService.transaction, nunca con $transaction (la skill
  prisma-patterns enseña lo contrario; manda docs/04, y la nota al inicio de la skill lo dice).
- El contrato es el Zod de @dnd/shared; ningún campo se redefine fuera.
- Si toca una pantalla, se mide en el navegador: jsdom no maqueta.
- No despliegas. No propones copia de seguridad de la base. No ejecutas el plan del paso 3.
```

---

## Lo que este prompt deja fuera, a propósito

- **El paso 3** (un mago sin conjuros, la P1 que más pesa). Necesita las tres respuestas del autor
  de su §*Lo que decide el autor antes de empezar* y se lanza con `docs/prompts.md` §6.
- **La poda de las secciones viejas** del 06 (`como-seguir.md` §1). El cubo D se la sirve al autor
  ordenada para decidir por sección entera; el agente no decide cuál sigue viva.
- **Desplegar.** Manual, del autor.
