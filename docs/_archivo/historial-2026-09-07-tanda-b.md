# Archivo — Tanda B, tres arreglos de API (2026-09-07)

Movida entera desde `docs/07-historial.md` el 2026-09-12, al escribir la línea de la Tarea 3 del
pulido: el fichero quedaba en 1009 de 1000 y esta era la entrada completa más antigua. Sin
reescribir.

---

## Tanda B — tres arreglos de API, y una ficha que se equivocaba de tamaño (2026-09-07)

**Qué.** Las tres fichas que la tanda corta dejó abiertas, en tres commits, cada una con su
mutación pieza a pieza:

- **P2-8** — `buildResponse` cierra el camino feliz de `changeHp` y hablaba con `this.prisma`
  aunque `equipoEquipado` y `viewerFor` ya sabían aceptar un cliente. Acepta el `tx?` y se lo
  reenvía; se lo pasan los **cuatro** llamadores que corren dentro de una transacción —uno más de
  los tres contados, y el que faltaba era el de `changeHpEnTransaccion`, que es el que la ficha
  nombra—. Su prueba se mide sobre un `changeHp` que **termina**: la de P2-0b no podía.
- **P2-1** — la red que exige que toda clave de condición que el motor lee esté en
  `esClaveReservada`, con la opción (c) de la ficha. Mira **las tres formas** —comparación
  literal, pertenencia a un conjunto y consulta a la base—, y cazarla solo por literales habría
  perdido los siete `Set` y con ellos la única lectura de `helped`.
- **P2-10** — la ficha se quedaba corta **en el tamaño**, y es la razón de escribir esta entrada
  aparte. Decía «dos pruebas lentas»; medido, son **veintitrés suites y 204 pruebas**, casi todas
  cayendo en el `beforeAll` que monta la aplicación y registra cuentas con `argon2`. **Arreglar
  las dos que nombraba habría dejado veintiuna suites igual de frágiles y la ficha tachada.** Se
  mide antes de arreglar, aunque la ficha diga que ya midió.

**Cómo se verificó.** `pnpm verify` en verde en cada commit. P2-10 no lleva paso 1 —no hay
comportamiento incorrecto que ver fallar— y se demuestra al revés: la misma contención que dejó 23
suites rojas las deja **todas verdes** después, sin bajar el paralelismo ni abaratar `argon2`, que
es una defensa. P2-1 se cazó por mutación cinco veces, incluida la más importante: la propia red
estrechada contra sí misma.

**Cómo revertir.** Los tres commits son independientes. Revertir el de P2-1 solo quita una red;
revertir el de P2-10 devuelve la fragilidad de diagnóstico, no un defecto de producto.
