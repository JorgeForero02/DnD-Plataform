# Auditoría de mecánica de la fase 2B (2026-09-03, noche)

> Registro fechado. Dos frentes con su refutador adversario cada uno, sobre el código recién
> cerrado de 2B: **el turno de una mesa** (un guerrero enano de nivel 5, de crear el objeto a
> tirar el daño) y **lo que sobrevive entre sesiones y lo que hacen dos peticiones a la vez**.
> Método: `~/.claude/skills/auditoria-por-funcionalidad`. Nada de «recorre esta superficie»: dos
> caminos concretos, y cada hallazgo con su línea abierta.
>
> **Los refutadores no tumbaron ninguna afirmación**, pero corrigieron cuatro cosas que importan,
> y están anotadas abajo con su nombre: dos citas de fichero equivocadas, una regla del SRD mal
> citada y una conclusión más fuerte de lo que el código sostiene.

## Lo que se arregló el mismo día

| | Qué pasaba | Por qué importaba en la mesa |
|---|---|---|
| **La armadura pesada restaba la Destreza negativa** | `Math.min(bruto, tope)` con tope 0 dejaba pasar un −1. El SRD dice que la armadura pesada **no te deja sumar** la Destreza, no que reste | El enano que baja Destreza para subir Fuerza salía con **CA 17 donde el manual da 18**, y la traza se lo enseñaba como si fuera correcto |
| **El «Entrenamiento de combate enano» era texto** | El cuadro de ataques leía solo las competencias de la **clase**; el rasgo racial era un `feature` sin efecto. Hizo falta estrenar un `kind` de concesión (`weaponProficiency`) | El clérigo enano con hacha de batalla veía **«Sin competencia» en rojo** sobre su propia arma y perdía su bonificador |
| **Al enano se le bajaba la velocidad por armadura pesada** | La penalización de diez pies se aplicaba sin mirar la raza | El arquetipo más común de esta mesa corría **15 pies en la pantalla y 25 en el manual**, y la velocidad decide quién alcanza al mago |
| **«A dos manos» se ofrecía con el escudo puesto** | `versatileDamage` se emitía sin mirar la otra mano | **+1 de daño medio por asalto, gratis**, a quien además conserva su CA de escudo |
| **Un arma a dos manos entraba por la mano izquierda** | La regla solo se comprobaba al equipar en la principal | Espada larga en una mano y espadón en la otra: dos filas de ataque completas, y el propio mensaje del código dejaba de ser cierto según por dónde entrases |
| **Dos armas iguales compartían clave de ataque** | La ranura que llegaba al cuadro era la **del catálogo**, no la de la fila del inventario | Dos dagas daban dos filas indistinguibles, `rollAttack` tiraba siempre la primera y React repetía `key`. Y sin la ranura real no se pueden decidir las dos anteriores |
| **Editar un objeto no revalidaba ninguna mochila** | `update` cambiaba ranura, sintonización y propiedades sin mirar `InventoryItem` | Quedaban filas sintonizadas de objetos que ya no se sintonizan **ocupando plaza del tope de tres**, y un escudo conviviendo con un arma recién vuelta a dos manos |
| **Bajar la visibilidad hacía desaparecer el objeto en silencio** | La regla existía al **entregar** y no al **editar** | Al jugador le desaparecía la armadura del inventario —y de su peso— mientras la hoja seguía sumándola redactada: dos capas con dos políticas |
| **Equipar se decidía fuera de la transacción** | Solo el carril de sintonizar tomaba el candado | Dos peticiones a la vez dejaban **espadón y escudo puestos**, con la CA inflada durante todo el combate |

Todas con prueba y **mutación comprobada**: se rompió cada arreglo a propósito y la prueba se
puso roja.

## Lo que el refutador corrigió

- **La regla de las dos armas estaba mal citada.** El SRD no dice «no sumas el modificador salvo
  dote»: dice **«salvo que el modificador sea negativo»**, y quien levanta la restricción es el
  **estilo de combate** Combate con Dos Armas, no una dote. Y sobre todo: la aplicación **no
  modela el ataque de acción adicional**, así que decidir que la fila de la mano izquierda no
  suma el modificador habría sido inventarse una regla. Se deja el número y **se avisa**.
- **Dos citas de fichero estaban mal.** El culpable de las claves de ataque repetidas no era
  `resolve-item.ts` sino `character-sheet.service.ts`, y los radios de la ficha de objeto están
  una línea más abajo de lo que decía el informe.
- **«El inventario no se refresca hasta recargar» era demasiado fuerte**: `refetchOnWindowFocus`
  está activo, así que volver a la pestaña pasados treinta segundos sí lo recarga. Sigue siendo
  cierto que quien mira la pantalla fija no ve llegar el botín.
- **La lectura del inventario dentro de una transacción bloqueada no es una incorrección**, como
  decía el informe, sino higiene: la transacción bloquea `Character` y no toca `InventoryItem`,
  así que lo que se lee está confirmado. Lo que sí es real es el **N+1 sosteniendo un candado**.

## Lo que queda abierto, y por qué

Todo esto está en [06-pendientes.md](../../06-pendientes.md) como fichas **M2B-1** a **M2B-12**.
Los tres que más pesan:

1. **Un arma mágica no se puede representar.** La lista cerrada de efectos no tiene bono al
   ataque ni al daño, `buildAttacks` no lee `effects`, y la válvula de escape del DM
   (`OVERRIDABLE_KEYS`) tampoco incluye `attack.*`. El DM entrega la primera espada +1 y el
   cuadro de ataques se vuelve mentira. **Es el hallazgo que más rápido devuelve la mesa al
   papel**, y no estaba declarado en ninguna ficha: solo en dos cabeceras de código.
2. **Ninguna mutación de inventario deja rastro en la línea de tiempo.** El dinero sí. Una semana
   después nadie puede responder «¿quién cogió la gema?».
3. **El motor de reglas se dispara dentro de la transacción del llamante y escribe fuera de
   ella.** Sus efectos sobreviven a un cambio que se deshace, y lee el mundo **anterior** al
   suceso que lo despertó. Hoy la única puerta real es arrancar o cerrar una sesión, pero el
   comentario que dice que la evaluación ocurre «dentro de la petición» **describe algo que no
   pasa**.

## Lo que la auditoría hizo mal

Los dos frentes citaron bien casi todo —cada línea abierta—, pero el frente de mecánica **erró
dos rutas de fichero** y **una regla del SRD**, y el de estado **exageró una conclusión**. Las
cuatro las cazó la refutación, que costó menos que el frente y encontró algo en los dos. La
lección se repite: sin refutador, tres de estas nueve correcciones se habrían escrito como
hallazgos y una como arreglo equivocado.
