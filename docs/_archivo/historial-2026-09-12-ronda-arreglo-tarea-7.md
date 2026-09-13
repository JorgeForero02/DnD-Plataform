# Archivo — Ronda de arreglo de la tarea 7 (2026-09-12)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al insertar las entradas de las tareas
12–14 del pulido (el fichero quedó en 1074 de 1000). Era la entrada completa más antigua.

---

## Ronda de arreglo de la tarea 7: un solo d20, la navegación entra en el barrido (2026-09-12)

Qué — la revisión (ronda 1) encontró que `IconoD20` (el de arriba, ya existente antes de la
Tarea 7) dibujaba **su propio** icosaedro con el mismo `data-icono="d20"` que `IconoDado
caras={20}`: dos siluetas para un dado, la misma infracción que «un dado, una forma» existe para
impedir. `IconoD20` pasa a delegar (`return <IconoDado caras={20} className={className} />`);
sus tres consumidores (`features/sessions/RailDePaneles.tsx`,
`features/sessions/hilo/TiradaIncrustada.tsx`, `features/sessions/taller/PrepararSesion.tsx`) no
cambian una línea. Ninguna prueba comprobaba el trazo
propio de `IconoD20` (grep confirmado: solo `data-icono="d20"`, que sigue igual), así que no hizo
falta actualizar ninguna aserción.

`docs/04-convenciones.md` afirmaba que la prueba también cubría «toda entrada de navegación», y
no era cierto: `botones-con-icono.test.tsx` solo miraba `<Button>`. Gana una tercera prueba que
barre las entradas de `CampaignDetailPage.tsx` — no son un array literal (`TABS.map` arma cada
`TabItem` en su propio `if`), así que la prueba extrae el cuerpo de la función contando llaves
(balanceo real, no regex) y comprueba, por cada `id: "…"`, que el tramo hasta el siguiente `id:`
lleva su `icon:`.

Pulido a los dados que la revisión pidió: el d4 dibujaba dos segmentos que **retrazaban su
propia base** (ya cerrada) en vez del tetraedro — ahora es el contorno más un rayo del centroide
a cada vértice. El d8 retrazaba dos aristas del contorno (vértice superior a los laterales) — ahora
es el contorno, el ecuador y el eje vertical, ninguna línea repite una arista. Y los tres
comentarios que citaban «un dado, una forma» como si viviera en `04-convenciones.md` pasan a citar
`docs/decisiones.md` D-CF-62 (con la regla de texto en 04, de la Tarea 0) — el docstring de
`IconoDado`/`IconoD20` en `Iconos.tsx` y los dos comentarios de atajo en `PanelDeDados.tsx` y
`PanelDeDadosDeLaMesa.tsx`.

Y de paso, la deuda de redacción de este mismo fichero: la frase de más arriba decía que el
barrido de botones actúa sobre texto que «empieza por» Crear/Escribir/Nueva/Nuevo/Añadir; el
regex real (`\b(...)\b`) no ancla al principio, así que la palabra puede ir en medio del texto —
la frase pasa a decir «contiene», y el comentario del propio `botones-con-icono.test.tsx` se
corrigió igual.

Por qué — revisión de ronda 1 sobre `ea28fff..c1677f3`, dos hallazgos «Important» (dos siluetas
para un dado; una frase de 04 sin prueba que la sostenga) y pulido acompañante.

Evidencia — `Iconos.test.tsx` y `botones-con-icono.test.tsx` (ahora tres pruebas) en verde;
`pnpm --filter @dnd/web test -- src/ui src/features/rolls src/features/sessions` y `pnpm verify`
en verde (detalle en el commit de esta ronda). Sin Playwright — el orquestador corre
`tirada`, `inventario`, `objeto-sin-identificar` y `nervio-en-vivo`.

**Revertir:** un commit. Devolver `IconoD20` a su dibujo propio, quitar la tercera prueba de
`botones-con-icono.test.tsx`, revertir los dos dados y las tres citas de D-CF-62.
