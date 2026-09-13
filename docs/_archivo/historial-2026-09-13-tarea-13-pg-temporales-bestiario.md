# Historial archivado — Tarea 13 del pulido: PG temporales del bestiario, y su ronda de arreglo (2026-09-13, anexo #20)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda). Su resumen se queda en `07-historial.md`.

---

## Tarea 13 del pulido: PG temporales del bestiario — la pregunta solo tras pulsar (2026-09-13, anexo #20)

Qué — en `DarTemporales.tsx`, `hayConflicto = actuales > 0 && nuevos > 0` se evaluaba con
`cuantos` ya en su valor por defecto ("5"), así que en cuanto un PNJ tenía algún PG temporal el
`alertdialog` estaba **siempre** puesto y el botón «Dárselos» desaparecía — parecía que la
pantalla no hacía nada. Y «Dejar los N que tenía» mandaba `tempHpEleccion: "mayor"`, que el
servidor resuelve con `Math.max`: si los nuevos eran más que los que tenía, «dejar los que tenía»
cambiaba igualmente el PG temporal. Ahora `preguntando` es estado explícito que solo se pone a
`true` al pulsar «Dárselos» con temporales previos; «Quedarse con los N nuevos» manda
`tempHpEleccion: "los-nuevos"`; y «Dejar los N que tenía» **no manda ninguna petición** — solo
cierra la pregunta. `hayConflicto` se quita.

Por qué — SRD 5.1, *Temporary Hit Points*: *"you decide whether to keep the ones you have or to
gain the new ones"*. Conservar es no cambiar nada; mandar `"mayor"` (que el servidor traduce a
`Math.max`) era la elección equivocada cuando los nuevos eran mayores que los que ya tenía el PNJ.

Evidencia — unitarias nuevas en `DarTemporales.test.tsx`: con temporales previos el `alertdialog`
no está hasta pulsar «Dárselos»; «Dejar los que tenía» no llama a `fijar.mutate` y cierra la
pregunta; «Quedarse con los nuevos» manda `tempHpEleccion: "los-nuevos"` y cierra al resolver.
e2e nuevo en `bestiario.spec.ts` (no corrido en esta sesión, a cargo del orquestador). Mutación:
hacer que «Dejar los que tenía» llame a `mandar("mayor")` hace fallar la unitaria «no manda nada»
(restaurado con `cp`).

**Revertir:** en `DarTemporales.tsx`, devolver `hayConflicto` y pintar el `alertdialog` con esa
condición en vez de `preguntando`; hacer que «Dejar los que tenía» llame a `mandar("mayor")`;
quitar las unitarias y el e2e nuevos.


---

## Ronda de arreglo de la tarea 13: la aserción de «no manda nada» esperaba en el momento equivocado, y «Quedarse con los nuevos» gana el candado de «Dárselos» (2026-09-13)

Qué — revisión de ronda 1 (`cdf8d00..df15c30`) encontró que `expect(fijar).not.toHaveBeenCalled()`
en «Dejar los que tenía no manda nada» corría **justo tras el `fireEvent.click`**, de forma
síncrona: TanStack Query espera a que `onMutate` resuelva antes de invocar `mutationFn`, así que
la aserción pasaba **aunque `mandar()` estuviera siendo llamada** — un mutante que hace
`mandar("mayor")` y luego `setPreguntando(false)` sobrevivía sin que ninguna prueba lo notara. El
espía de `setHp` tampoco tenía `mockResolvedValue`, lo que agravaba la carrera. Arreglo: el espía
gana `mockResolvedValue(hoja(8))`, y la aserción se mueve DESPUÉS de un `waitFor` que observa el
`alertdialog` cerrado, más un `await new Promise(r => setTimeout(r, 0))` de margen para cualquier
microtask de React Query pendiente. Repetida la mutación del `cp` (`mandar("mayor")` +
`setPreguntando(false)`) contra el arreglo: **esta vez la aserción cae** (`setHp` llamada 1 vez,
con `tempHpEleccion: "mayor"`), confirmando que ahora sí la cazaba.

Hallazgo menor de la misma revisión: «Quedarse con los N nuevos» no llevaba el candado numérico
que sí tiene «Dárselos» (`!Number.isFinite(nuevos) || nuevos <= 0`), así que vaciar el campo o
ponerlo en 0 mientras la pregunta estaba abierta permitía mandar `tempHp: 0` o `NaN` — ninguno de
los dos montones que el SRD pide elegir. Mismo candado añadido a ese botón, con su `title`;
unitaria nueva: con el campo en «0», el botón queda `aria-disabled` y el clic no llama a `setHp`.

Por qué — revisión de ronda 1 sobre las tareas 12–14 del pulido; hallazgo «Important» (aserción
que no prueba lo que dice) y un menor barato de corregir en el mismo fichero.

Evidencia — `DarTemporales.test.tsx`: 5/5 en verde (era 4/4; +1 del candado nuevo). Mutación
repetida con el `cp` de la tarea 13 (`mandar("mayor")` en «Dejar los que tenía»): la unitaria
arreglada cae, confirmando que la aserción ahora sí depende de la llamada real. `pnpm verify` en
verde (168 ficheros, 1558 pruebas). Sin Playwright — el orquestador vuelve a correr
`bestiario.spec.ts`.

**Revertir:** en `DarTemporales.test.tsx`, quitar el `mockResolvedValue` del espía de `setHp` en
esa prueba y devolver la aserción a justo después del `fireEvent.click`; quitar la unitaria del
candado nuevo. En `DarTemporales.tsx`, quitar `disabled`/`title` del botón «Quedarse con los N
nuevos».

