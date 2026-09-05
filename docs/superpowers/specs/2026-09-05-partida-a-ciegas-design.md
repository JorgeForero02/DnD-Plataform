# La partida a ciegas — un juego de rol sobre un juego de rol

> Escrito el 2026-09-05 por encargo del autor, después de que él mismo entrara en producción y
> encontrara en cinco minutos **dos fallos que 1551 unitarias de API, 1093 de web y 123 recorridos
> de navegador no habían cazado**. Ese es el argumento entero de este documento: la fricción solo
> aparece cuando alguien intenta conseguir algo de verdad.
>
> **Qué es esto.** El diseño de una prueba de caja negra con cuatro agentes: un DM, dos jugadores y
> un observador. No es un plan de tareas ni una auditoría de código. Es una partida de D&D real,
> jugada sobre `dnd.supportive.pro`, donde **cada tropiezo se registra como hallazgo**.
>
> **Qué NO es.** No es una suite de pruebas, no sustituye a `pnpm verify`, y **no se ejecuta desde
> este repositorio**: los tres jugadores trabajan en una carpeta fuera del proyecto y **no pueden
> leer el código** — esa restricción es la prueba, no una formalidad.

---

## 1 · Por qué esta prueba y no otra ronda de arreglos

Los dos fallos que el autor encontró el 2026-09-05, en su primera sesión de uso real:

| Lo que vio | Lo que era | Por qué ninguna prueba lo cazó |
|---|---|---|
| «Enviar un enemigo a la mesa no lo manda al bando de enemigos» | **`sides` no lo escribe ninguna pantalla.** Todos los combatientes entran `NEUTRAL` | La columna existe y el servidor la acepta. No hay nada roto que probar: **falta el gesto** |
| «No veo cómo quitarles vida, ni cómo un jugador les hace daño» | **`PonerDano` existe y está montado** en `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx` | La función está y sus pruebas pasan. Lo que falla es que **la pantalla no se explica** |

**Son dos clases distintas de fallo y ninguna se detecta con más pruebas unitarias.** La primera es
un hueco de producto; la segunda, de descubribilidad. Las dos aparecen sólo al usar la aplicación
con una intención concreta.

Y hay un tercer motivo, que es el que hace interesante el formato: **los modelos son malos asumiendo
papeles fuera de lo convencional**. Poner a tres agentes a jugar de verdad —no a «probar»— fuerza
justo la clase de uso que un tester nunca hace, porque un tester busca lo que sabe buscar y un
jugador necesita lo que necesita.

---

## 2 · La regla que gobierna todo el diseño

> **Si un agente con la pantalla delante no consigue entender algo, el sistema no está listo para
> una persona.**

De ahí sale la decisión más importante de este documento: **una pregunta se registra con el mismo
peso que un fallo**. «¿Cómo se manda un PNJ a combate?» y «no se puede mandar un PNJ a combate» son
el mismo hallazgo con distinta causa, y las dos cuestan una partida.

### La calibración, que hay que tener presente al leer los resultados

Un agente conduciendo un navegador **lee el árbol del documento, no la maqueta**. Eso lo hace
**mejor** que una persona encontrando texto —nunca se le escapa una etiqueta— y **peor** viendo que
algo se sale de la pantalla. El panel de la bandeja que se salía a `x = −166` a 390 px lo encontró
un paseo con medidas numéricas, no leyendo el documento.

Por eso los hallazgos **no pesan igual**:

| Clase de hallazgo | Peso | Por qué |
|---|---|---|
| «¿cómo se llama esto?», «¿por dónde se hace X?», «¿por qué no me deja?» | **Alto** | Si el árbol del documento no lo dice, una persona tampoco lo deduce |
| «no encuentro el botón» con el texto presente | **Alto** | Es flujo e información, no vista |
| «hizo algo distinto de lo que prometía» | **Alto** | Contrato roto |
| «se ve mal / se corta / se solapa» | **Bajo, y su ausencia no prueba nada** | El agente no maqueta. Esto lo mira el autor, y ya hay un paseo con medidas para ello |

---

## 3 · Los cuatro papeles

### 3.1 · El DM — prepara y dirige

**Investiga su papel por su cuenta**, en internet y en la propia plataforma, **nunca en el código**.
Luego hace el trabajo entero de un DM:

- crea la campaña y **prepara dos sesiones**;
- **manda las invitaciones** a los dos jugadores;
- monta el mundo: lugares, personajes no jugadores, facciones, con **su visibilidad decidida a
  propósito** — algo que los jugadores no deben ver todavía;
- monta **enemigos** con sus statblocks, **objetos**, **tablas de la casa**, **reglas del motor**;
- dirige las dos sesiones: escenas, tiradas pedidas, daño, condiciones, reloj, crónica;
- **hace seguimiento**: al cerrar cada sesión escribe qué pasó y qué queda abierto.

**No es una demostración.** Si la partida no se puede jugar, eso es el resultado.

### 3.2 y 3.3 · Los dos jugadores — entran a ciegas

Investigan **cómo se crea un personaje de 5.ª edición** y **cómo se juega**, en internet. Luego
entran a la mesa **sin más contexto que la invitación del DM y lo que la plataforma les enseñe**.

Cada uno crea su personaje, lo equipa, y juega las dos sesiones: tira, ataca, recibe daño, gestiona
su inventario, consulta el mundo, comenta, y **hace lo que un jugador hace** — incluidas las cosas
raras que a nadie se le ocurre probar.

### 3.4 · La madre — observa, arbitra y contesta

**No juega. No interviene en la ficción. No toma apuntes de código durante la partida.**

Hace tres cosas:

1. **Observa en vivo.** Lee lo que hacen los tres y anota lo que ve desde fuera: dónde se atascan,
   qué repiten, qué abandonan.
2. **Contesta preguntas** cuando alguno se bloquea de verdad — y **cada pregunta queda registrada
   antes de contestarse**, con su hora.
3. **Arbitra.** Si alguno intenta salirse del papel —buscar en el código, teorizar sobre la
   arquitectura, ponerse a hacer de tester— **lo corta en seco** y le dice que se mantenga en su
   papel.

**Es la única que puede mirar el código**, y sólo para contestar. Sus conclusiones propias las
escribe al final, aparte de las de los jugadores.

---

## 4 · Las tres fases, y por qué el orden no se negocia

### Fase 0 · Investigación a ciegas — **la más valiosa, y sólo ocurre una vez**

Antes de tocar nada, cada uno de los tres:

1. **Investiga su papel en internet.** Qué hace un DM, cómo se prepara una sesión, cómo se crea un
   personaje. **Fuentes reales, no memoria.**
2. **Escribe qué espera encontrar** en la plataforma: qué pantallas, qué gestos, qué palabras.
3. **Entra por primera vez** y escribe **qué encontró de verdad**.

**La distancia entre lo esperado y lo hallado es el dato más caro del ejercicio, y se pierde para
siempre en cuanto aprenden la plataforma.** No se salta, no se abrevia, y no se hace después.

### Fase 1 · La partida — sólo se juega

Dos sesiones, jugadas en serio, **con un objetivo de ficción que se puede ganar o perder**. El
objetivo importa: si es real, la fricción se descubre **por estorbar**, no por buscarla.

**Durante la partida no se investiga nada.** Se anota en una línea y se sigue jugando:

> `14:32 · NO PUEDO · quise mandar el goblin al bando enemigo y no encontré cómo`

Nada de teorizar, nada de mirar código, nada de romper personaje para analizar. **Quien se pare a
investigar deja de jugar, y la partida deja de medir lo que mide.**

### Fase 2 · La auditoría — ahora sí

Al cerrar cada sesión, cada uno coge **sus** notas y contesta, una por una:

- ¿la función **existe**?
- ¿existe y **no la vi**?
- ¿o **de verdad falta**?

Aquí se levanta la prohibición del código. Y aquí `PonerDano` deja de ser «no se puede hacer daño» y
pasa a ser **«se puede, y no lo encontré»** — que es un hallazgo mejor, no peor.

---

## 5 · El formato de las notas

Un fichero por agente, una línea por hallazgo, **con su hora**. La hora no es decoración: **el
tiempo que alguien estuvo atascado es el dato**.

```
HH:MM · CATEGORÍA · qué intentaba conseguir · qué pasó
```

Cinco categorías, y sólo cinco:

| Categoría | Significa | Ejemplo |
|---|---|---|
| **NO PUEDO** | la función no existe | mandar un enemigo a su bando |
| **NO ENCUENTRO** | existe y está escondida | quitar puntos de golpe desde la mesa |
| **NO ENTIENDO** | la encontré y no sé qué hace | un rótulo ambiguo |
| **RARO** | funcionó distinto de lo que prometía | el contrato roto |
| **PREGUNTA** | tuve que preguntar a la madre | y **cuánto tardé en rendirme** |

**`PREGUNTA` pesa igual que `NO PUEDO`.** Es la regla del apartado 2 puesta en práctica.

---

## 6 · La arquitectura de permisos — cómo se hace cumplir «nada de código»

**Pedirlo no basta.** Un agente con `Read`, `Grep` o `Bash` mirará el código en cuanto se atasque,
sin desobedecer: su instinto es resolver el problema. La valla tiene que ser del arnés, no del
prompt.

### 6.1 · Las carpetas

```
Documentos/partida-a-ciegas/
├── dm/          notas del DM      · .claude/settings.local.json + .mcp.json
├── jugadora/    notas             · idem
├── jugador/     notas             · idem
└── madre/       observación       · SIN restricciones: ella sí lee el código
```

Cada agente arranca **en su propia carpeta**. El proyecto queda fuera de su directorio de trabajo.

### 6.2 · El interruptor que hace el trabajo

```json
{
  "permissions": {
    "blockReadsOutsideWorkingDirectories": true,
    "disableBypassPermissionsMode": "disable",
    "deny": [
      "Read(//c/Users/gogam/Desktop/Trabajo/**)",
      "Bash(cat *D&D-Plataform*)",
      "Bash(grep *D&D-Plataform*)",
      "Bash(*prisma*)",
      "Bash(*pnpm*)"
    ]
  },
  "askUserQuestionTimeout": "5m",
  "dialogExpiry": "5m"
}
```

**`blockReadsOutsideWorkingDirectories` es el cinturón**: rechaza toda lectura de fichero fuera del
directorio de trabajo **en cualquier modo de permisos**, y **basta con que lo ponga una fuente**. No
es un aviso que se pueda aceptar: es un rechazo.

**Las reglas `deny` son el tirante**, porque el interruptor cubre `Read`, `Grep`, `Glob` y `LSP`
pero **no un `cat` por `Bash`**. Un `deny` bloquea **sin preguntar** y gana sobre cualquier `allow`.

**`askUserQuestionTimeout` y `dialogExpiry` resuelven el problema real de una prueba desatendida**:
el autor no va a estar delante, y sin ellos la partida se queda parada a los diez minutos esperando
un clic que nadie va a dar.

### 6.3 · El árbitro: un hook que corta y explica

Un agente no puede conceder ni denegar permisos de otra sesión — **eso no existe, y es deliberado**.
Lo que sí existe es un hook `PreToolUse`, que **devuelve su motivo al agente**:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Read|Grep|Glob",
      "hooks": [{
        "type": "command",
        "if": "Bash(*D&D-Plataform*)",
        "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Eso no está permitido. Mantente en tu papel: pregunta al DM, mira la pantalla, o búscalo en internet.\"}}'"
      }]
    }]
  }
}
```

El jugador **lee esa frase**, en su idioma, y sigue jugando. No es un error mudo: es corte y
corrección en el mismo gesto.

**El campo `if` es la clave del coste.** Un hook de tipo `agent` gasta **una llamada al modelo por
cada uso de herramienta** — con tres agentes durante dos horas son cientos, y el árbitro se
convierte en el cuello de botella. Con `if`, el hook caro **sólo se despierta cuando hace falta
pensar**. Tres capas, de barata a cara:

| Capa | Qué caza | Coste |
|---|---|---|
| `deny` | rutas del proyecto | **cero** — es una regla |
| hook `command` con `if` | patrones conocidos, y responde con la frase | milisegundos |
| hook `agent` con `if` | sólo lo ambiguo | una llamada, y pocas |

### 6.4 · Lo que el hook NO puede hacer

Un hook sólo ve **llamadas a herramientas**. No ve que un jugador salga del personaje narrando,
teorice sobre la arquitectura o empiece a hacer de tester. Eso es prosa, no una herramienta.

Para eso está la madre y su `SendMessage`: lee, ve la deriva, y le manda **«mantente en tu papel»**.
Le llega como mensaje entre sesiones y lo lee en su siguiente turno.

**Hacen falta los dos frenos**: el hook es automático e instantáneo para lo detectable por regla; la
madre es lenta y con criterio para lo que sólo se ve leyendo.

### 6.5 · Internet SÍ. Código NO.

**Decisión del autor:** los agentes **tienen internet y deben usarlo**. Cuando no sepan algo, la
salida es **buscar en internet**, no abrir el repositorio.

Es la elección correcta y no sólo por la valla: **una persona haría exactamente eso**. Un jugador
nuevo que no sabe qué es una tirada de salvación busca en internet; no le pide el código fuente a
nadie. Buscar fuera **mantiene la simulación honesta**; buscar dentro la rompe.

Con una precisión que hay que respetar: **manda el SRD en inglés**. La traducción española pierde
matices, y este proyecto ya lo tiene declarado como regla.

---

## 7 · Los tres navegadores, que era el problema sin resolver

**Un solo navegador comparte cookies.** Si el DM inicia sesión, los jugadores heredan su sesión y la
prueba entera se cae: no hay tres cuentas, hay una.

**Comprobado el 2026-09-05** contra `@playwright/mcp@latest`, que es lo que trae el plugin:

```
--isolated               perfil en memoria, no se guarda en disco
--user-data-dir <ruta>   directorio de perfil propio
--storage-state <ruta>   estado de sesión, para sesiones aisladas
--viewport-size <px>     el ancho, sin tocar nada más
```

Así que **cada agente declara su propio servidor** en el `.mcp.json` de su carpeta:

```json
{
  "playwright": {
    "command": "npx",
    "args": [
      "@playwright/mcp@latest",
      "--user-data-dir", "C:/Users/gogam/Documents/partida-a-ciegas/dm/perfil",
      "--viewport-size", "1280,800"
    ]
  }
}
```

Tres instancias, tres perfiles, tres sesiones que no se pisan. **Y el `--viewport-size` da los dos
anchos gratis**: un jugador a `1280,800` y el otro a `390,844`, para que el móvil se pruebe jugando
en vez de en una pasada aparte.

---

## 8 · El estado de partida, y qué hay que desplegar antes

**Producción está en `cc64ed7`.** Le falta `6eb2590`, que arregla el panel de la bandeja saliéndose
de la pantalla a 390 px. **Hay que desplegarlo antes de empezar**, o el jugador estrecho reportará
un fallo que ya está corregido y se gastará parte de la prueba en él.

La campaña de demostración **ya está sembrada** en la cuenta del autor y en `demo-dm@demo.invalid`
(`scripts/seed-demo.mjs`). **Para esta prueba no se usa**: el DM tiene que construir la suya, porque
construirla **es** la prueba. La sembrada sirve de red por si el DM se atasca del todo.

### El límite de intentos: **no se toca**

Son cinco por minuto. Tres agentes hacen **un inicio de sesión cada uno**, y tres es menos que
cinco. Sólo muerde si reintentan, **y si reintentan es porque algo falló, que es justo lo que
queremos registrar**.

Además, subirlo no es un ajuste: es revertir una decisión declarada en `docker-compose.prod.yml`
—*«AUTH_RATE_LIMIT existe SOLO para la suite de Playwright; ponerla en producción afloja la
protección contra fuerza bruta»*— y cambiar variables en Coolify **recompila la imagen**.

**Y si a alguno le muerde, eso es un hallazgo:** ¿es aceptable que un jugador que se equivoca de
contraseña no pueda entrar durante un minuto sin que la pantalla se lo explique?

---

## 9 · Riesgos, y qué se hace con cada uno

| Riesgo | Por qué pasa | Qué lo contiene |
|---|---|---|
| **Miran el código** | su instinto es resolver, no obedecer | El interruptor + `deny` + el hook. **No el prompt** |
| **Prueban en vez de jugar** | saben que es una prueba | Un objetivo de ficción real, que se gana o se pierde |
| **Rompen personaje para auditar** | jugar y auditar se pelean | Las fases separadas. Durante la partida **sólo se anota** |
| **Se sobre-vigila y se mide el arnés** | reglas de más | **Empezar con la valla mínima.** Es más fácil apretar que aflojar a mitad |
| **La madre resuelve demasiado** | quiere ayudar | Contesta **lo mínimo que desatasca**, nunca el camino completo |
| **Nadie está delante** | prueba desatendida | `askUserQuestionTimeout` y `dialogExpiry` |
| **Se cruzan las sesiones** | un navegador, tres cuentas | Un `--user-data-dir` por agente |

### La regla del árbitro, y va en su prompt

**El árbitro contesta lo mínimo que desatasca, no la solución.** «Mira otra vez la columna del
elenco», no «pincha en Elenco, luego en el retrato, luego en el ±5». Si le das el camino completo,
el siguiente atasco no se produce y **pierdes las mediciones que venían detrás**.

---

## 10 · Qué se entrega, y cuándo está terminada

**Terminada** cuando existan estos cinco documentos y no antes:

1. **Las tres tablas de expectativa contra realidad** de la fase 0 — una por agente, escritas
   **antes** de entrar.
2. **Las notas de partida** de los tres, con hora y categoría.
3. **La auditoría** de cada uno: cada nota clasificada en existe / existe y no la vi / falta.
4. **El registro de preguntas** de la madre: cada una con su hora, cuánto tardó el agente en
   rendirse, y qué contestó.
5. **Las conclusiones propias de la madre**, escritas sin haber visto las de los jugadores.

**Y el criterio de éxito de la partida, que es aparte:** que las **dos sesiones se hayan jugado**. Si
no se pudo, eso **es** el resultado y hay que decir exactamente dónde se rompió.

### Lo que pasa después

Los hallazgos entran en `docs/06-pendientes.md` **con su categoría y su peso**, y los de clase
«existe y no lo vi» se marcan como lo que son: **deuda de descubribilidad**, que es una clase de
ficha que este proyecto todavía no tenía y que sus dos primeros ejemplos ya justifican.

---

## 11 · Lo que esta prueba NO hace

- **No sustituye a `pnpm verify`** ni a la suite de navegador. Es otra capa, no un reemplazo.
- **No mide maquetación.** El agente no ve; eso se mide con Playwright y números.
- **No se despliega nada durante la partida.** Si aparece un fallo, se anota y se sigue jugando:
  cambiar producción a mitad invalida las notas de antes.
- **No se arregla nada durante la partida.** Arreglar es después, con las notas delante y por
  prioridad.
