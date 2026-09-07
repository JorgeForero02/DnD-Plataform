# Prompts listos para pegar

Se copian tal cual. **Los de un trabajo concreto no van aquí**: esos se escriben fechados en
`docs/superpowers/notes/` y se archivan con su trabajo. Aquí vive lo que sirve **cualquier día**.

Hasta hoy estos prompts vivían fuera del repositorio, en la carpeta de al lado, así que una regla
solo existía si alguien recordaba pegar el fichero correcto.

---

## 1 · Sesión normal

```text
Lee, en este orden: CLAUDE.md, docs/00-INDEX.md, docs/06-pendientes.md y docs/decisiones.md.
No leas docs/superpowers/ entero: son registro fechado y están fuera del camino de lectura.
Dime en 5 líneas dónde estamos y qué propones, y espera mi confirmación antes de tocar nada.

Reglas de la sesión:
- Evidencia antes que afirmación: nada se declara verde sin la salida del comando.
- Verificación por mutación sobre el código tocado: romper, ver fallar, restaurar, anotarlo.
- Los cuatro pasos antes de abrir una ficha (docs/04-convenciones.md), con su frontera.
- Una duda de reglas se resuelve con el SRD, en inglés, y la cita va en el commit.
- Si toca una pantalla, se mide en el navegador: jsdom no maqueta.
- No despliegas. Producción la mueve el autor a mano.
- Documentación en el mismo commit, y `pnpm verify` verde sin saltarse el gancho.
```

## 2 · Correr una tarea del banco

**Sesión nueva, contexto limpio.** Se pega **solo el enunciado** de la tarea, tal cual está en
[10-banco-de-tareas.md](./10-banco-de-tareas.md):

```text
<el enunciado de T1, T2 o T3, y nada más>
```

**Lo que NO se hace:** decirle que es una prueba, recordarle las reglas, corregirle por el camino,
ni ayudarle cuando se atasca. Un agente advertido no se comporta como uno trabajando, y entonces
la corrida no mide nada.

Al terminar, **el autor** llena las cinco dimensiones y la fila del historial de corridas.

## 3 · Cambiar el proceso (una regla, `CLAUDE.md`, una skill, el modelo)

El hábito que hace que el banco sirva:

```text
Voy a cambiar <la regla / CLAUDE.md / la skill / el modelo>.
Antes de tocarlo: corro las tres tareas de docs/10-banco-de-tareas.md en sesiones limpias y
anoto el resultado. Después del cambio, las tres otra vez.
Si algo empeoró, el sospechoso es el cambio, no el agente.
```

## 4 · Encargo a un subagente

La frontera de **rutas** y el bloque de **herramientas prohibidas** son obligatorios los dos:
están en [04-convenciones.md](./04-convenciones.md) § *Trabajo con varios agentes a la vez*, con
la superficie mínima por rol.

Recordatorios que ya costaron una tanda: **Playwright y los e2e los corre solo el orquestador, y
uno a la vez**; nadie compila la API mientras corren; al terminar, cada uno mata sus procesos. Y
quien orquesta llena la tabla de observabilidad al cerrar la tanda.

## 5 · Trabajar una ficha del tablero

```text
Vamos con <la ficha> de docs/06-pendientes.md.
Antes de proponer nada: comprueba contra el código y contra git log que la ficha sigue siendo
cierta — este tablero ya tuvo fichas que decían que faltaba algo ya hecho.
Si lo que falta es una decisión del autor, dilo y para: eso no lo decides tú.
```

## 6 · Ejecutar un plan por subagentes

```text
Ejecuta <el plan> con la skill superpowers:subagent-driven-development: un agente nuevo por
tarea, con contexto limpio, y revisión entre tarea y tarea.
Cada encargo lleva su frontera de rutas y el bloque de lo que NO se hace
(docs/04-convenciones.md). Tú corres las suites; los implementadores no.
Al cerrar la tanda: tabla de observabilidad, y comprueba que lo prohibido no ocurrió.
```
