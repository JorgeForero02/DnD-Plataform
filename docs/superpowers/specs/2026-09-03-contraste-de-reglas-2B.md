# Contraste de las reglas de 2B con la fuente (2026-09-03)

> **Por qué existe este documento.** Las decisiones de mecánica de 2B se tomaron **interpretando**
> el SRD, no comprobándolo, y el autor lo señaló: *«reglas de juego que interpretaste debiste
> buscar en internet; lo mismo para lo de visibilidad»*. Esto es esa comprobación, hecha después,
> con la fuente delante y la fecha puesta.
>
> **Resultado: ninguna de las reglas implementadas resultó equivocada.** Lo que sí salió fueron
> **tres cosas que no sabíamos**, y una de ellas era un defecto vivo en pantalla.

## Lo comprobado, una por una

| Regla implementada | Qué dice la fuente | Veredicto |
|---|---|---|
| **La armadura pesada no suma la Destreza, ni siquiera negativa** | *«Heavy armor doesn't let you add your Dexterity modifier… but it also doesn't penalize you if your Dexterity modifier is negative»*. Jeremy Crawford, el diseñador jefe, lo zanja: la Destreza es **irrelevante** para la CA con armadura pesada | ✅ Coincide |
| **En armadura media, una Destreza negativa sí resta** | *«add your Dexterity modifier, to a maximum of +2»* — el tope es un máximo, no un suelo; el modificador negativo baja la CA sin límite | ✅ Coincide |
| **Versátil solo a dos manos con la otra mano libre** | Se puede llevar escudo **si el arma se empuña a una mano**; no se puede empuñar a dos manos y llevar escudo a la vez | ✅ Coincide |
| **El ataque de la otra mano: no se cambia el número, se avisa** | *«You don't add your ability modifier to the damage of the bonus attack, **unless that modifier is negative**»*, y el **estilo de combate** «Combate con dos armas» levanta la restricción | ✅ Coincide — y **corrige el comentario del código**, que decía «salvo dote». La dote del SRD (Dual Wielder) da +1 a la CA y permite armas no ligeras; no toca el modificador |
| **El enano: cuatro armas y sin penalización de velocidad** | *«Dwarven Combat Training: proficiency with the battleaxe, handaxe, light hammer, and warhammer»* y *«Your speed is not reduced by wearing heavy armor»* | ✅ Coincide, arma por arma |
| **Tope de tres sintonizaciones** | *«You can be attuned to at most three items at a time»* | ✅ Coincide |
| **Requisito de Fuerza: −10 pies** | *«If armor shows Str 13 or Str 15 …, the armor reduces the wearer's speed by 10 feet unless the wearer has a Strength score equal to or higher»* | ✅ Coincide |
| **`LOADING`: un disparo por acción** (hoy solo texto, ficha M2B-13) | *«You can fire only one piece of ammunition … when you use an action, bonus action, or reaction to fire it, regardless of the number of attacks you can normally make»* | ✅ El texto es correcto; sigue sin automatizarse, y ahora con la cita |
| **Munición: paquetes, pesos y precios** | Flechas (20) 1 po y 1 libra · Virotes (20) 1 po y 1½ · Balas de honda (20) 4 pc y 1½ · Agujas de cerbatana (50) 1 po y 1 libra | ✅ Las cuatro filas sembradas cuadran al gramo y al cobre |
| **Arma mágica: `+X` al ataque y al daño** | *«Weapon, +1: you have a bonus to attack and damage rolls made with this magic weapon»* | ✅ Coincide con los dos efectos nuevos |

## Lo que salió del contraste, y no sabíamos

### 1 · Un defecto vivo: dos avisos salían «Sin traducir» en pantalla

Los dos avisos que añadió la auditoría de mecánica —`versatile_needs_both_hands` y
`two_weapon_offhand_damage`— **no tenían frase en español**, así que la hoja imprimía
literalmente «Sin traducir: versatile_needs_both_hands». Estaban bien calculados en el servidor
y mal contados en la pantalla, que es la peor mitad.

Arreglado con el texto ya contrastado (incluida la excepción del modificador negativo y el estilo
de combate), y **con la red que faltaba**: una prueba que recorre los diez códigos que la API
puede emitir y exige que ninguno caiga en «Sin traducir». Comprobada por mutación.

### 2 · Los objetos mágicos **genéricos sí están en el SRD 5.1**

`NOTICE.md` dice que «los objetos mágicos llamativos no están en el SRD», y es cierto — pero la
cabecera del catálogo dice «**ningún** objeto mágico», y eso es más de lo que la licencia exige:
**Arma +1/+2/+3, Armadura +1 y Escudo +1 sí están en el SRD 5.1**, bajo la misma CC BY que el
resto. Se pueden sembrar. No se hizo esta noche porque la forma acababa de abrirse y sembrar
contenido es una decisión de producto, no un arreglo: ficha **M2B-14**.

### 3 · «Lo tengo pero no sé qué hace» es **práctica estándar**, no exótico

La decisión D-2B-8 lo dejó fuera argumentando, entre otras cosas, que la visibilidad por campo
«no la hace el modelo en ningún sitio». El contraste dice que la industria sí la hace, y de una
forma concreta: **una bandera `identified` por objeto**. El sistema dnd5e de Foundry la trae de
serie —el DM ve todo, el jugador ve una versión ofuscada— y hay módulos dedicados (Forien's
Unidentified Items) que además dejan al DM «espiar» el objeto original e identificarlo con un
botón. En Roll20 y D&D Beyond no existe y la gente lo suple con documentos aparte, que es
exactamente el trabajo manual que esta herramienta quiere quitar.

**Lo importante: media solución ya está construida.** La redacción que añadió la revisión de 2B
—se tacha el nombre, se conserva el número— es justo el mecanismo de presentación que usa
Foundry. Lo que falta es el interruptor del DM y un nombre alternativo («una espada de aspecto
extraño»). Ficha **M2B-15**, y con esto **el motivo de D-2B-8 queda revisado**: no es que nadie
lo haga, es que nos faltaba la mitad barata.

## Lo que este contraste **no** cubre

- Las decisiones de **forma de los datos** (onzas, cobres, tres sitios, cinco monedas) no son
  reglas del juego: no hay fuente que consultar, son nuestras y siguen sujetas al criterio del
  autor.
- Los **nombres en español** (ficha I1) siguen sin contrastar: hacen falta las tablas de la
  traducción oficial de Wizards, que no están en las fuentes abiertas que se consultaron.

## Fuentes

- [SRD 5.1 (PDF oficial, Wizards)](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf)
- [SRD 5.1 — Armadura (5thsrd.org)](https://5thsrd.org/adventuring/equipment/armor/) y
  [Armas](https://5thsrd.org/adventuring/equipment/weapons/)
- [Jeremy Crawford sobre la Destreza y la armadura pesada](https://x.com/JeremyECrawford/status/927996456262426630)
- [Armadura y Destreza negativa (EN World)](https://www.enworld.org/threads/ac-and-negative-dex-modifier.358495/)
- [Armas versátiles y escudo (Arcane Eye)](https://arcaneeye.com/mechanic-overview/versatile-weapons-5e/)
- [Combate con dos armas (Roll for Two)](https://www.rollfortwo.com/articles/two-weapon-fighting-5e/)
- [Rasgos del enano (SRD, D&D Wiki)](https://www.dandwiki.com/wiki/5e_SRD:Dwarf)
- [Equipo de aventura y munición (5esrd)](https://www.5esrd.com/equipment/adventuring-gear/)
- [Arma +1/+2/+3 (5thsrd)](https://5thsrd.org/gamemaster_rules/magic_items/weapon_1_2_or_3/)
- [Objetos no identificados en Foundry VTT (módulo de Forien)](https://github.com/Forien/foundryvtt-forien-unidentified-items)
- [Ofuscar la ficha de un objeto no identificado en el sistema dnd5e (Tidy5e)](https://github.com/kgar/foundry-vtt-tidy-5e-sheets/issues/355)
