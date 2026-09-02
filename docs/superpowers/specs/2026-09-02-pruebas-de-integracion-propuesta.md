# Propuesta de pruebas de integración · 2026-09-02

> **Qué es esto.** Al cerrar la fase 2A el proyecto tiene 587 pruebas unitarias, 90 e2e de API y
> 26 de navegador, todas verdes. Y aun así **hay una clase de fallo que ninguna de las tres
> puede ver**. Este documento dice cuál, propone cómo cubrirla, y **ordena las propuestas por lo
> que costaría descubrir el fallo de otra manera**.
>
> No sustituye a [08-pruebas](../../08-pruebas.md), que sigue siendo la estrategia. Esto es la
> capa que le falta.

---

## 1 · El hueco, dicho con precisión

Las tres capas que hay prueban **una pieza cada una**:

| Capa | Qué prueba | Qué NO puede ver |
|---|---|---|
| Unitaria | Un servicio con Prisma simulado | Que el SQL sea válido, que dos módulos encajen |
| e2e de API | **Un módulo** de punta a punta contra Postgres real | Que **una partida entera** funcione: los módulos se prueban de uno en uno |
| Navegador | Que una pantalla se pinta y se lee | Que el estado sobreviva a una sesión larga con varias personas |

**El fallo que se les escapa a las tres tiene nombre: la costura.** Cada suite crea su propia
campaña, sus propios usuarios y sus propios datos, hace tres llamadas y borra. Nadie comprueba
qué pasa cuando **el mismo personaje** pasa por creación → tiradas → daño → descanso →
condición → subida de nivel → una regla que se dispara, **en ese orden y con el estado que deja
cada paso**.

Y ese es justo el sitio donde este proyecto ya ha encontrado sus peores defectos: la traza que
no sumaba, la curación sin tope, «estable» que no sobrevive a su propia petición. **Los tres son
fallos de costura**, y los tres los encontró una lectura, no una prueba.

---

## 2 · Propuesta A — «la partida», una e2e que juega una sesión entera

**La más barata y la que más cubre.** Un solo fichero, `apps/api/test/partida.e2e-spec.ts`, con
**un guion en orden** y sin `beforeEach` que limpie entre pasos: el estado de un paso **es** la
entrada del siguiente, que es exactamente lo que las suites de hoy evitan.

El guion, que es el de una mesa real:

1. El DM crea la campaña e invita a dos jugadores; los dos aceptan.
2. Cada jugador crea su personaje y **rellena la hoja**: características, raza, subraza, clase.
3. Uno deja **una elección sin resolver** → su hoja avisa y **no altera ninguna característica**.
4. El DM crea tres fichas del mundo con visibilidades distintas, una `DM_ONLY`.
5. El DM **arranca la sesión**. Intentar arrancar una segunda **falla**.
6. Un jugador **tira** Percepción contra CD; la tirada queda en el log y **el DM la ve**.
7. El DM tira **oculto**; el jugador **no la ve**.
8. El jugador **recibe daño** hasta 0 → **tiradas de muerte** → se estabiliza.
9. **Descanso corto** gastando dados de golpe; **descanso largo** después → los recursos vuelven,
   **la mitad de los dados de golpe y no todos**.
10. El DM aplica **derribado** → la velocidad efectiva baja a la mitad **con su traza**.
11. El jugador **sube de nivel** → los PG máximos suben y `LEVEL_CHANGED` queda escrito.
12. El DM **arma una regla en modo propuesta**: «cuando un jugador abra la posada, revelar el
    sótano». El jugador abre la posada → **el sótano sigue oculto** y al DM le llega la
    propuesta. El DM la aplica → **entonces** el jugador ve el sótano.
13. El DM **cierra la sesión** → el log de la sesión cuenta la historia completa, y **cada
    jugador ve solo su parte**.

**Lo que esto caza y nada más caza:** que el estado de un módulo sea legible por el siguiente.
Es una prueba larga y lenta a propósito — **su valor está en el orden**, y partirla en trozos
independientes la devuelve a lo que ya tenemos.

**Coste:** un fichero, unas 250 líneas. **Riesgo:** cuando falle, dirá «falló el paso 9» y habrá
que leer. Se acepta: un fallo de costura vale ese rato.

---

## 3 · Propuesta B — el aislamiento, probado con dos actores a la vez

Lo que hoy se prueba con dos usuarios **secuenciales**. Falta el caso simultáneo:

- **Dos jugadores aplicando daño al mismo personaje a la vez** (ya cubierto en 2A.7, se
  incorpora aquí como parte del guion).
- **Un jugador sondeando el log mientras el DM escribe** eventos `DM_ONLY`: el jugador **nunca**
  debe ver uno, ni siquiera a mitad de una cascada de reglas.
- **Una regla que dispara mientras el jugador lee**: el efecto corre con la autoridad del DM, y
  el jugador **no gana** ningún permiso por haberla disparado.

**Por qué importa más de lo que parece:** el motor de reglas es un diputado confundido por
diseño. La prueba de que la contención funciona **no es que el código lo diga**, es que un
jugador disparando reglas a la vez que otro lee no vea nada que no le toque.

---

## 4 · Propuesta C — la mesa de pruebas con agentes

**Esto es lo que pidió el autor, y es distinto de A y B.** A y B son guiones: comprueban lo que
alguien ya pensó. Una mesa de pruebas comprueba **lo que nadie pensó**.

**Cómo:** varios agentes con papeles —un DM y dos o tres jugadores—, cada uno con su cuenta
real, jugando contra la aplicación **desplegada**, con la instrucción de **jugar, no de probar**:
crear su personaje, preguntar cosas, equivocarse, intentar hacer trampa.

**Las tres reglas que hacen que esto valga algo:**

1. **Cada agente actúa solo con su sesión.** Un jugador que mira la base de datos para saber qué
   probar deja de ser un jugador. **Si un jugador ve algo que no debía, tiene que verlo por la
   API, con su token.**
2. **Se reporta lo que sorprende, no lo que falla.** Un 500 lo caza cualquier prueba; lo que no
   caza ninguna es «pulsé descansar y no supe si había pasado algo».
3. **Un jugador intenta hacer trampa a propósito**: tirar por la hoja de otro, leer un evento
   `DM_ONLY` por su identificador, poner una marca de campaña, subirse de nivel dos veces
   seguidas. **Cada intento fallido es una prueba de seguridad ejecutada por un adversario real**
   y no por quien escribió la defensa.

**Sobre los datos:** el autor ha declarado que hasta la primera partida real **todo son datos de
prueba**, así que la mesa puede correr contra producción sin ceremonia. **Eso caduca la semana
que viene**, y a partir de ahí esta propuesta necesita un entorno aparte.

---

## 5 · Propuesta D — lo que ninguna prueba automática debería intentar

Dicho para no gastar esfuerzo donde no rinde:

- **Que la hoja «se entienda».** Eso lo dice el autor mirándola diez minutos, y ya está
  planificado como parte de 2A.11. Ninguna aserción sustituye a eso.
- **Que una regla «tenga sentido» en la mesa.** El motor garantiza que se dispara y que la traza
  lo explica; que la aventura funcione es del DM.
- **El rendimiento del motor con cien reglas.** Se mide cuando haya cien, no antes: el hueco H8
  dice *hay que medirlo, no suponerlo*, y suponer una prueba de carga sobre un uso que no existe
  es la otra cara del mismo error.

---

## 6 · El orden recomendado, y por qué

| | Propuesta | Por qué en ese sitio |
|---|---|---|
| **1.º** | **A · la partida** | Cubre la costura entera con un fichero. La mejor relación entre lo que cuesta y lo que caza |
| **2.º** | **C · la mesa de agentes** | Encuentra lo que nadie pensó, que es lo que A no puede. Y es barata mientras los datos sean de prueba |
| **3.º** | **B · el aislamiento simultáneo** | Lo más difícil de escribir bien, y lo que peor duele si falla. Va después porque A y C pueden revelar antes por dónde apretar |
| **nunca** | **D** | Escrito para no volver a plantearlo |

**Y una regla que atraviesa las cuatro:** una prueba de integración que solo se ejecuta cuando
alguien se acuerda no es una prueba, es un documento. La partida (A) entra en CI con las demás
e2e; la mesa (C) se corre **antes de cada tanda que toque varias funcionalidades**, y su salida
—lo que sorprendió— va a [06-pendientes](../../06-pendientes.md), no a un chat que se pierde.
