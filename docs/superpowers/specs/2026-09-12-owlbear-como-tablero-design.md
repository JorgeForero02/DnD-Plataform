# Owlbear Rodeo como tablero — nuestra mesa dentro de su sala

> Escrito el 2026-09-12 con el autor: *«mientras no haya tablero usaremos una plataforma externa; un
> solo enlace, se guarda y se carga para cada persona; barato y con visión clara. Usaremos
> Owlbear.»* Y su segunda pregunta, la que decide la forma: *«nuestra interfaz debe rodear lo de
> Owlbear, casi sobrescribir algunas cosas, ¿se puede?»* — **añadir sí, reemplazar no** (§3).
>
> **Es una prueba**: el autor la valida él con la sala real antes de que sea más que una tanda
> corta. Nada de esto es fase 3; es el puente barato a ella.

---

## 1 · Qué se pide, en una frase

Que la mesa de `dnd.supportive.pro` **viva dentro de la sala de Owlbear Rodeo** como extensión
oficial: un solo enlace (la sala), la extensión instalada una vez por el DM, y cada jugador que
entre vea el tablero de Owlbear con **nuestro panel** (hoja, hilo, dados, acciones) y **nuestras
entradas** en el menú de una ficha del mapa.

## 2 · Lo medido antes de escribir

| Hecho | Evidencia (2026-09-12) |
|---|---|
| Owlbear **no** se deja meter en un `iframe` ajeno | `curl -I https://www.owlbear.rodeo/` → `X-Frame-Options: SAMEORIGIN` y CSP `frame-src 'self'` (respuesta tras el reto de Cloudflare; es el patrón de una app con sesión). **Embeber Owlbear en nuestra mesa está descartado** |
| Owlbear **sí** embebe a otros: las extensiones son «un `iframe` dentro de la sala» con un `manifest.json` | [docs · Getting started](https://docs.owlbear.rodeo/extensions/getting-started/); *Sheet from Beyond* mete la hoja de D&D Beyond así |
| Nuestra web se puede enmarcar | `apps/web/nginx.conf` no manda `X-Frame-Options`; producción tampoco (`curl -I https://dnd.supportive.pro/`). La **API** sí manda `DENY` (`configure-app.ts:91`), pero la API se llama por `fetch`, no se enmarca: no estorba |
| Nuestra sesión sobrevive dentro del marco | el token vive en `localStorage` de **nuestro** origen (`auth/hooks.ts:8`); los navegadores particionan el almacenamiento por sitio de arriba, así que **dentro de Owlbear se inicia sesión una vez por navegador** y queda |
| Qué deja hacer la API de extensiones | `OBR.action` (botón en su barra que abre nuestro panel), `OBR.contextMenu` (entradas en el clic derecho de una ficha), `OBR.tool` (herramienta propia), `OBR.modal` / `OBR.popover` / `OBR.notification`, `OBR.scene.items` (leer y escribir fichas del mapa **con metadatos propios sincronizados a todos**), `OBR.player` / `OBR.party` (rol GM o jugador), `OBR.broadcast`, `OBR.theme` ([APIs](https://docs.owlbear.rodeo/extensions/apis/), [Items](https://docs.owlbear.rodeo/extensions/apis/scene/items/)) |
| Qué **no** deja | quitar o cambiar su interfaz nativa (chat, barra, hojas suyas). Se convive |

## 2 bis · Lo que se hizo la misma tarde: Owlbear **Legacy** autoalojado, y sí se enmarca

El autor quería su maqueta —el mapa **dentro** de nuestra mesa, en el hueco del registro, y el
registro plegado como un chat— y Owlbear 2.0 no lo permite. **Owlbear Rodeo 1.0 «Legacy»** está
liberado para uso privado no comercial ([repo](https://github.com/owlbear-rodeo/owlbear-rodeo-legacy),
[anuncio](https://blog.owlbear.rodeo/owlbear-rodeo-legacy-edition/)): mapas, fichas, niebla, medida,
dibujo y dados 3D; multijugador P2P por WebRTC; **sin cuentas ni API de extensiones**; los mapas
viven en el navegador de quien los sube (IndexedDB), no en el servidor.

- **Desplegado el 2026-09-12** en `vps1new`, Coolify, proyecto D&D, servicio `owlbear-legacy`
  (`aloj51hvldbfcmvbxfkumfpq`): `web` (build estático + nginx que reenvía `/socket.io/` e
  `/iceservers` al broker) y `broker` (Node, señalización). **`https://tablero.supportive.pro`**,
  TLS por Traefik, sin puertos publicados. Documentado en `vps1new:/root/docs/07-historial.md`.
- **Medido:** 200, WebSocket 200, `iceservers` con el STUN de Google, **sin `X-Frame-Options` ni
  CSP**, y **cargado dentro de un `iframe`** desde una página ajena con Chromium (7 controles
  vivos). El camino A del autor es viable.
- **Trampas para la mesa:** (1) Chrome particiona IndexedDB por sitio de arriba — los mapas subidos
  en `tablero.supportive.pro` a pelo **no son** los subidos dentro del marco en
  `dnd.supportive.pro`; se usa siempre desde el mismo sitio y se exporta la biblioteca de vez en
  cuando; (2) jugadores tras NAT estricto pueden necesitar un TURN (`backend/ice.json`), no
  configurado; (3) es software sin mantenimiento: si un día no arranca, se reconstruye la imagen
  o se pasa al camino C.

**Con esto hay dos caminos, no excluyentes:** **A · Legacy dentro de nuestra mesa** (la maqueta del
autor; una tarea del pulido: ajuste «Sala del tablero» con la URL, el centro de la mesa como
`iframe`, el registro como cajón plegable) y **C · nuestra mesa dentro de Owlbear 2.0** (§3, para
la integración con fichas del mapa). El autor prueba A primero.

## 3 · La forma: Owlbear pone el tablero, nosotros todo lo demás por encima

```
┌ Owlbear Rodeo (la sala) ────────────────────────────────────────────┐
│  mapa · fichas · niebla · medida · su chat (se ignora)               │
│                                                                      │
│  [barra de Owlbear]  … [⚔ Sala de Guerra] ← OBR.action               │
│                                   └─ nuestro panel (iframe /owlbear) │
│                                       hoja · hilo · dados · acciones │
│  clic derecho en una ficha → «Poner daño» «Condición» «Su hoja»      │
│                                ← OBR.contextMenu, nuestras           │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 · La extensión (`apps/web/public/owlbear/manifest.json` + ruta `/owlbear`)

- `manifest.json` con nombre, icono dibujado, `action` que abre `https://dnd.supportive.pro/owlbear`
  en un panel de **390 px** de ancho — la medida que ya tenemos (`mesa-en-estrecho`, la hoja en
  «mesa»). El DM lo instala una vez en su sala pegando la URL del manifest; **la sala lo guarda**.
- La ruta `/owlbear` de nuestra web es **la mesa compacta**: si no hay sesión, el login; si la hay,
  la lista de campañas y, dentro, la mesa en modo `"mesa"` (la `disposicion` que ya existe) sin el
  chrome grande. Detecta que corre dentro de Owlbear con el SDK (`OBR.isAvailable`) y **solo
  entonces** activa lo de §3.2 y §3.3.
- **Sin sesión de Owlbear que copiar**: el jugador entra a la sala como invitado (enlace) y en
  nuestro panel con su cuenta nuestra. Dos identidades, una pantalla. `OBR.player.getRole()` dice
  si es GM; **la autorización sigue siendo la nuestra** (DM/jugador de la campaña): el rol de Owlbear
  solo decide qué botones se pintan, nunca qué se puede hacer.

### 3.2 · Fichas del mapa ↔ personajes nuestros (`OBR.scene.items` + metadatos)

- Una ficha del mapa se **enlaza** a un `Character` desde nuestro panel: «Enlazar con… [selector
  de personajes de la campaña]». Se guarda como metadato del ítem con nuestra clave
  (`dnd.supportive.pro/character`: `{ campaignId, characterId }`), **en la escena de Owlbear** —
  sincronizado a todos por Owlbear, sin tocar nuestra base.
- Con el enlace hecho: el nombre y los PG actuales se pintan **en la ficha** (etiqueta de Owlbear
  bajo el token: «Klarg 11/18»), y se refrescan cuando nuestro hilo trae un `HP_CHANGED` (sondeo,
  como la bandeja de avisos; sin tiempo real).
- **Solo el DM enlaza y ve PG de monstruos**: el metadato se escribe por Owlbear, pero **lo que se
  pinta lo decide `canView`** — un jugador no recibe los PG de un `DM_ONLY`, así que no hay nada que
  pintar en su cliente. Regla de la casa: si no se debe saber, no se envía.

### 3.3 · Menú contextual de una ficha (`OBR.contextMenu`)

Solo en fichas enlazadas, y filtradas por rol:
- **«Su hoja»** → abre nuestro panel en la hoja de ese personaje.
- **«Poner daño»** / **«Curar»** / **«Condición»** (DM; el jugador sobre el suyo) → abren en nuestro
  panel el mismo `PonerDano` / `PonerCondicion` del elenco. Nada nuevo por debajo.
- **«Atacar a…»** (jugador, con su personaje activo) → el objetivo es la ficha pulsada: nuestra
  `resolveAttack` con `targetCharacterId`. Es el mismo flujo de la mesa, con el objetivo elegido en
  el mapa en vez de en una lista. **Cuando la bandeja de daño exista** (puerta de efectos §4 bis),
  el daño se propone sobre esa ficha.

### 3.4 · El enlace de la sala, guardado

Ajuste de campaña «Sala de Owlbear» (URL, solo DM). La mesa nuestra enseña un botón «Abrir la sala»
y el panel de Owlbear enseña, si la campaña tiene sala, «Esta es la sala». Es el «un solo enlace»
del autor: quien entre por Owlbear tiene todo dentro; quien entre por nosotros tiene el botón.

## 4 · Lo que NO entra

- Ningún cambio en la interfaz nativa de Owlbear: no se puede.
- Tiempo real entre el panel y el tablero más allá del sondeo que ya usamos.
- Niebla, luz, posiciones **en nuestro modelo**: siguen siendo fase 3; aquí las tiene Owlbear y
  no las leemos salvo el enlace ficha↔personaje.
- Cuentas unificadas o *single sign-on* con Owlbear: no existe en su API.

## 5 · La prueba del autor (antes de que sea tanda)

Un **spike de una tarde**, con salida = respuesta, no código que se conserve:
1. Un `manifest.json` de prueba apuntando a `https://dnd.supportive.pro/` tal cual (sin ruta nueva)
   e instalarlo en la sala real del autor.
2. Comprobar: el panel abre; se puede iniciar sesión dentro; la mesa a 390 px se usa; `OBR.player`
   devuelve el rol.
3. Si los cuatro pasan, la tanda de §6 se escribe. Si el `iframe` no carga (una cabecera que no
   vimos), se documenta la cabecera y se decide.

## 6 · Tamaño y cuándo

**Modular**: ruta nueva `/owlbear`, `manifest.json`, un módulo `owlbear/` en la web con el SDK
(`@owlbear-rodeo/sdk`, dependencia nueva y usada), el ajuste de campaña, y **cero cambios en el
motor**. Estimado: **4 tareas, una sesión** (ruta + manifest · enlace ficha↔personaje y etiqueta de
PG · menú contextual · ajuste y botón). Después del spike del autor; cabe **después del pulido** y
antes o después del paso 3, como él decida — no comparte ficheros con ninguna otra tanda.

## 7 · Decisiones

| Decisión | Elegido | Descartado |
|---|---|---|
| Dirección del embebido | **nosotros dentro de Owlbear** (extensión oficial) | Owlbear dentro de nuestra mesa (bloqueado por sus cabeceras) |
| Identidad | dos sesiones, la nuestra manda en autorización; el rol de Owlbear solo pinta | copiar la sesión de Owlbear (no existe API) |
| Enlace ficha↔personaje | metadato en la escena de Owlbear, sincronizado por ellos | tabla nuestra (una fuente más que puede discrepar) |
| Qué se pinta en el mapa | nombre y PG, solo lo que `canView` deja | todo el statblock |

Sources: [Getting started](https://docs.owlbear.rodeo/extensions/getting-started/) ·
[APIs](https://docs.owlbear.rodeo/extensions/apis/) ·
[Items](https://docs.owlbear.rodeo/extensions/apis/scene/items/) ·
[Sheet from Beyond](https://extensions.owlbear.rodeo/sheet-from-beyond)
