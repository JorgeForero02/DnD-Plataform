# Pendientes cerrados — 3A.2 (2026-09-18)

Una ficha, movida entera desde `06-pendientes.md` al cerrar 3A.2 «Elegir, lanzar y usar»
(2026-09-18). Nada de aquí se edita: es el registro de lo que era cierto cuando se abrió esta
ficha, no una descripción del sistema de hoy — eso lo dice `docs/01`–`09`.

---

## P1 · Un mago no tiene conjuros: existen los espacios y no existe ni un hechizo (2026-09-05)

**Medido:** búsqueda de cualquier conjuro concreto en `apps/api/src` y `packages/shared/src` —
**cero**. No hay lista, ni catálogo, ni fichero de conjuros.

Lo que sí hay es `apps/api/src/rules/catalog/spell-slots.ts`, **y su propia cabecera declara el
hueco**: *«Lo que entra es la tabla, no la matemática de conjuros… Lo que sigue fuera es la
interpretación de cada conjuro: preparados contra conocidos, trucos que escalan, y la lista por
clase.»*

**O sea que está decidido y documentado, no roto.** Pero desde la mesa **parece un fallo**: la hoja
de un mago enseña sus casillas de espacios de conjuro y no hay nada que meter dentro. Un mago sin
conjuros no es un mago, y es lo primero que va a preguntar cualquiera que se haga uno.

**Decisión del autor, 2026-09-05: se hace la versión larga** —los conjuros de verdad—, y no le
preocupa que alargue la partida de agentes.

**Y ese mismo día se descubrió que NO es un hueco suyo: es el mismo que el de las aptitudes.** Las
aptitudes de clase eran solo un nombre —`f(1, "rage", "Furia")` en el catálogo de clases, con
**cero usos** de `"rage"` o `"extra-attack"` en todo el árbol—, así que un bárbaro de nivel 5
jugaba **exactamente igual** que un guerrero: los dos pegaban una vez con su arma.

> **La mitad de la Furia se cerró, y esta ficha no se enteró hasta el 2026-09-08.** Ya no es una
> línea suelta: `RASGO_FURIA` (`apps/api/src/rules/catalog/classes.ts:124`) declara la aptitud con
> su concesión de usos, y `apps/api/src/activities/` la ejecuta —`"rage"` consume su recurso
> (`activities.service.ts`, con la clave declarada en su catálogo) y tiene su recorrido de
> navegador en `apps/web/e2e/furia.spec.ts`—. La construyeron A9, A10 y A11. Así que **el bárbaro
> ya no juega igual que el guerrero**, y la frase de arriba se conserva en pasado en vez de
> borrarse porque es el razonamiento que abrió esta ficha.
>
> **Y la cita de esta ficha se había desplazado**: decía `classes.ts:60`, que hoy es un comentario
> sobre el nivel 20 de la Furia, no su declaración. Corregida arriba, y con el nombre delante del
> número para que la próxima vez se pueda encontrar sin él.
>
> **Lo que sigue midiéndose igual es `"extra-attack"`**: sus siete apariciones están todas en
> `classes.ts` (líneas 172, 401, 403, 407, 445, 497 y 551) y `rules/attacks.ts` no lo lee, así que
> el nivel 5 del guerrero sigue pegando una vez. Y **de conjuros no hay ni uno**, que es el
> enunciado principal de esta ficha y no ha cambiado: `rules/catalog/` no tiene fichero de
> conjuros, y un barrido de nombres reales del SRD por api, web y `packages/shared` no devuelve
> más que fixtures de prueba y comentarios.

Un conjuro y una aptitud son **lo mismo con distinto origen**: algo que un personaje puede hacer, que
gasta un recurso, elige objetivo, tira o pide una tirada, y a veces deja un efecto con duración. El
diseño está en
[`superpowers/specs/2026-09-05-conjuros-design.md`](../superpowers/specs/2026-09-05-conjuros-design.md).

**Cierra con el trabajo que el autor partió en tres el 2026-09-05**: arreglar la iniciativa (su plan
ya está escrito), **auditar el sistema entero de ataques, aptitudes y hojas**, y planificar lo que
falte **con esa auditoría delante**. Planificarlo antes de auditarlo repetiría el error que lo trajo
hasta aquí.

> **Cerrada el 2026-09-18 por 3A.2 «Elegir, lanzar y usar».** Medido contra el árbol de la rama
> fusionada: **319 conjuros** del SRD 5.1 entran por el conversor de 3A.1 (`rules/catalog/generado/`)
> y 3A.2 los hace elegibles y lanzables de verdad desde la pestaña Conjuros —
> `apps/web/src/features/spellbook/LibroDeConjuros.tsx` (elegir, preparar, quitar) y
> `LanzarConjuro.tsx` (lanzar, con objetivo y nivel de espacio) — probado en verde por
> `apps/web/e2e/conjuros.spec.ts` (elegir) y `apps/web/e2e/lanzar.spec.ts` (lanzar, con daño a la
> bandeja del DM). Un mago de nivel 1 recién creado nace con seis conjuros de nivel 1 ya en el
> libro (D-CF-125); un clérigo, con la lista entera de su clase disponible para preparar. El hueco
> que abrió esta ficha —«no hay lista, ni catálogo, ni fichero de conjuros»— ya no es cierto.
