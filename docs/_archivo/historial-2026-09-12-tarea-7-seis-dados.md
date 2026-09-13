# Archivo — Tarea 7 del pulido: seis dados dibujados y el barrido de iconos (2026-09-12)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al insertar las entradas de las tareas
12–14 del pulido (el fichero quedó en 1038 de 1000 tras el primer archivado del mismo corte). Era
la entrada completa más antigua.

---

## Tarea 7 del pulido: seis dados dibujados y el barrido de iconos (2026-09-12, C3 #12 y #22)

Qué — `ui/Iconos.tsx` gana `IconoDado({ caras })` —seis siluetas, «un dado, una forma»
(D-CF-62): tetraedro, cubo, octaedro, trapezoedro (compartido por d10 y d100), dodecaedro,
icosaedro— e `IconoMenu` (los tres puntos de una fila, para la Tarea 8). `features/rolls/
DadoDibujado.tsx` deja de dibujar su propio icosaedro y pasa a delegar en `IconoDado caras={20}`;
**su `data-icono` cambia de `"dado"` a `"d20"`**, y las dos aserciones que lo buscaban
(`ResultadoDeTirada.test.tsx`, `e2e/tirada.spec.ts`) se actualizaron con ese motivo. Los atajos de
`PanelDeDados.tsx` y `features/rolls/panel/PanelDeDadosDeLaMesa.tsx` pintan `IconoDado caras={caras}` —antes
siempre dibujaban el icosaedro aunque el atajo fuera «d4»—.

Y el barrido nuevo, `ui/__tests__/botones-con-icono.test.tsx`: todo `<Button>` primario de página
cuyo texto **contiene** «Crear», «Escribir», «Nueva», «Nuevo» o «Añadir» (el regex es
`\b(...)\b` sin anclar al principio, así que un botón cuyo texto lleve la palabra en medio
también cuenta) lleva un icono dibujado dentro, y ningún botón empieza por un «+» de fuente —eso
sí está anclado, y correctamente. El primer barrido encontró **15 culpables**
(`features/world-state/PanelDeEstadoDelMundo.tsx`, `features/rules/PanelDeReglas.tsx`,
`features/links/LinksPanel.tsx`, `features/dm-tables/PanelDeTablas.tsx` «Crear tabla»,
`features/character-sheet/RecursosYDescansos.tsx` «Crear»,
`features/campaigns/CreateCampaignModal.tsx`, `features/campaigns/Cronicas.tsx`,
`features/campaign-items/CampaignItemsCatalogPage.tsx` «+ Crear objeto»,
`features/campaign-items/EffectsEditor.tsx` «Añadir»,
`features/bestiario/PanelDeBestiario.tsx` «Escribir una criatura», dos botones de
`pages/CampaignDetailPage.tsx` («Nueva sesión», «Nuevo personaje»), `pages/DesignTokensPage.tsx`,
`pages/EntityDetailPage.tsx` «Escribir» y `pages/RegisterPage.tsx` «Crear cuenta»): todos
llevan ahora `IconoMas`, salvo los dos de «escribir» (bestiario y `EntityDetailPage`), que llevan
`IconoPluma` — el mismo dibujo para el mismo concepto, sin inventar uno nuevo. «+ Crear objeto»
pasó a «Crear objeto» con `IconoMas` delante: el `+` era un glifo de fuente haciendo de icono, la
misma infracción que la regla de iconos ya prohibía para los sueltos.

Por qué — anexo #12 (C3): «un dado, una forma» estaba declarado en `04-convenciones.md` sin que
`IconoDado` existiera; anexo #22: «Escribir una criatura» iba sin icono y «+ Crear objeto» llevaba
un `+` de fuente, y ninguna prueba lo impedía porque `iconos-sin-duplicados.test.ts` sólo barre
ficheros de iconos, no botones.

Evidencia — unitarias: `Iconos.test.tsx` (el nuevo caso de `IconoDado`, siete dados, seis dibujos
distintos y el d100 igual al d10; el conteo de exports sube de 29 a 30 porque `IconoDado` queda
fuera del bucle genérico —exige `caras`— e `IconoMenu` entra en él) y
`botones-con-icono.test.tsx` (dos pruebas, ambas en verde tras arreglar los 15 culpables) — suite
completa: 160 ficheros, 1493 pruebas, verde. Mutación: `cp` de respaldo de `Iconos.tsx`, el trazo
del d8 sustituido por el del d6, la prueba «seis dibujos distintos» pasa a detectar solo 5;
restaurado con `cp`. `pnpm verify` en verde. Orquestador: `e2e/dados.spec.ts` y
`e2e/bestiario.spec.ts`.

**Revertir:** un commit. Quitar `IconoDado`/`IconoMenu` de `ui/Iconos.tsx`, devolver
`DadoDibujado.tsx` a su dibujo propio, los atajos a `<DadoDibujado />`, deshacer los 15 icono/
texto de botón y borrar `botones-con-icono.test.tsx`.
