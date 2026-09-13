# Pendientes cerrados el 2026-09-13 — tanda «desbordes»

Movida entera desde `06-pendientes.md` al cerrar la tanda (rama `desbordes/antes-del-paso-3`). Ver
`07-historial.md`, «Desbordes».

## Desbordes: lo que se despliega no se ve entero (2026-09-13, reproducido en producción)

**Abierta, grave para el DM.** En producción (`6d2b2ca`), con la sesión del DM, hoja de un PNJ →
Ataques → «Atacar» con encuentro `ACTIVE`: el botón sabe que hay combate (`aria-expanded` → `true`) y
la lista de objetivos **existe** (`[aria-label^="Objetivo del ataque"]`, tres combatientes), pero el
panel (`TirarAtaqueBoton.tsx:286`, `absolute z-30`, 740 px) vive dentro del envoltorio de la tabla
(`AtaquesYLanzamiento.tsx:192`, `overflow-x-auto`, **68 px de alto de cliente**): el envoltorio hace
scroll interno (`scrollTop` 733) y por la casilla asoma solo «Tirar daño». El DM no puede elegir
objetivo y el ataque sale suelto, sin comparar con la CA. Mismo mecanismo en las casillas de la
cabecera (CA/INIC./VEL./PG/COMP.): la traza envuelve fuera del borde. `jsdom` no maqueta; 1 601
unitarias en verde no lo ven. **Servidor y lógica de combate funcionan.** Spec:
`superpowers/specs/2026-09-13-desbordes-design.md` (auditoría en navegador + un componente de panel
flotante en portal + una prueba Playwright genérica «nada se sale de su padre»; proceso: solo
pruebas gráficas y `verify`, enmienda a D-CF-65 pedida por el autor). Orden: tras reglas de la
mesa, antes de puerta de efectos.

