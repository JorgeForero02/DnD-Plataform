# Huecos de mecánica encontrados al ejecutar 2A · 2026-09-02

> **Qué es esto.** Un repaso pedido por el autor **a mitad de la ejecución de la fase 2A**, con
> 2A.1 a 2A.5 ya en producción: *«revisa si hay huecos de mecánicas faltantes»*.
>
> No repite el [informe de huecos de la fase 2](./2026-09-01-huecos-fase-2-design.md) ni la
> [parte 2 del plan](../plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md): los
> lee **contra el código que ya existe** y contra
> [lo que contestaron los jugadores](./2026-09-02-respuestas-jugadores-design.md), y anota lo
> que **ninguno de los tres deja colocado**.
>
> **Once huecos. Cuatro se cierran ya** porque son forma de datos y su coste crece con cada fila
> escrita; **tres se colocan** en una tarea concreta del plan que aún no ha llegado; **cuatro se
> declaran** con su sitio y sin fecha.

---

## Cómo se decide si un hueco se cierra ahora

El criterio no es nuevo, es el que el proyecto ya usa: **si cerrarlo hoy es cambiar una forma
de datos y cerrarlo mañana es migrar filas escritas, se cierra hoy.** Es literalmente el
argumento con el que la pericia (*expertise*) entró en 2A siendo un enum de tres estados en vez
de un booleano.

Y hay una circunstancia nueva que aprieta: **la aplicación está en producción desde hoy**. Cada
hora que pasa puede haber filas reales que una migración tendría que tocar.

---

## Los cuatro que se cierran ya

### M1 · La media competencia no existe, y dos clases del SRD la usan

**El hueco.** `proficiencyLevelSchema` (`packages/shared/src/rules/trace.schema.ts`) es
`["none", "proficient", "expertise"]`. La 5.ª edición necesita **cuatro** estados: falta **media
competencia**, que suma la **mitad del bonificador redondeando hacia abajo**.

**Y no es teórico: ya está en el catálogo transcrito.**

| Clase | Aptitud | Nivel | Qué hace |
|---|---|---|---|
| Bardo | Aprendiz de todo (`jack-of-all-trades`) | 2 | Media competencia en **toda prueba de característica** en la que no sea competente |
| Guerrero campeón | Atleta excepcional (`remarkable-athlete`) | 7 | Media competencia en pruebas de Fuerza, Destreza y Constitución en las que no sea competente |

Las dos están en `apps/api/src/rules/catalog/classes.ts` como aptitudes con su nivel, así que la
hoja **las anuncia y no las aplica**. Un bardo de nivel 2 con competencia +2 debería tener +1 en
todas sus habilidades no competentes, y hoy tiene +0.

**Por qué se cierra ahora.** Es exactamente el caso de la pericia, y el argumento se copia
palabra por palabra del [informe de huecos, H4](./2026-09-01-huecos-fase-2-design.md): un enum
con filas escritas es la migración que se evita decidiendo antes de que haya filas. La parte 2
del plan resolvió la pericia y **dejó fuera la media competencia sin decir por qué** — se cerró
media puerta.

**Coste ahora:** un valor en el enum y una rama en el motor. **Coste después:** migración de
`skillProficiencies` sobre personajes reales.

> **Lo que este hueco NO resuelve, y queda dicho:** aplicar la media competencia
> **automáticamente** por tener la aptitud. Eso exige que una aptitud de clase escriba
> modificadores, y hoy las aptitudes son texto (ficha **S2** de [06](../../06-pendientes.md)).
> Lo que entra es **la forma**: que el estado se pueda representar y el motor sepa sumarlo.

### M2 · `attacksPerAction`: la hoja miente al nivel 5

**El hueco.** El [informe de huecos, H8](./2026-09-01-huecos-fase-2-design.md) dijo textualmente
que el **dato** va en **2A, con el catálogo de clases**. 2A.3 transcribió el catálogo y **no lo
incluyó**. El hueco no es futuro: es una tarea cerrada a la que le falta una columna.

**Qué necesita la regla.** Ataque Extra al nivel 5 (bárbaro, guerrero, monje, paladín,
explorador; el pícaro no), y el guerrero llega a **tres** al 11 y a **cuatro** al 20.

**Por qué importa.** Es el personaje más común de una mesa. Y H8 tenía razón en la corrección
que hacía al plan: Ataque Extra **no es un rasgo condicional como Ataque Furtivo** —que depende
de ventaja, de un aliado, del arma—; es **un número**. Clasificarlo como «texto» era aplicar mal
la regla.

**Coste ahora:** un campo en la progresión de la clase, en un fichero que ya existe.
**Coste después:** una transcripción repetida sobre doce clases.

### M3 · Los espacios de conjuro, que los jugadores pidieron por su nombre

**El hueco.** [Lo que contestaron los jugadores](./2026-09-02-respuestas-jugadores-design.md),
pregunta 4, literal: *«inventario de hechizos… y todas las cosas que se hacen manuales
molestas»*. Ese documento **ya falló** que los espacios de conjuro entran en 2A como recurso
consumible. Las diecisiete tareas del plan **no los nombran en ninguna parte**.

**Qué entra y qué no.** Entra **la tabla**: cuántos espacios de cada nivel tiene cada clase
lanzadora en cada nivel de personaje. No entra la matemática de conjuros —preparados contra
conocidos, trucos que escalan, la lista por clase—, que sigue excluida y con razón.

**Por qué es barato.** Un espacio de conjuro es **el mismo mecanismo que la inspiración**: un
contador con máximo que un descanso largo repone. Ese mecanismo lo construye 2A.8 de todas
formas. Lo único que falta es **la fila del catálogo**, y el catálogo se está escribiendo aquí.

Sin ella, el mago lleva sus espacios **en un papel al lado del portátil**, que es la imagen que
este proyecto existe para eliminar.

> **Las tres progresiones del SRD**, y hay que distinguirlas o la tabla miente:
> **completa** (bardo, clérigo, druida, hechicero, mago), **media** (paladín y explorador, que
> además empiezan al nivel 2) y **de pacto** (brujo, que tiene pocos espacios, todos del mismo
> nivel, y **se reponen en descanso corto**). Meter al brujo en la tabla completa es el error
> obvio, y por eso lleva su propia forma.

### M4 · La iniciativa no se deriva, y está en la hoja

**El hueco.** El motor deriva CA, PG máximos, salvaciones, habilidades, percepción pasiva,
ataques y conjuros. **No deriva la iniciativa**, que la
[anatomía de la hoja](./2026-09-02-hoja-5e-design.md) §1.6 pone al lado de la CA y la velocidad.

Es el modificador de Destreza más lo que le sumen. Es una línea, y **la pantalla de 2A.10 la va
a pedir**; añadirla ahora cuesta lo mismo que añadirla entonces, pero evita que 2A.10 tenga que
volver a tocar el motor, que es la clase de ida y vuelta que esta fase intenta no pagar.

---

## Los tres que se colocan en una tarea concreta

### M5 · `Character.equippedSlots` tenía que existir desde 2A, y no existe

La [parte 2 del plan, §1](../plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md)
lo falló así, textual: *«se modela en 2B, pero **la columna existe desde 2A**:
`Character.equippedSlots` vacía»*. El motivo era exacto: *«reservar la forma cuesta una columna;
añadirla después de que existan mil personajes cuesta una migración con datos»*.

2A.5 añadió columnas a `Session`, no a `Character`. **La tarea que añade columnas a `Character`
es 2A.6**, y su descripción no la nombra. → **Va en 2A.6.**

### M6 · Las tiradas de salvación contra muerte

La [anatomía de la hoja](./2026-09-02-hoja-5e-design.md) §1.7 las lista como campo de la hoja:
tres éxitos y tres fracasos, casillas y no un número. Ninguna de las diecisiete tareas las
nombra.

Su sitio es evidente en cuanto se dice: **2A.7**, «PG mutables», porque la mecánica **empieza
exactamente cuando los PG llegan a 0**. Un personaje a 0 PG sin tiradas de muerte es una hoja
que no sabe decir si el personaje está vivo. → **Va en 2A.7**, y con ellas dos eventos nuevos
del log.

### M7 · La concentración y la lista cerrada de condiciones

El [informe de huecos, H12](./2026-09-01-huecos-fase-2-design.md) avisó de esto y **la parte 2
del plan pisó justo el aviso**: 2A.12 dice *«clave de una **lista cerrada** del SRD»*.

H12 decía: si las condiciones son un enum cerrado de las quince del SRD, *«concentrándose en
Bendición»* **no cabe**, y añadirla después es una migración de enum. Si la clave es libre, cabe
sin código nuevo y el DM tiene al menos el recordatorio visible.

**Fallo, y se anota aquí para que 2A.12 no lo redecida:** la tabla de condiciones lleva **clave
libre con una lista cerrada de las que el motor entiende**. Las quince del SRD tienen efecto
mecánico; cualquier otra clave se guarda, se enseña y **no calcula nada**. Es lo mismo que ya se
hace con los rasgos raciales sin efecto numérico (ficha **S4**), y cuesta una comprobación en
vez de una restricción. → **Va en 2A.12.**

---

## Los cuatro que se declaran, con su sitio y sin fecha

Van también a [06-pendientes](../../06-pendientes.md), porque un hueco que solo vive en una spec
no lo lee nadie.

| | Hueco | Dónde va, y por qué no ahora |
|---|---|---|
| **M8** | **Modificadores temporales con caducidad** — *«+2 a Fuerza durante una hora»*. Lo pidieron los jugadores (pregunta 4) y **no está escrito en ningún plan**: no es un estado con nombre ni un objeto equipado, es un modificador con fecha de fin | Necesita el **reloj de campaña**, que es 2C. El modelo de modificadores de 2A ya sabría aplicarlo; lo que falta es quién decide que ha caducado. Meterlo sin reloj sería un campo que nadie limpia |
| **M9** | **El personaje se archiva, no se borra** — respuesta 6 de los jugadores: *«que se queden guardados como recuerdos; hay campañas donde te pueden revivir»*. Hoy el borrado es **definitivo** | No es de 2A: toca `characters`, que es de la fase 1. **Pero el reloj corre**: la aplicación está en producción y cada personaje borrado ya no vuelve. Es lo más barato de esta tabla y lo único que pierde datos mientras espera |
| **M10** | **Revocar una concesión de visibilidad y editar en silencio** — la hidra falsa (respuesta 2). Hoy `EntityVisibilityGrant` se crea y no se quita | «Fase 1 ampliada» según el propio documento de respuestas. No depende del motor. Su regla difícil ya está decidida y hay que no perderla: **las notas del jugador NO se borran**, porque el terror nace de que sus apuntes contradigan su memoria |
| **M11** | **Que un jugador comparta lo que le revelaron** (respuesta 3) | Decisión abierta: o crea una concesión de verdad —que el DM ve y puede revocar, coherente con M10— o es un gesto social fuera del sistema. La primera es más trabajo y mucho más interesante |

---

## Lo que se comprobó y **no** era un hueco

Se dice para que nadie lo vuelva a mirar:

- **Bonificadores que se acumulan y los que no** (H13). El motor ya distingue
  `base` / `add` / `override` / `cap`, y la CA elige la mayor fórmula candidata en vez de sumar.
  Es el modelo correcto y está probado. Lo único que faltaba —dos escudos sumando +4— se cerró
  en el commit de la revisión.
- **Percepción pasiva y visión en la oscuridad** (H5). La primera la deriva el motor; la segunda
  está en el catálogo por raza, con su cifra fijada por prueba.
- **Descansos, dados de golpe, PG temporales y pericia** (H2, H3, H4 parcial). Los cuatro los
  falló la parte 2 del plan y están colocados en 2A.7 y 2A.8.
- **Dinero, carga, visibilidad de objetos y sintonización** (H6, H7, H9, H1). Son 2B, y ahí
  siguen.
