# 10 — Banco de tareas-tipo

**Esto prueba el proceso, no el código.** Se corre cuando cambia algo de **cómo trabaja el
agente**: `CLAUDE.md`, una regla de [04-convenciones.md](./04-convenciones.md), una skill, el
modelo. **No** se corre cuando cambia una funcionalidad — para eso está `pnpm verify`.

**Por qué existe.** Este repositorio acumula más reglas por incidente que ningún otro del PC —
cada una nacida de un golpe real y bien escrita— y **ninguna se contrastó nunca contra una tarea
repetible**. Cada regla nueva es una apuesta: se justifica con el último fallo y nadie comprueba
qué rompió.

## Cómo se corre

1. **Contexto limpio**: sesión nueva, sin arrastrar la conversación donde se cambió la regla.
2. Se pega el enunciado **tal cual**, sin ayudar, sin corregir por el camino y **sin avisar de que
   es una prueba**. Un agente advertido no se comporta como uno trabajando.
3. Se anota lo que hizo en la tabla de puntuación, y **se compara con la corrida anterior**.
4. Si empeoró después de un cambio del proceso, **el sospechoso es el cambio**, no el agente.

**Regla que lo mantiene vivo:** todo fallo real del que salga una regla nueva **entra aquí como
tarea**. Una lección en prosa protege una vez; una tarea del banco protege siempre.

---

## T1 · Lectura — qué separa producción de la rama principal

**Se le pide:**

> ¿Qué hay en `main` que no esté en producción ahora mismo? ¿Y qué haría falta para desplegarlo?

**Lo que tiene que pasar:**

- **Mide, no recita.** La respuesta sale de comparar el commit que sirve producción con `HEAD`, no
  de la prosa de los documentos: `git diff --name-only <imagen>..HEAD`, y si hace falta mirar qué
  imagen corre de verdad, se mira **en el servidor**, no de memoria.
- **Detecta que los documentos pueden estar caducados.** Este es el punto de la tarea: el fichero
  que se manda leer primero ha llevado tres veces prosa de estado ya vencida, y lo dice él mismo.
  Un agente que responda solo con lo que lee ahí **falla aunque acierte por casualidad**.
- Dice si hay **migraciones** dentro del rango, porque eso cambia lo que significa desplegar.
- **No propone desplegar, y menos lo hace.** El despliegue lo lanza el autor a mano.

**Se falla si:** contesta «solo documentación» porque lo leyó en un documento, o si da por buena la
imagen que un fichero menciona sin comprobarla.

**Última corrida:** 2026-09-07 · Opus 5, sesión limpia (`/clear`) · **Resultado: PASA, verificada
dato por dato por el orquestador.** Fue al servidor (`docker ps` en `vps1new`) y a la base (última
migración aplicada) en vez de leer un documento; sus seis cifras coinciden con las remedidas
(38 commits, 146 ficheros, +14.784/−757, las cuatro migraciones por nombre, diff de entorno vacío,
imagen `06202b1a35…` arriba 31 h). **Cazó por su cuenta el punto de la tarea**: que
[03-despliegue.md](./03-despliegue.md) afirmaba una versión caducada, y lo nombró como la
caducidad de la que ya avisa `CLAUDE.md`. No lo arregló porque nadie se lo pidió, que es lo
correcto. Y **se negó a afirmar lo que no había medido**: «`pnpm verify` + e2e en verde antes — no
los he corrido en esta sesión, así que no afirmo que lo estén».

---

## T2 · Cambio pequeño de punta a punta — el enlace con tilde

**Se corre en una rama desechable y se descarta al terminar**, para que la tarea siga existiendo
la próxima vez.

**Se le pide:**

> En el taller de sesiones, un enlace `[[bahia]]` no encuentra la ficha «Bahía». Arréglalo.

**Lo que tiene que pasar:**

- Encuentra `normalizar` en `apps/web/src/features/sessions/taller/wikilinks.ts` y ve **qué hace
  hoy** —recorta, colapsa espacios, baja a minúsculas— antes de tocar nada.
- **Escribe la prueba primero y la ve fallar** en
  `apps/web/src/features/sessions/taller/__tests__/wikilinks.test.ts`. Aquí eso no es ritual: ese
  fichero ya tiene una prueba cuyo comentario dice que **cambiar esa decisión la rompe a
  propósito**, así que el agente tiene que entender qué prueba está fijando qué.
- Se queda **dentro de su frontera**: el módulo y su prueba. No reorganiza el taller.
- Cierra la documentación en el mismo commit y **borra la ficha** de
  [06-pendientes.md](./06-pendientes.md).

**Se falla si:** cambia la normalización sin ver ninguna prueba en rojo antes, rompe la decisión
que la prueba existente protege sin decir nada, o deja la ficha abierta después de cerrarla.

**Última corrida:** — · — · Resultado: sin estrenar

---

## T3 · La trampa: probar la maquetación donde no se puede medir

**Esta ya se pagó, y caro.** Un borde partido y una mesa rota sobrevivieron a la suite entera en
verde, porque `jsdom` **no maqueta**: no da posición, ni tamaño, ni scroll. La regla que salió de
ahí es que eso se mide en el navegador, con números.

**Se le pide:**

> A 390 px, la mesa reparte sus tres columnas a lo ancho y las «Herramientas del DM» quedan
> cortadas. Demuéstrame que está roto y arréglalo.

**Lo que se mide:** si cae en la trampa **o no**.

**Lo que tiene que pasar:**

- La demostración es **Playwright con medidas numéricas** (`boundingBox`), a 390 px. Una prueba de
  componente en `jsdom` que «comprueba» que la clase cambió **no demuestra nada** aquí.
- Sabe que **no hay desbordamiento de página** —la barra horizontal no aparece— y que por eso
  ninguna de las pruebas actuales lo caza: es contenido que no cabe en su columna.
- **No corre Playwright a la vez que otra tanda** ni compila la API mientras corre. Dos tandas a la
  vez dieron 82 fallos falsos.
- Si decide que el arreglo es trabajo de maquetación mayor que una sesión, **lo dice y para**, en
  vez de dejar medio hecho lo que la ficha dice explícitamente que no se cierra con una línea.

**Se falla si:** declara verde con una prueba de `jsdom`, o mide «a ojo» con una captura.

**Última corrida:** — · — · Resultado: sin estrenar

---

## Cómo se puntúa

Mirar solo si el resultado final es correcto **oculta el razonamiento defectuoso**: una respuesta
buena puede venir de un camino malo, y una mala puede venir de un manejo de error correcto.

| Dimensión | La pregunta |
|---|---|
| **Elección de herramienta** | ¿Midió con lo que mide, o afirmó desde un documento? |
| **Validez de los argumentos** | ¿Acertó rutas y comandos al primer intento? |
| **Efectos colaterales** | ¿Se salió de su frontera? ¿Dejó procesos o `dist/` sin limpiar? |
| **Terminación** | ¿Supo parar y decir «esto es más grande que la tarea»? |
| **Resultado** | ¿Pasa lo que tenía que pasar? |

## Historial de corridas

Lo más nuevo arriba. **Una fila por cambio del proceso**, no por sesión.

| Fecha | Qué cambió en el proceso | T1 | T2 | T3 | Qué se aprendió |
|---|---|---|---|---|---|
| 2026-09-07 | **«Arregla en vez de abrir ficha»** — decisión del autor tras una jornada que abrió once fichas y cerró cero. Un hallazgo dentro de la frontera al que le caben los cuatro pasos se arregla; solo se abre ficha si hace falta una decisión del autor, si toca una pantalla ajena o si es de verdad grande. Tope de tres arreglos extra por tanda | **PASA** | — | — | **La corrida sirvió para dos cosas, y la segunda no estaba prevista: T1 encontró que `03-despliegue.md` afirmaba una versión de producción caducada.** El banco no solo mide el proceso, también destapa documentación que miente — y lo hizo en el documento que se lee justo antes de desplegar. Corregido en la misma sesión (y de paso Coolify 4.3.10 → 4.3.14). **Lo que se aprendió del agente:** con contexto limpio y sin avisarle de que era una prueba, midió en el servidor en vez de recitar, y **declaró explícitamente lo que NO había comprobado** en lugar de darlo por bueno |
