# Paso 3 · El catálogo — convertir, no transcribir

> Escrito el 2026-09-05. **Tercero de tres pasos**: (1) [las goteras](./2026-09-05-paso-1-goteras-design.md),
> (2) [la actividad](./2026-09-05-paso-2-actividad-design.md), (3) esto.
>
> **Depende del paso 2 y no se puede adelantar**: un catálogo se importa **hacia** un modelo, y el
> modelo es lo que decide el paso 2. Pero **el paso 2 debe diseñarse con este documento delante**,
> para que la conversión sea un mapeo y no un remodelado.
>
> **Todas las cifras se contaron en esta sesión.** Ancla: Foundry `20cea09`, nuestro `276d59c`.

---

## 1 · La trampa que casi nos come, y va primero

**El clon trae DOS ediciones y las carpetas se parecen.**

```
packs/_source/spells/     320 conjuros   source.rules: '2014'   ← SRD 5.1 · EL NUESTRO
packs/_source/spells24/   341 conjuros   source.rules: '2024'   ← edición de 2024
```

Lo mismo con `classes`/`classes24`, `monsters`/`actors24`, `tables`/`tables24`,
`monsterfeatures`/`monsterfeatures24`.

**Este proyecto es SRD 5.1.** Todo lo que se importe sale de las carpetas **sin sufijo**, y el
conversor debe **rechazar** cualquier fichero cuyo `system.source.rules` no sea `'2014'` en vez de
tragárselo.

> La primera versión de la spec del paso 2 contó los conjuros de `spells24` y hubo que recontarla
> entera. **Es un error de dos segundos y de consecuencias largas.**

---

## 2 · Lo que hay, contado

Carpetas **sin sufijo**, todas bajo `packs/_source/`, con `license: CC-BY-4.0` en cada fichero:

| Carpeta | Ficheros | ¿Lo tenemos? |
|---|---|---|
| `spells/` | **320** | **NO** — cero conjuros en todo el proyecto |
| `classfeatures/` | **235** | **NO** — las nuestras son solo un nombre |
| `monsterfeatures/` | **252** | **NO** — las acciones de statblock son prosa |
| `subclasses/` | **12** | **NO** — y por eso la subclase se concede sola |
| `classes/` | 12 | parcialmente: tenemos las doce sin sus mejoras |
| `races/` | 35 | parcialmente |
| `items/` | 872 | **sí**, armas y armaduras transcritas |
| `monsters/` | 337 | **sí**, quince transcritos |
| `backgrounds/` | 3 | no, y no hace falta |

**El orden de valor es evidente:** los cuatro primeros son ganancia pura; los dos siguientes,
completar; los dos últimos, **reemplazar o dejar**, y eso se decide con el conversor escrito, no
antes.

---

## 3 · El nudo de verdad: sus datos están en inglés

**Y este proyecto tiene una regla que lo complica**, escrita en la cabecera de
`apps/api/src/rules/catalog/monsters-srd.ts`:

> *«Los nombres y la prosa son los de la traducción oficial al español publicada por Wizards
> («Documento de referencia del sistema 5.1»), igual que hicieron `weapons.ts` y `armor.ts`.»*

Y ese mismo fichero documenta **por qué no vale traducir por criterio**:

> *«Dos habrían salido mal por criterio: *goblin* es **«Goblin»** y no «trasgo» —«trasgos» es el
> colectivo de los goblinoides— y *wight* es **«Tumulario»**, no «Espectro», que es el *specter*.»*

**Dos de quince.** A esa tasa, 320 conjuros darían unos cuarenta nombres mal.

### La partición que resuelve esto

**No es una decisión de todo o nada: cada dato tiene su fuente correcta.**

| Qué | De dónde | Por qué |
|---|---|---|
| **Estructura y números** — nivel, escuela, alcance, duración, activación, componentes, actividades, dados, CD | **el YAML de Foundry** | Legible a máquina, ya validado por diez años de mesas. Transcribir números a mano es donde se cuela la errata |
| **Nombre y prosa en español** | **el SRD 5.1 oficial en español** | Es la regla del proyecto, y ya se demostró que el criterio propio falla |
| **Texto en inglés** | el YAML, **conservado** | Es la fuente de verdad para resolver una duda de reglas, y este proyecto ya tiene escrito que **manda el inglés** |

**Guardar los dos textos no es duplicar**: es exactamente lo que la regla
*«la cita se verifica en las dos ediciones»* pide. La pantalla enseña el español; una duda de reglas
se resuelve contra el inglés.

### Y si no hay traducción oficial de algo

**Se deja el nombre en inglés y se marca**, con su ficha en `docs/06-pendientes.md`. **No se
inventa.** Un nombre traducido a ojo es peor que uno sin traducir: el segundo se ve, el primero se
cree.

---

## 4 · Cómo es un fichero suyo, y qué se tira

`packs/_source/spells/magic-missile.yml`, campos de primer nivel:

```
_id · name · type · img · folder · sort · flags · ownership · effects · _stats · _key   ← se tira
system:                                                                                 ← se usa
```

Y dentro de `system`, para un conjuro:

```
description.value      texto en inglés, con HTML
source                 license, rules, book, page   ← se USA: valida la edición
activation             type, value, condition
duration               value, units
target                 affects{type,count,choice}, template{type,units}
range                  value, units, special
uses                   max, recovery[], spent
level · school
materials              value, consumed, cost, supply
preparation            mode, prepared
properties             concentración, ritual, verbal, somático, material
activities             ← lo importante
```

**Se tira más de la mitad de cada fichero.** No es difícil: es tedioso, y por eso lo hace un
conversor y no una persona.

**El `description.value` viene con HTML** —`<p>`, `<strong>`— y hay que decidir si se conserva, se
limpia o se convierte. **Conservarlo tal cual es lo más barato y lo peor**: mete etiquetas ajenas en
nuestro modelo. Recomendación: **texto plano con saltos**, y la parte de «A niveles superiores» como
campo aparte, porque es una regla y no prosa.

---

## 5 · Cómo se hace, en cuatro pasos que no se saltan

### 5.1 · El conversor es un script, no una migración

Lee YAML, escribe **nuestro formato de catálogo** —ficheros de TypeScript con los datos dentro, como
`monsters-srd.ts` y `weapons.ts`—, y **se puede volver a ejecutar**. No toca la base de datos: el
catálogo del SRD es de solo lectura y vive en el código, que es como ya está decidido.

**Vive en `scripts/`**, fuera del servidor, y **no se ejecuta en producción ni en el arranque.**

### 5.2 · Rechazar en voz alta, nunca adivinar

El conversor **para y lo dice** cuando:

- `system.source.rules` no es `'2014'`;
- una actividad usa un tipo que no está entre las cinco **y el conjuro no tiene texto** —sin
  mecánica y sin prosa no queda nada que importar—;
- falta un campo obligatorio del modelo;
- un nombre no tiene traducción oficial conocida.

**Un catálogo que se importa a medias en silencio es peor que no importarlo.** Al terminar debe
imprimir cuántos entraron, cuántos se rechazaron y **por qué**, uno a uno.

### 5.3 · Verificación por invariantes, porque nadie va a mirar 320 conjuros

**Es donde no hay que ahorrar**, y este proyecto ya tiene el molde: `monsters-srd.spec.ts` comprueba
tres invariantes sobre sus quince statblocks.

Para los conjuros, al menos:

- Todo conjuro tiene **nivel de 0 a 9** y una de las **ocho escuelas**.
- Todo conjuro tiene **actividad o texto**. Ninguno vacío.
- Un conjuro con **concentración** lo dice en `properties`, y su duración no es instantánea.
- Un conjuro de **nivel 0** no gasta espacio.
- Los **conteos cuadran**: si entran 299 con actividad y 21 sin ella, la suma es 320.
- **Y un puñado contrastado a mano contra el SRD**: *Proyectil mágico*, *Bola de fuego*, *Curar
  heridas*, *Escudo*. Cuatro bien mirados valen más que 320 revisados por encima.

### 5.4 · Un commit por catálogo, y con su atribución

`NOTICE.md` de la raíz ya lleva la atribución del SRD 5.1. **Se amplía diciendo qué se importó y de
dónde**, incluida la mención de que la estructura viene del sistema `dnd5e` de Foundry (MIT) y el
contenido del SRD 5.1 (CC-BY 4.0). **Son dos licencias distintas sobre el mismo fichero** y las dos
se nombran.

---

## 6 · El orden, y por qué

**1 · `classfeatures` (235) y `subclasses` (12).** Van primero aunque los conjuros suenen más
llamativos, por dos motivos: **arreglan un fallo real** —hoy `rules/catalog/resolve.ts:339` aplica
los rasgos de **todas** las subclases a la vez, porque no existe `subclassKey`— y son **el material
de las once aptitudes** que un guerrero, un bárbaro y un mago de nivel 3 necesitan.

**2 · `spells` (320).** El bloque grande, y el que hace que un mago exista.

**3 · `monsterfeatures` (252).** Convierte en estructura lo que hoy es `actions[].desc`, o sea prosa.

**4 · `items` y `monsters`.** **Solo si el conversor demuestra que su forma es mejor que la nuestra.**
Los tenemos transcritos a mano, en español oficial, con invariantes probadas. **Reemplazar algo que
funciona por algo equivalente es riesgo sin ganancia**, y esa decisión se toma con el conversor
escrito y las dos formas delante — no ahora.

---

## 7 · Lo que puede salir mal, y cómo se ve venir

| Riesgo | Señal | Qué hacer |
|---|---|---|
| **Importar la edición de 2024** | `source.rules: '2024'` | El conversor lo rechaza. Es la primera comprobación |
| **Nombres traducidos a ojo** | dos de quince monstruos salieron mal | Traducción oficial, o inglés marcado. **Nunca criterio propio** |
| **Un modelo que no encaja** | el mapeo pide inventar campos | **Para y vuelve al paso 2.** Torcer el conversor para que quepa es cómo se corrompe un modelo |
| **HTML colado en el modelo** | `<p>` en la base | Limpiar en el conversor, no en la pantalla |
| **Importación silenciosa a medias** | conteos que no cuadran | Los invariantes y el informe de rechazos |
| **Que nadie mire los datos** | todo verde y un conjuro absurdo | Los cuatro contrastados a mano |

---

## 8 · Lo que este paso NO hace

- **No ejecuta ni una línea del código de Foundry.** Su sistema son 100.456 líneas atadas a un
  runtime que no tenemos; **sus datos son otra cosa**. La distinción está en la sección 6bis del
  paso 2.
- **No importa las carpetas con sufijo `24`.**
- **No toca la fase 3 del tablero**: `summon`, `teleport` y `transform` se importan como texto.
- **No reemplaza armas, armaduras ni monstruos** salvo que se demuestre que conviene.

## 9 · Qué decide el autor

1. **¿Se conserva el texto en inglés junto al español?** Recomendado **sí**: es la fuente para
   resolver dudas de reglas, y la regla del proyecto ya dice que manda el inglés.
2. **¿Qué se hace con lo que no tiene traducción oficial?** Recomendado: **inglés, marcado, con
   ficha**. Nunca inventado.
3. **¿Se reemplazan `items` y `monsters`?** Recomendado: **decidirlo después**, con el conversor
   escrito.

## Definición de terminado del diseño

Este documento **no es un plan**. Está terminado cuando el autor apruebe la partición de fuentes
—estructura de Foundry, nombres del SRD español, inglés conservado—, el orden de los cuatro
catálogos, y la regla de rechazar en voz alta. Su plan por tareas se escribe **después del paso 2**,
porque el destino del mapeo no existe todavía.
