# Plan 13 · Modificadores temporales con caducidad (M8)

**Objetivo en una frase:** que *«+2 a Fuerza durante una hora»* exista, caduque solo y **salga en la
traza**.

**Tamaño:** dos commits y una migración. **Toca `packages/shared`**: no en paralelo con 03, 05, 08
ni 09.

**Por qué importa más que su tamaño:** **lo pidieron los jugadores por su nombre** —*«subidas y
bajadas de atributos temporales»*— y **no está escrito en ningún plan**: ni en 2A, ni en 2C, ni en
2.5. Es un hueco de alcance, no una deuda de implementación. Confirmado el 2026-09-05: **cero
referencias** en el servidor.

---

## Lo que ya existe y hay que reutilizar, no reinventar

Este plan es barato **solo si se apoya en tres cosas que ya están**:

1. **El reloj de campaña en segundos** (2C.3). La caducidad se mide **ahí**, no en tiempo real de
   pared. *«Una hora»* son 3600 segundos del reloj de la partida.
2. **Las condiciones que caducan solas** (2C.4) y su decisión D-2C-2: **al vencer se MARCAN, no
   desaparecen** — *«el sistema la aplicará sola hasta que venza; al vencer se marcará, no
   desaparecerá»*. Un modificador temporal se comporta igual.
3. **La traza** (2A). Un `+2` que aparece en la Fuerza **sin decir de dónde sale** es exactamente lo
   que la traza existe para impedir.

## El modelo

```prisma
model TemporaryModifier {
  id             String   @id @default(cuid())
  characterId    String
  target         String   // qué toca: "str", "ac", "speed"…  vocabulario CERRADO
  amount         Int      // puede ser negativo: los jugadores pidieron subidas Y bajadas
  reason         String   // "Poción de fuerza de gigante" — se pinta en la traza
  expiresAtClock Int?     // segundos del reloj de campaña; null = hasta que alguien lo quite
  createdAt      DateTime @default(now())
}
```

**`target` es vocabulario cerrado, no texto libre.** Si es libre, llega a la pantalla sin traducir y
al motor sin significado. Empieza por lo que la hoja ya sabe derivar —las seis características, CA y
velocidad— y **no más**: un modificador a algo que la hoja no calcula es un número decorativo.

**`amount` admite negativo**, y esto es lo que pidieron: *«subidas y bajadas»*.

**`expiresAtClock` nulable**: hay efectos que duran «hasta que el DM lo diga».

## Dónde entra en el cálculo

**En la derivación de la hoja, como un paso más de la traza**, con `sourceType` propio y su `reason`
como etiqueta. Después de los bonos permanentes y **antes** de los topes, para que un `+2` no salte
un máximo.

**Y lo que NO debe hacer:** no toca la columna del personaje. **Un modificador temporal no muta la
Fuerza**, se suma al derivarla. Si mutara, al caducar habría que restar y cualquier fallo dejaría al
personaje cambiado para siempre.

## La caducidad

**Se resuelve al leer, igual que las condiciones**, no con un trabajo programado: cuando el reloj
pasa `expiresAtClock`, deja de sumar y **se marca como vencido**. Se sigue viendo en la hoja,
apagado, hasta que alguien lo quite — así el jugador ve **por qué** perdió el +2, que es la mitad del
valor.

**Y deja su suceso** cuando se concede y cuando vence, por la misma razón que `CONDITION_EXPIRED`:
sin el suceso, el número cambia y nadie sabe qué pasó.

## Pruebas

- Con el reloj antes del vencimiento, **la Fuerza derivada sube 2 y la traza lo dice con su motivo**.
- Con el reloj pasado, **no suma** y aparece **marcado**, no borrado.
- **Negativo resta**, y no baja de los mínimos que la hoja ya respeta.
- `expiresAtClock: null` **no vence nunca**.
- Un `target` fuera del vocabulario → **400**.
- Los dos sucesos aparecen en el registro, traducidos.

**Mutación (obligatoria):** haz que el modificador vencido siga sumando y comprueba que su prueba se
pone roja. Es el fallo que de verdad rompe una partida —una poción que dura para siempre— y el que
una prueba escrita a la ligera no cazaría.

## Guía de revisión

- [ ] **La columna del personaje no se toca.** El modificador se suma al derivar.
- [ ] `target` es vocabulario cerrado y **su forma legible se escribe una vez**.
- [ ] La caducidad usa el **reloj de campaña en segundos**, no `Date.now()`.
- [ ] Al vencer **se marca, no desaparece** (D-2C-2).
- [ ] Sale **en la traza**, con su motivo.
- [ ] Se aplica **antes de los topes**.
- [ ] Conceder y vencer dejan **suceso**.
- [ ] Quién puede conceder está comprobado en el servidor (DM, o el dueño si sale de un objeto suyo
      — **decídelo y escríbelo**).

## Trampas

- **El reloj de campaña puede ir hacia atrás** si el DM lo corrige. Un modificador vencido que
  «revive» al retroceder el reloj es raro pero coherente; **decide qué pasa y escríbelo**, no lo
  dejes al azar.
- **No lo montes sobre las condiciones.** Comparten la caducidad pero **una condición es una regla
  del SRD con nombre cerrado** y esto es un número arbitrario. Meterlos en la misma tabla ensucia el
  vocabulario cerrado que tanto ha costado.
- **El descanso largo no lo quita automáticamente**: en el SRD lo que se recupera son recursos, y
  estos efectos tienen su propia duración. No lo ates al descanso sin decidirlo.

## Commits

```
feat(api,shared): a character can carry a temporary modifier that expires on the campaign clock
feat(web): the sheet shows where a temporary bonus comes from, and when it ran out
```

## Definición de terminado

`pnpm verify` verde, la mutación probada, la traza mirada **en el navegador** con un modificador vivo
y otro vencido, y **M8 anotada como cerrada** — con la nota de que **venía de una petición de los
jugadores**, que es lo que la hizo subir de prioridad.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ⬜ sin empezar | — | — |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- _(nada todavía)_

**Lo siguiente exacto, si me quedo aquí:**

- _(nada todavía)_
