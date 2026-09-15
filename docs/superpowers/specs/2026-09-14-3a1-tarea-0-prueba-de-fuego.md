# Tarea 0 · 3A.1 — La prueba de fuego

20 conjuros y 8 aptitudes de clase, a mano, contra Foundry (`packs/_source/{spells,classfeatures,classes}`,
sin sufijo `24`) y el SRD 5.1 español (`referencia-srd-es/srd-5.1-es.txt`). Sin código de producción:
un script desechable en el scratchpad hizo la medición de la sección (b); nada de eso se commitea.

Fuentes primarias citadas: `srd-5.1-es.txt` (líneas indicadas junto a cada cita) y los `.yml` de
Foundry (ruta relativa a `packs/_source/`). Estructura objetivo: `packages/shared/src/activity.schema.ts`,
`origen.schema.ts`, `apps/api/src/rules/catalog/{classes.ts,types.ts}`.

---

## a) Los 28 mapeos a mano

### a.1 — Los 20 conjuros

Para cada uno: nombre y primeras líneas del SRD español (con la línea donde aparecen), si el
nombre sorprende, y la `Actividad` literal o `{texto:true, motivo}`. El origen de cada `@` se cita
en línea. Seis de los veinte (los que Step 5 pedía explícitamente, más los dos que exponen el hueco
de mayor impacto) tienen su ficha completa y su razonamiento en `casos-raros.json`; aquí se repite
solo su literal para que la lista quede completa y se referencia el fichero para el "porqué".

#### 1. Magic Missile → **Proyectil mágico** (`srd-5.1-es.txt:21594`)

> «Creas tres dardos brillantes de fuerza mágica y cada uno de ellos impacta contra una criatura de
> tu elección a la que puedas ver dentro del alcance. Cada dardo inflige 1d4 + 1 de daño de fuerza
> al objetivo.»

Nombre esperable, sin sorpresa. Foundry: `type: damage` (NO `attack`: los dardos golpean solos,
sin tirada) — dato que confirma por qué A6 tiene un tipo `dados` separado de `ataque`.
`target.affects.count` no es literal `3`: la cuenta real está en la prosa («A niveles superiores…
un dardo adicional por cada nivel por encima de 1») y encaja EXACTO con la forma compuesta de
`objetivo.cantidad` que ya usa `bless` (`{ origen: nivelDeEspacio, mas: 2 }` → 3 dardos a nivel 1).

```json
{
  "tipo": "dados",
  "activation": { "coste": "ACTION" },
  "target": { "tipo": "criatura", "cantidad": { "origen": { "tipo": "nivelDeEspacio" }, "mas": 2 } },
  "range": { "unidad": "pies", "distanciaFt": 120 },
  "duration": { "unidad": "instantanea", "concentracion": false },
  "dados": { "n": 1, "caras": 4, "bonus": { "tipo": "fijo", "valor": 1 }, "signo": -1, "tipoDeDano": "FORCE" }
}
```

#### 2. Fireball → **Bola de fuego** (`srd-5.1-es.txt:15356`) — ver `casos-raros.json` (`fireball`)

Sin sorpresa de nombre. `tipo: "salvacion"`, `dex`, `cdDeConjuro`, `siSalva: "mitad"`, `8d6` fuego,
`escalado: { por: "espacio", n: 1, caras: 6 }`. El crítico 1 de la revisión de calidad de
`activity.schema.ts` ya lo cita como ejemplo canónico.

#### 3. Cure Wounds → **Curar heridas** (`srd-5.1-es.txt:17046`) — ver `casos-raros.json` (`cure-wounds`)

Sin sorpresa. `tipo: "dados"`, `bonus: { tipo: "lanzamiento" }` (el `@mod` que motivó esa variante
de `Origen` en A4), `escalado: { por: "espacio", n: 1, caras: 8 }`.

#### 4. Fire Bolt → **Descarga de fuego** (`srd-5.1-es.txt:17151`) — ver `casos-raros.json` (`fire-bolt`)

**Nombre que sorprende de verdad**: no es «Rayo de fuego» ni «Dardo de fuego», es **«Descarga de
fuego»** — y choca de huella exacta con *Eldritch Blast* («Descarga sobrenatural»), que tampoco es
el literal que se adivinaría. `{ texto: true, motivo: "..." }` — ver el hueco B más abajo: falta el
`Origen` del bono de ataque de conjuro.

#### 5. Bless → **Bendición** (`srd-5.1-es.txt:15296`)

> «Bendices a hasta tres criaturas de tu elección dentro del alcance. Hasta que el conjuro termine,
> siempre que un objetivo haga una tirada de ataque o una tirada de salvación, podrá tirar 1d4 y
> sumar el resultado a esas tiradas.»

Sin sorpresa de nombre. El «+1d4 no entero» que el plan citaba como caso difícil **no se automatiza
como número**: `effects` (`applyConditionSchema`) solo marca condiciones, no «suma 1d4 a tus
próximas tiradas» — ese vocabulario (`TEMPORARY_MODIFIER_TARGETS`) es de otro esquema
(`character-state.schema.ts`) y no está en `ApplyConditionInput`. Es el mismo recorte que la Furia
ya declara a propósito («no cubre qué número cambia»): se importa completo salvo ese número, que
queda en `description`.

```json
{
  "tipo": "utilidad",
  "activation": { "coste": "ACTION" },
  "target": { "tipo": "criatura", "cantidad": { "origen": { "tipo": "nivelDeEspacio" }, "mas": 2 } },
  "range": { "unidad": "pies", "distanciaFt": 30 },
  "duration": { "valor": 1, "unidad": "minuto", "concentracion": true },
  "materiales": { "texto": "unas gotas de agua bendita", "consumido": false, "costeCp": 0 },
  "description": "Hasta que el conjuro termine, siempre que un objetivo haga una tirada de ataque o una tirada de salvación, puede tirar 1d4 y sumar el resultado a esas tiradas. El servidor NO suma automáticamente el 1d4: el vocabulario de `effects` solo marca condiciones, no bonificadores numéricos a tiradas futuras."
}
```

#### 6. Shield → **Escudo** (`srd-5.1-es.txt:18109`)

> «Aparece una barrera invisible de fuerza mágica que te protege. Hasta el principio de tu siguiente
> turno, tienes un bonificador de +5 a la CA (…) y no recibes ningún daño del conjuro proyectil
> mágico.»

Sin sorpresa. `range.units: self` en Foundry → nuestro `"personal"`. El +5 a la CA es, otra vez, un
cambio numérico (`system.attributes.ac.bonus`) fuera de lo que `effects` automatiza — mismo recorte
que Bless.

```json
{
  "tipo": "utilidad",
  "activation": {
    "coste": "REACTION",
    "condicion": "que llevas a cabo cuando te impacta un ataque o eres el objetivo del conjuro proyectil mágico"
  },
  "range": { "unidad": "personal" },
  "duration": { "valor": 1, "unidad": "asalto", "concentracion": false },
  "description": "Hasta el principio de tu siguiente turno tienes un bonificador de +5 a la CA, incluido contra el ataque al que reacciona, y no recibes ningún daño del conjuro proyectil mágico. El servidor no suma el +5 solo; queda como texto por la misma razón que Bendición."
}
```

#### 7. Sleep → **Dormir** (`srd-5.1-es.txt:17805`)

> «Tira 5d8; el resultado será el total de puntos de golpe de las criaturas a las que puede afectar
> este conjuro. Las criaturas que se encuentren a 6 m o menos de un punto de tu elección (…) se
> verán afectadas en orden ascendente (…)»

Sin sorpresa. `texto: true` — como pedía la brief. `roll.formula: '5d8 + (@scaling.increase * 2)d8'`
es una tirada que **reparte una reserva de puntos de golpe entre un número indeterminado de
objetivos, en orden**, no un daño ni una curación a un objetivo fijo: no hay `tipo` de los cinco que
lo cubra, y `@scaling.increase` no es ninguna de las siete variantes de `Origen` (es un contador
interno de Foundry — cuántos niveles de espacio por encima del mínimo — que solo tiene sentido
dentro de una fórmula de texto que este proyecto no evalúa).

```json
{ "texto": true, "motivo": "roll.formula = '5d8 + (@scaling.increase * 2)d8' reparte una reserva de PG entre un número de criaturas no fijado por adelantado, en orden ascendente de sus propios PG actuales — no es daño a un objetivo ni curación; ningún tipo de los cinco lo cubre, y @scaling.increase no es una variante de Origen." }
```

#### 8. Spiritual Weapon → **Arma espiritual** (`srd-5.1-es.txt:14979`)

> «Creas un arma espectral flotante dentro del alcance que dura hasta que el conjuro termine o
> vuelvas a lanzarlo. Al lanzar este conjuro, puedes realizar un ataque de conjuro cuerpo a cuerpo
> contra una criatura (…)»

**Sorpresa real, y no de nombre: de tipo.** La brief lo describía como «ataque de conjuro con
dados», pero su actividad principal en Foundry es **`type: summon`** (`profiles` apunta a un actor
`Spiritual Weapon` del compendio de monstruos) — el arma es un invocado, no una tirada de ataque
directa. `summon` está fuera de A por decisión del autor (2026-09-06, sin reabrir). La segunda
actividad (`Move & Command`, `type: utility`) no trae mecánica propia (su `roll.formula` está
vacío): el ataque real vive dentro del actor invocado, no en esta actividad.

```json
{ "texto": true, "motivo": "La actividad principal es type: summon (invoca un actor 'Spiritual Weapon' del compendio), no attack — summon está fuera de A por decisión de autor. La segunda actividad (mover y ordenar) no trae mecánica propia que capturar." }
```

#### 9. Healing Word → **Palabra de curación** (`srd-5.1-es.txt:20837`)

**Nombre que sorprende**: no es «Palabra curativa» — es **«Palabra de curación»**.

> «Una criatura de tu elección que puedas ver dentro del alcance recupera una cantidad de puntos de
> golpe igual a 1d4 + tu modificador por aptitud mágica.»

```json
{
  "tipo": "dados",
  "activation": { "coste": "BONUS" },
  "range": { "unidad": "pies", "distanciaFt": 60 },
  "duration": { "unidad": "instantanea", "concentracion": false },
  "dados": { "n": 1, "caras": 4, "bonus": { "tipo": "lanzamiento" }, "signo": 1, "escalado": { "por": "espacio", "n": 1, "caras": 4 } }
}
```

#### 10. Sacred Flame → **Llama sagrada** (`srd-5.1-es.txt:19749`)

Sin sorpresa. Es el ejemplo canónico de `siSalva: "ninguno"` (el SRD lo dice literal: «o sufrirá
1d8 de daño radiante» — no hay mitad en un fallo, solo hay daño o nada).

```json
{
  "tipo": "salvacion",
  "activation": { "coste": "ACTION" },
  "range": { "unidad": "pies", "distanciaFt": 60 },
  "duration": { "unidad": "instantanea", "concentracion": false },
  "salvacion": { "ability": "dex", "cd": { "tipo": "cdDeConjuro" }, "siSalva": "ninguno" },
  "dados": { "n": 1, "caras": 8, "signo": -1, "tipoDeDano": "RADIANT", "escalado": { "por": "nivelDePersonaje", "n": 1, "caras": 8 } }
}
```

#### 11. Burning Hands → **Manos ardientes** (`srd-5.1-es.txt:20045`)

Sin sorpresa. El cono (15 pies) no tiene forma en `objetivo` (esa geometría vive en
`target.template`, fase 3, fuera de alcance por diseño ya declarado): se importa sin forma, con el
alcance como `"personal"`.

```json
{
  "tipo": "salvacion",
  "activation": { "coste": "ACTION" },
  "range": { "unidad": "personal" },
  "duration": { "unidad": "instantanea", "concentracion": false },
  "salvacion": { "ability": "dex", "cd": { "tipo": "cdDeConjuro" }, "siSalva": "mitad" },
  "dados": { "n": 3, "caras": 6, "signo": -1, "tipoDeDano": "FIRE", "escalado": { "por": "espacio", "n": 1, "caras": 6 } }
}
```

#### 12. Hold Person → **Inmovilizar persona** (`srd-5.1-es.txt:19467`)

Sin sorpresa. `siSalva: "ninguno"` sin `dados` (no hay daño, solo parálisis) — el caso que el propio
comentario de `salvacionSchema` cita: «de las 150 actividades `save`, solo una trae `ability: []`»
no es este; este es el caso normal de una salvación sin daño. `effects` sí encaja perfecto: la
clave `"paralyzed"` está en `SRD_CONDITIONS`.

```json
{
  "tipo": "salvacion",
  "activation": { "coste": "ACTION" },
  "range": { "unidad": "pies", "distanciaFt": 60 },
  "duration": { "valor": 1, "unidad": "minuto", "concentracion": true },
  "effects": [{ "key": "paralyzed", "durationSeconds": 60, "note": "Inmovilizado por Inmovilizar persona" }],
  "salvacion": { "ability": "wis", "cd": { "tipo": "cdDeConjuro" }, "siSalva": "ninguno" }
}
```

#### 13. Revivify → **Revivir** (`srd-5.1-es.txt:22140`) — ver `casos-raros.json` (`revivify`)

Sin sorpresa de nombre. `dados: { bonus: { tipo: "fijo", valor: 1 }, signo: 1 }` (cero dados, solo
un bonus fijo — el caso que ya motivó que `n`/`caras` sean opcionales). `materiales.costeCp: 30000`
(300 po × 100, **no** el `100` que trae `materials.cost` de Foundry: el propio dato de Foundry
discrepa de su propio texto).

#### 14. Magic Weapon → **Arma mágica** (`srd-5.1-es.txt:15005`)

Sin sorpresa. `type: enchant` → fuera de A por decisión de autor, tal cual predecía la brief.

```json
{ "texto": true, "motivo": "type: enchant. Fuera de A por decisión de autor (2026-09-06): summon/transform/enchant/teleport/forward/cast/order se importan con su prosa, sin actividad." }
```

#### 15. Conjure Animals → **Conjurar animales** (`srd-5.1-es.txt:16155`)

Sin sorpresa. `type: summon` → fuera de A, tal cual predecía la brief (es el ejemplo ya citado en el
comentario de `activity.schema.ts`, «comprobado con `conjure-animals`»).

```json
{ "texto": true, "motivo": "type: summon. Fuera de A por decisión de autor — el mismo ejemplo que activity.schema.ts ya cita." }
```

#### 16. Polymorph → **Polimorfar** (`srd-5.1-es.txt:21190`)

Sin sorpresa. `type: transform` → fuera de A, tal cual predecía la brief.

```json
{ "texto": true, "motivo": "type: transform. Fuera de A por decisión de autor." }
```

#### 17. Counterspell → **Contrahechizo** (`srd-5.1-es.txt:16618`) — ver `casos-raros.json` (`counterspell`)

Sin sorpresa. `tipo: "prueba"`, `ability: "lanzamiento"` (`check.ability: "spellcasting"`), `cd`
ausente (la CD «10 + el nivel del conjuro lanzado» se fija en la mesa, no en el catálogo).

#### 18. Lesser Restoration → **Restablecimiento menor** (`srd-5.1-es.txt:22059`)

Sin sorpresa. `type: utility` puro: cura UNA condición A ELECCIÓN entre cuatro (cegado, ensordecido,
envenenado, paralizado) — cuál, lo decide la mesa; no hay dato estructurado que diga cuál, así que
`effects` se queda vacío y la elección queda en `description`.

```json
{
  "tipo": "utilidad",
  "activation": { "coste": "ACTION" },
  "range": { "unidad": "toque" },
  "duration": { "unidad": "instantanea", "concentracion": false },
  "description": "Tocas a una criatura y curas una enfermedad o un estado que la aflija: cegado, ensordecido, envenenado o paralizado, a tu elección. El servidor no aplica la cura sola: quita la condición a mano."
}
```

#### 19. Scorching Ray → **Rayo abrasador** (`srd-5.1-es.txt:21704`) — ver `casos-raros.json` (`scorching-ray`)

Sin sorpresa de nombre. `{ texto: true }` — mismo hueco B que Fire Bolt, más un segundo hueco propio
(tres tiradas de ataque independientes, no una sola aplicada a varios objetivos).

#### 20. Mass Cure Wounds → **Curar heridas en masa** (`srd-5.1-es.txt:17060`)

Sin sorpresa. Mismo patrón que Cure Wounds. «Hasta seis criaturas» no tiene forma estructurada en
`target.affects` (vacío, como 105 de los 319 conjuros del SRD) — se deja `objetivo` sin definir y
el número queda en `description`, exactamente el recorte que el propio comentario de `objetivoSchema`
ya declara.

```json
{
  "tipo": "dados",
  "activation": { "coste": "ACTION" },
  "range": { "unidad": "pies", "distanciaFt": 60 },
  "duration": { "unidad": "instantanea", "concentracion": false },
  "dados": { "n": 3, "caras": 8, "bonus": { "tipo": "lanzamiento" }, "signo": 1, "escalado": { "por": "espacio", "n": 1, "caras": 8 } },
  "description": "Una ola de energía curativa brota de un punto de tu elección dentro del alcance. Elige a hasta seis criaturas en una esfera de 9 m de radio centrada en ese punto. Cada objetivo recupera una cantidad de puntos de golpe igual a 3d8 + tu modificador por aptitud mágica."
}
```

### a.2 — Las 8 aptitudes de clase

Ficha completa (con la `Actividad`/`texto` literal, el `porqué` y la cita del SRD) en
`casos-raros.json`, entradas `barbarian:rage`, `fighter:second-wind`, `rogue:sneak-attack`,
`paladin:lay-on-hands`, `cleric:channel-divinity-turn-undead`, `monk:ki`, `druid:wild-shape`,
`fighter:action-surge`. Resumen y nombre español de cada una:

| Aptitud (Foundry) | Nombre SRD ES | ¿Sorprende? | Resultado |
|---|---|---|---|
| Rage | **Furia** (`srd-5.1-es.txt:792`) | No — coincide con `classes.ts` (RASGO_FURIA) tal cual | `ItemGrant` (ya existía, se compara) |
| Second Wind | **Tomar Aliento** (`srd-5.1-es.txt:4237`) | **Sí** — no es «Segundo aliento» | `ItemGrant` nuevo — segundo caso real de `nivelDeClase` |
| Sneak Attack | **Ataque Furtivo** (`srd-5.1-es.txt:6752`) | No | `texto` — hueco A (dados por tabla de escala) |
| Lay on Hands | **Imponer las Manos** (`srd-5.1-es.txt:6262`) | Medio — no es «Imposición de manos» | `texto` — hueco C (consumo variable = efecto) |
| Channel Divinity: Turn Undead | **Canalizar Divinidad: Expulsar Muertos Vivientes** (`srd-5.1-es.txt:2680`) | No, es la traducción literal | `ItemGrant` nuevo (con matiz de CD, ver ficha) |
| Ki | **Ki** (`srd-5.1-es.txt:5808`) | No | `ItemGrant` nuevo — tercer caso de `nivelDeClase` (=puntos de ki) |
| Wild Shape | **Forma Salvaje** (`srd-5.1-es.txt:3215`) | No | `texto` — hueco B-bis (duración variable) + ya es `transform` |
| Action Surge | **Acción Súbita** (`srd-5.1-es.txt:4237`, tabla «El guerrero») | **Sí** — no es «Oleada de acción» | `ItemGrant` nuevo |

Las ocho se emparejaron por **(clase, nivel, posición en la tabla de la clase)** — E-3A1-2 — leyendo
la tabla «El guerrero» / «El bárbaro» / etc. del SRD español línea a línea contra el `advancement`
de `classes/<clase>.yml`, no por huella (las aptitudes no tienen huella numérica comparable a la de
un conjuro). Ejemplo íntegro, tabla «El guerrero» (`srd-5.1-es.txt:4126`):

```
1  +2  Estilo de Combate, Tomar Aliento
2  +2  Acción Súbita (un uso)
...
17 +6  Acción Súbita (dos usos), Indómito (tres usos)
```

que en `classfeatures/fighter/fighter-features/{second-wind,action-surge}.yml` corresponde exacto
a `requirements: Fighter 1` / `Fighter 2`.

---

## b) La huella — números medidos

Script desechable en el scratchpad de sesión (Python 3 + `pyyaml`, sin tocar el repo). Huella:
`(nivel, escuela, alcance-en-unidad-de-Foundry, distancia-en-pies, V, S, M, duración-unidad,
duración-valor, concentración, ritual)`, y su contraparte en `srd-5.1-es.txt`
`(nivel, escuela, alcance-en-pies↔metros, V, S, M, duración, concentración)`. Se usa
**alcance con su tipo (toque/personal/ilimitado/especial/pies) y no solo el número**: fundir
«toque» y «personal» en `None` daba huellas falsamente iguales (ver corrección de bug más abajo).

- **Universo:** 331 ficheros en `spells/`. De ellos, **319 son `type: spell` con `system.source.rules
  === '2014'`** (los otros 12: 11 carpetas `_folder.yml` de nivel y **1 `type: weapon`** —
  `spells/supplemental-items/conjured-flame-blade.yml` — ver sección (d)).
- **Foundry, huellas únicas:** 300 huellas distintas entre 319 conjuros. **284 son huella única**
  (un solo conjuro la tiene) → esos 284 se emparejan automáticamente por huella. **16 huellas
  colisionan** (más de un conjuro comparte huella), cubriendo los 35 conjuros restantes.
- **SRD español, cabeceras regulares:** con la regla de corte de la sección (c) —tolerante a
  `(ritual)`, a `(truco)`, a campos partidos en varias líneas y a la escuela escrita «Ilusionismo»—
  se encuentran **319 cabeceras regulares, una por cada uno de los 319 conjuros** (recuento por
  nivel idéntico al de Foundry en los diez niveles, 0–9). De ellas, **300 huellas distintas, 284
  únicas y 16 colisionan** — los mismos números que en Foundry, punto por punto: la huella
  estructural, con la corrección de alcance, es simétrica en las dos fuentes.
- **Casan 1:1 automáticamente (huella única en las dos fuentes, con el mismo valor):** **261
  conjuros** — el 82 % del total, sin tocar un nombre a mano.
- **Grupos de choque (huella compartida en ambos lados, 2–3 candidatos):** **17 grupos**, resueltos
  a mano en `emparejamientos.json` §`conjuros`, cubriendo 36 conjuros (dos de los 17 grupos son
  **asimétricos** — un identificador de Foundry contra dos nombres españoles, o al revés: `locate-object`
  y `mage-hand`/`produce-flame` — señal de una divergencia de datos real entre Foundry y el SRD,
  ver más abajo).
- **Total que exige entrada a mano en `emparejamientos.json`:** 319 − 261 = **58 conjuros** (los 17
  grupos de choque + los residuales de huella asimétrica que no cerraban un grupo limpio).

**Nota sobre los dos choques asimétricos** (no son ambigüedad real, son un aviso para T1):
`produce-flame` (**Crear llama**, `srd-5.1-es.txt:16866`) declara en Foundry `range: { value: '30',
units: 'ft' }`, pero el SRD 5.1 español dice **«Alcance: Lanzador»** (toque/personal, sin distancia)
— un desacuerdo de DATOS entre la fuente inglesa y la española para el mismo conjuro, no un fallo de
huella. `locate-object` colisiona de huella con `Detectar pensamientos` (que es en realidad
`detect-thoughts`, un conjuro con su propia entrada, no relacionado) por la misma clase de motivo.
**Ningún emparejamiento se cerró por descarte silencioso**: los dos quedan con su nombre correcto en
`emparejamientos.json`, con un comentario que dice por qué la huella no bastaba, para que T1 no
confíe ciegamente en la coincidencia automática sin mirar el conjuro.

**Corrección hecha durante la medición (para que quien repita el script no tropiece dos veces):**
la primera versión del script no separaba el TIPO de alcance (toque/personal/pies) del NÚMERO, así
que `cure-wounds` (toque) y `burning-hands` (personal/lanzador) parecían tener la misma huella que
otro conjuro de alcance `None`; con la distinción, 156 matches 1:1 subieron a 261.

---

## c) Cabeceras irregulares — la regla de corte

Con una regla de corte **tolerante** se llega a 319/319 cabeceras encontradas (0 «sin cabecera»),
frente a las 295/320 que la medición previa del plan daba por un lector más estricto. Los ~25 que
el plan preveía «irregulares» se explican con tres reglas, no con 25 casos sueltos:

1. **Sufijo `(ritual)` tras el nivel.** `Adivinación nivel 1 (ritual)` (Detectar magia,
   `srd-5.1-es.txt:17447`). Regla: aceptar un `(ritual)` opcional después de `nivel N`, antes del
   fin de línea.
2. **Trucos escritos `Escuela (truco)`, no `Escuela nivel 0`.** `Evocación (truco)`
   (Descarga de fuego, `srd-5.1-es.txt:17152`). Regla: `(truco)` ⇒ nivel 0.
3. **Escuela de Ilusión escrita «Ilusionismo», no «Ilusión».** `Ilusionismo nivel 5`
   (`srd-5.1-es.txt:14942`). El SRD 5.1 español usa **las dos** grafías en distintos sitios del
   documento (el índice de escuelas usa «Ilusión»; las cabeceras de conjuro usan «Ilusionismo»).
   Regla: aceptar ambas, normalizar al mismo código de escuela (`ill`).
4. **Los cuatro campos (Tiempo de lanzamiento / Alcance / Componentes / Duración) se parten en
   varias líneas.** Tres causas reales, con ejemplo cada una:
   - Una reacción con condición larga: *«Tiempo de lanzamiento: 1 reacción, que llevas\na cabo
     cuando una criatura que puedas ver a 18 m\no menos de ti lance un conjuro»* (Contrahechizo,
     `srd-5.1-es.txt:16620`) — 3 líneas antes de llegar a «Alcance».
   - Un material largo: *«Componentes: V, S, M (una pizca de arena fina,\npétalos de rosa o un
     grillo)»* (Dormir, `srd-5.1-es.txt:17809`).
   - Un alcance con nota: *«Alcance: Lanzador (cono de 4,5 m)»* (Manos ardientes,
     `srd-5.1-es.txt:20048`) — cabe en una línea, pero confirma que el alcance no siempre es
     `Número m` ni una palabra sola.

   Regla: no asumir una posición de línea fija tras la cabecera de escuela — leer hacia delante
   dentro de una ventana amplia (~20 líneas) y exigir que las cuatro etiquetas aparezcan **en
   orden**, sea cual sea cuántas líneas ocupe cada una.
5. **Un salto de página cae DENTRO del cuerpo de un conjuro**, no en su cabecera. Ejemplo íntegro,
   Palabra de curación (`srd-5.1-es.txt:20837`): la descripción se corta justo tras «recupera una
   cantidad de puntos de golpe igual a 1d4 + tu modificador por aptitud», mete el pie de página
   («Documento de referencia del sistema 5.1. 182 / Prohibida la reventa…») y sigue con «mágica.»
   en la línea siguiente. La cabecera en sí queda intacta; lo que hay que limpiar es la prosa: el
   pie de página no es parte del texto del conjuro y no marca el principio de uno nuevo.

**Tablas de clase** («El guerrero / Nivel / Bon. por competencia / Rasgos», `srd-5.1-es.txt:4126`):
se imprimen como una secuencia plana de celdas, una por línea (nivel, bonificador, lista de
rasgos…), y cuando la tabla cruza una página **repite la fila de cabecera** («Nivel / Bon. por
competencia / Rasgos») a mitad de tabla (ver línea 4159 del guerrero, antes del nivel 12). Regla de
corte: leer la tabla como tripletas planas (nivel, bono, rasgos) y tratar una repetición de la fila
de cabecera como marca de salto de página que se descarta, no como una fila de datos nueva.

**Listas de conjuros por clase** («Lista de conjuros del mago», `srd-5.1-es.txt:13985` y análogas):
son solo nombres bajo un rótulo «Nivel N», sin las cuatro etiquetas de una cabecera real — la
propia regla del punto 4 (exigir las cuatro etiquetas en orden) ya las descarta sin necesidad de
una regla aparte: nunca se confunden con el cuerpo real de un conjuro porque nunca traen «Tiempo de
lanzamiento» ni las otras tres etiquetas a continuación.

---

## d) Excepciones y el censo completo de fórmulas `@`

### d.1 — Ficheros que no son conjuro ni aptitud

| Qué | Cuántos | Qué hace el conversor |
|---|---|---|
| `spells/*/_folder.yml` (carpetas de nivel, `type: Item`) | 11 | Se saltan — no son datos, son la carpeta de Foundry |
| `spells/supplemental-items/conjured-flame-blade.yml` (`type: weapon`) | 1 | **Rechazo declarado**: es el arma que crea *Flame Blade* (`spells/2nd-level/flame-blade.yml`), no un conjuro ni una aptitud — vive en `spells/` porque Foundry agrupa por «qué invoca un conjuro», no por tipo de ítem. Entra en el informe de rechazos, nunca en el catálogo de conjuros. Con esta excepción, 319 + 1 = **320**, el número exacto del plan. |
| `classfeatures/**/_folder.yml` (carpetas de clase/subclase) | 40 | Se saltan |
| `classfeatures/monk/monk-features/unarmed-strike.yml` (`type: weapon`) | 1 | **Rechazo declarado**: el Golpe sin Armas del monje está modelado como un arma equipable, no como una aptitud con actividad — mismo motivo que el de arriba. Con esta excepción, 234 aptitudes `type: feat` quedan limpias (235 ficheros no-carpeta − 1 arma = 234, el número del plan) |
| `subclasses/*.yml` (planas, sin carpetas) | 12 | Se leen igual que las clases: cada una aporta `features: ClassFeature[]` a su clase base. Confirmado: 12 ficheros, el número del plan |
| `races/**/_folder.yml` | 15 | Se saltan (fuera de alcance de conversión en 3A.1 — spells/classfeatures únicamente; solo se usan aquí para el censo de fórmulas `@`) |
| `races/**/*.yml` no-carpeta | 35 (26 `type: feat`, 9 `type: race`) | Fuera de alcance de conversión en 3A.1; se listan solo por el censo de `@` de la tabla d.2 |

### d.2 — Censo completo de fórmulas `@` (spells + classfeatures + races)

Medido con `grep` sobre las tres carpetas: **35 fórmulas distintas** (descontando `@UUID`, que no
es una fórmula sino un enlace de texto enriquecido — se limpia en la prosa por E-3A1-7, no entra
aquí), agrupadas en **9 formas**.

| Fórmula (ejemplo real) | Ocurrencias | Forma de `Origen` | Nota |
|---|---|---|---|
| `@item.level` | 31 | `nivelDeEspacio` | El nivel del espacio con el que se lanzó |
| `@mod` | 13 | `lanzamiento` | Modificador de la característica de quien lanza |
| `@abilities.dex.mod`, `@abilities.cha.mod` | 4 | `modificador(dex)`, `modificador(cha)` | Característica fija, nombrada |
| `@classes.fighter.levels`, `@classes.monk.levels`, `@classes.druid.levels`, `@classes.cleric.levels`, `@classes.paladin.levels`, `@classes.sorcerer.levels`, `@classes.warlock.levels`, `@classes.wizard.levels` | 1–4 c/u (13 total) | `nivelDeClase(<clase>)` | E-3A1-4, la variante que esta tanda añade — 3 casos reales en las 8 aptitudes: Tomar Aliento, Ki, y el propio ejemplo de la spec |
| `@scale.barbarian.rages`, `@scale.barbarian.rage-damage`, `@scale.fighter.action-surge`, `@scale.fighter.indomitable`, `@scale.cleric.channel-divinity`, `@scale.bard.inspiration`, `@scale.bard.song-of-rest`, `@scale.druid.wild-shape-uses`, `@scale.monk.die`, `@scale.monk.unarmored-movement`, `@scale.rogue.sneak-attack`, `@scale.life-domain.divine-strike`, `@scale.dragonborn.breath-weapon` | 1–10 c/u (35 total) | `escala("<clase>-<clave>")`, tabla inlinada desde el `advancement` de Foundry | **`@scale.rogue.sneak-attack` es la excepción**: no es un *bonus* que se SUMA a una expresión de dados fija, es la expresión ENTERA (`n` y `caras` a la vez) — no cabe en `bonus: Origen`. Ver hueco A |
| `@scaling`, `@scaling.increase` | 14 | **Rechazo** | Contador interno de Foundry (cuántos niveles de espacio por encima del mínimo), solo tiene sentido embebido en una fórmula de texto libre (`roll.formula`, p. ej. Dormir) que este proyecto no evalúa. Cuando la MISMA idea aparece en `damage.parts[].scaling` (estructurado, no una cadena `@`) sí tiene representación: es `dados.escalado` |
| `@item.uses.value`, `floor(@item.uses.value / 5)` | 2 | **Rechazo** | Tope de cuánto se puede gastar de una reserva, elegido en la mesa — ver hueco C |
| `@attributes.movement.walk`, `@attributes.hp.max`, `@details.level`, `@flags.world.flame-blade-damage`, `@flags.world.mirror-image` | 1–2 c/u | **Rechazo** | Campos de bandera de mundo (`@flags.world.*`, datos de mesa/homebrew de Foundry, nunca del SRD) o de contexto de raza/monstruo fuera del alcance declarado de 3A.1 (`races` no se convierte esta tanda) |
| `@labels.duration`, `@labels.description.template`, `@labels.description.affects`, `@labels.description.range` | 26 | **Rechazo (no es una fórmula)** | Etiquetas de presentación que el propio Foundry autogenera para SU interfaz — no llevan un valor de juego, se descartan al limpiar la prosa (mismo paso que `@UUID`, E-3A1-7) |
| `@embed` | 3 | **Rechazo (no es una fórmula)** | Macro de Foundry para incrustar contenido de otro documento — se limpia en prosa, igual que `@UUID` |

---

## e) Conteos

- **Conjuros:** 319 `type: spell` (`rules: '2014'`) + 1 `type: weapon` (rechazo declarado) = **320**,
  exacto con el plan.
- **Aptitudes:** 234 `type: feat` en `classfeatures/` (235 no-carpeta − 1 `type: weapon`) + 40
  carpetas descartadas = 275 ficheros de `classfeatures/`, exacto con el recuento del plan
  (`331/275/50` citado en `constraints.md`, línea 8, con sus 51 carpetas).
- **Subclases:** 12, planas, sin carpetas.
- **Huella (conjuros):** 300 huellas distintas en cada lado; 284 únicas por lado; 16 grupos de
  choque por lado, cubriendo 35 conjuros por lado; **261 conjuros casan 1:1 en automático** (82 %);
  **58 exigen entrada a mano** en `emparejamientos.json` (17 grupos de choque cubriendo 36
  conjuros de Foundry + 22 que no tienen ninguna huella hermana en el lado español — de los cuales
  al menos 2 son asimétricos y merecen revisión de datos, no solo de nombre, en T1).
- **Cabeceras españolas regulares (tras la regla de corte tolerante):** 319/319.
- **Actividades de los 319 conjuros:** 491 actividades en total (108 conjuros con más de una,
  E-3A1-5), repartidas `utility` 228, `save` 150, `summon` 29, `damage` 19, `attack` 17, `heal` 16,
  `check` 14, `enchant` 11, `transform` 6, `teleport` 1 — **444 dentro de A** (save+attack+damage+
  heal+utility+check) y **47 fuera de A** (summon+transform+enchant+teleport), medido directo sobre
  los 319 ficheros, coincide con los números que ya cita `activity.schema.ts` (150 `save`, 14
  `check`).
- **De los 20 conjuros de esta tarea:** 13 entran en A con una `Actividad` completa (magic-missile,
  fireball, cure-wounds, bless\*, shield\*, sacred-flame, burning-hands, hold-person, revivify,
  lesser-restoration\*, counterspell, mass-cure-wounds, healing-word — \* = entra como `utilidad`
  con un recorte numérico ya declarado, no vacío), y **7 se quedan en texto**: fire-bolt y
  scorching-ray (hueco B), sleep, spiritual-weapon, magic-weapon, conjure-animals y polymorph
  (`summon`/`transform`/`enchant`, decisión de autor ya tomada).
- **De las 8 aptitudes:** 5 ganan `ItemGrant` (rage, second-wind, channel-divinity-turn-undead, ki,
  action-surge) y 3 se quedan en texto (sneak-attack: hueco A; lay-on-hands: hueco C; wild-shape:
  hueco B-bis + ya es `transform`).
- **`emparejamientos.json`:** los 20 conjuros de esta tarea + los 36 que caen en los 17 grupos de
  choque genuino (huella compartida en las dos fuentes) + 8 aptitudes de clase — **sin choque sin
  resolver**, que es lo que E-3A1-1 exige. Los 22 conjuros «solo en Foundry» (sin huella hermana en
  el lado español) **no están en este fichero**: no son un choque —huella compartida entre
  candidatos—, son huella SIN pareja, y `produce-flame` (sección b) muestra que al menos parte de
  ellos son una discrepancia de datos entre Foundry y el SRD, no una ambigüedad de nombre; T1 debe
  revisarlos uno a uno, no forzarlos a esta tabla.
- **`casos-raros.json`:** 14 entradas (≥ 12 exigidas): las 8 aptitudes + fireball, cure-wounds,
  fire-bolt, revivify, scorching-ray, counterspell — los seis que Step 5 pedía por nombre.

---

## f) Vuelve al esquema

Tres huecos reales, verificados contra datos concretos, no supuestos. Ninguno se resolvió doblando
el modelo: los tres quedan aquí para que el orquestador decida en T1, y los ítems que los exponen
se importan como `texto` mientras tanto.

### Hueco A — `expresionDeDadosSchema.n` no puede depender de una tabla de escala

**Caso real:** Ataque Furtivo (`rogue/rogue-features/sneak-attack.yml`) declara
`damage.parts[0].custom.formula: '@scale.rogue.sneak-attack'` — la tabla completa
(`classes/rogue.yml`, `scale.sneak-attack`: 1d6 a nivel 1, 2d6 a nivel 3, 3d6 a nivel 5… 10d6 a
nivel 19) sustituye **a la vez** el número de dados y sigue usando el mismo tipo de dado (`d6`), no
solo un bonus que se suma. `expresionDeDadosSchema.n` es `z.number().int().min(1).max(100)`: un
literal fijo puesto por el catálogo, y `bonus` es el único campo de la expresión que acepta un
`Origen`. No hay forma de escribir «cuántos dados» como una tabla por nivel sin inventar un campo.

**No afecta solo a este caso**: cualquier aptitud cuyo daño escale por una tabla de dados enteros
(no por un bonus sumado) tropieza igual — Ataque Furtivo es el único de los 8 de esta tarea, pero
el censo de `@scale.*` de la sección (d.2) no permite descartar que haya más entre las 234
aptitudes sin revisar.

**Se queda en:** `casos-raros.json`, `rogue:sneak-attack`, como `texto`.

### Hueco B — Falta un `Origen` para el bono de ataque de conjuro (y B-bis: duración variable)

**Caso real, el de mayor impacto:** cualquier conjuro con tirada de ataque (`type: attack`, 17 de
los 319 del SRD, medido en la sección (e)) necesita `ataque.bono: Origen`. Un bono de ataque de
conjuro es **modificador de lanzamiento + bonificador por competencia** (Fire Bolt, Scorching Ray,
Eldritch Blast…) — dos números sumados, igual que la CD de conjuro (`spellSaveDc`) ya suma
`8 + competencia + modificador`. `origenSchema` tiene **`cdDeConjuro`** para la CD (ya derivada con
traza por el motor) pero **no tiene un equivalente para el bono de ataque**: ni `lanzamiento` (solo
el modificador, sin competencia) ni `cdDeConjuro` (es una CD, no un bono de ataque) sirven, y no hay
una forma compuesta como la de `objetivo.cantidad` (`{ origen, mas }`) para `ataque.bono`.

**Recomendación concreta para T1**: añadir una octava variante de `Origen`,
`{ tipo: "bonoDeAtaqueDeConjuro" }`, hermana de `cdDeConjuro` — el motor ya calcula ese número para
resolver si un ataque de conjuro impacta; falta exponerlo como origen de un campo de actividad,
igual que ya expone la CD.

**Sin esta variante, se pierden 17 conjuros de ataque completos** (Fire Bolt y Scorching Ray, de
los 20 de esta tarea, entre ellos) — es, con diferencia, el hueco de mayor alcance de los tres.

**B-bis, el mismo tipo de hueco en otro campo:** Forma Salvaje (`druid/druid-features/wild-shape.yml`)
declara `duration.value: 'floor(@classes.druid.levels / 2)'` horas — la duración depende del nivel
de druida. `duracionSchema.valor` es `z.number().int().positive()`, un literal fijo, sin variante
`Origen`. (Forma Salvaje ya está fuera de A por ser `type: transform`, así que este hueco no le
cambia el resultado hoy, pero es la misma clase de limitación que el hueco A y B: un campo numérico
de la actividad que solo acepta un literal cuando el SRD lo declara dependiente del nivel.)

**Se queda en:** `casos-raros.json`, `fire-bolt` y `scorching-ray`, como `texto`.

### Hueco C — El consumo y el efecto de una actividad pueden ser el MISMO número variable

**Caso real:** Imponer las Manos (`paladin/paladin-features/lay-on-hands.yml`) tiene dos
actividades. La primera cura una cantidad de puntos de golpe **elegida por el jugador**, hasta el
máximo que le quede en su reserva (`consumption.scaling: { allowed: true, max: '@item.uses.value' }`,
`healing.custom.formula: '1'` — un valor base de relleno, no el real). La segunda gasta múltiplos de
5 de esa misma reserva para curar enfermedades o neutralizar venenos
(`consumption.scaling.max: 'floor(@item.uses.value / 5)'`). En los dos casos, **lo que se consume Y
lo que se cura son la misma cifra**, decidida en la mesa dentro de un tope — no dos números
independientes. `consumoSchema.cantidad` es `z.number().int().positive()`: una cantidad fija puesta
por el catálogo, no «hasta N, a elección del jugador, y lo que cures es exactamente lo que gastes».

**Se queda en:** `casos-raros.json`, `paladin:lay-on-hands`, como `texto` (la aptitud sigue
existiendo como `ClassFeature` de solo nombre y nivel, igual que las ~230 restantes que no ganan
`grant` — no es una regresión, es el mismo alcance que ya declara el comentario de `ClassFeature`
en `types.ts`).

---

## Resumen para quien solo lea esto

- **Medición de huella:** 261/319 conjuros (82 %) casan solos; 58 van a mano en
  `emparejamientos.json`, junto con las 8 aptitudes (por tabla de clase, no por huella).
- **Cabeceras irregulares:** con la regla de corte correcta (tolerar `(ritual)`, `(truco)`,
  «Ilusionismo» y campos partidos en varias líneas) se llega a 319/319, no hace falta tratar ~25
  casos sueltos uno a uno.
- **Tres huecos reales del esquema** (dados por tabla de escala, bono de ataque de conjuro ausente,
  consumo-igual-a-efecto variable) quedan documentados en `casos-raros.json` y en la sección (f), sin
  tocar `activity.schema.ts` ni `origen.schema.ts` — decisión del orquestador, no de esta tarea.
- El hallazgo con más impacto es el hueco B: sin un `Origen` para el bono de ataque de conjuro, los
  17 conjuros de ataque del SRD (incluidos dos de los veinte de esta tarea) no pueden importarse
  como `ataque` y se quedan en texto.
