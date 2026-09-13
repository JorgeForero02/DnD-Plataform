# Historial archivado — el reconocimiento: dieciocho fichas que el código desmentía (2026-09-08)

**Movida entera** el 2026-09-13, en el mismo corte que sus dos hermanas de encuentros: el
fichero seguía por encima de 1000 y era la entrada completa más antigua. Su hito se queda en
`07-historial.md`.

---

## El reconocimiento: dieciocho fichas que el código desmentía (2026-09-08)

**Qué.** Se leyeron unas cincuenta y cinco fichas de [06-pendientes.md](../06-pendientes.md) contra
el árbol —las que llevaban dentro una cita, un símbolo o un barrido, porque esas se verifican o se
caen solas—. **Dieciocho eran falsas**, cuatro de ellas P1, y se archivaron enteras en
[`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./pendientes-cerrados-2026-09-08-reconocimiento.md)
con la medición de cada una. El resto de las tocadas se corrigió en sitio: **ocho citas de línea
desplazadas**, dos enunciados al revés (`J6` y `N4`), la lista de `viewerFor` que había crecido de
cinco servicios a trece, y varias mitades falsas retiradas de fichas que siguen abiertas por la
otra mitad. **Y el veredicto del DM de la mesa de agentes del 2026-09-02 se anotó en vez de
archivarse** —un veredicto fechado no se reescribe—: sus tres motivos para «el combate no aguanta
el sábado» son hoy dos cerrados y uno a medias, y **los tres identificadores que cita (`M13`, `M14`
y `J4`) no existen en el documento**, así que su «ya están fichadas arriba» llevaba tiempo sin
llevar a ninguna parte. **Y tres documentos de estado mentían por su cuenta**, corregidos también:
[01-arquitectura.md](../01-arquitectura.md) negaba la bandeja de avisos y remitía a una ficha que ya
no existía; [05-datos.md](../05-datos.md) decía —con un «esto sí es cierto hoy» delante— que no hay
`features/notifications` ni pantalla de estado del mundo, y las dos existen; y
[como-seguir.md](../como-seguir.md) enlazaba a un índice de superpowers que nunca se escribió. Sin
tocar código.

**Por qué.** `E2` —«los enlaces del mundo no se pueden recorrer»— era P1 y su propia tabla la
llamaba «el hallazgo más importante de la pasada»: llevaba cerrada, con página de detalle, enlaces
entrantes y todo. Una ficha falsa de prioridad alta es trabajo que se hace dos veces, o un arreglo
que deshace el que ya existe. **Y el patrón que las explica casi todas:** una ficha que describe
con precisión el arreglo que le falta **no se vuelve a leer el día que ese arreglo se entrega**.
`U8-glifos` pedía la prueba que hoy existe, `D9` la pantalla que hoy existe, `J9` el filtro que hoy
cita la ficha desde dentro del código.

**Lo que ningún control iba a cazar, y por qué.** `pnpm check:docs` comprueba que una cita
`fichero.ts:NN` no se pase del final del fichero. Las ocho desplazadas apuntaban **dentro**, a
código de otra cosa: bien formadas y falsas. Y `05-datos.md` llevaba tres días declarando `D2` y
`D9` cerradas **mientras `06-pendientes.md` las listaba abiertas** — una contradicción entre dos
documentos del mismo directorio que ningún barrido de rutas puede ver. Es la mitad semántica que
[04-convenciones.md](../04-convenciones.md) ya declara que solo caza una lectura deliberada.

**Y la pasada estuvo a punto de mentir dos veces**, las dos por creer un acierto de `grep` sin leer
qué lo rodea: se rebajó la lista de `viewerFor` a cuatro servicios con un barrido truncado por un
`head` cuando son trece, y se dio `N4` por cerrada al encontrar `ruleName` en el **aviso** de una
propuesta, que no es su **listado**. Las dos se deshicieron midiendo otra vez; queda escrito en la
ficha de los barridos que envejecen, porque el modo de fallo lo cometió quien venía a arreglarlo.

**Cómo revertirlo.** Solo documentación: `git revert` del commit devuelve las dieciocho fichas a
`06-pendientes.md`, restaura las correcciones en sitio y en los tres documentos de estado, y borra
los dos ficheros nuevos de `_archivo/` — el del reconocimiento y el de la bandeja de avisos, que
salió de `07` para hacer sitio a esta entrada.
