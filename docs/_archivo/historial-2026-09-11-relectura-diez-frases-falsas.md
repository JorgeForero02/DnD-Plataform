# Archivo — Relectura de 01–05 y 09 al cerrar la rama: diez frases falsas (2026-09-11)

Movida entera desde `docs/07-historial.md` el 2026-09-12, en la ronda de revisión de la Tarea 5
del pulido (`Campaign.boardRoomUrl`, IMPORTANT #1 y #2): el fichero quedaba en 1015 de 1000 y esta
era la entrada completa más antigua. Sin reescribir.

---

## Relectura de 01–05 y 09 al cerrar la rama: diez frases falsas (2026-09-11)

Auditoría de deriva contra el código tras fusionar `ficha/tanda-2-a-5`, por un agente de solo
lectura con la lista de lo que la rama tocó. Diez frases caducadas, ninguna sobre lo que la rama
cambió —todas anteriores—: Node ≥ 20 en 02; siete eventos y tres `@OnEvent` en 01 (son nueve y
cinco); la búsqueda por texto como hipótesis en 04 cuando ya vive en el servidor; `Session` «sin
tablas colgando» en 05 cuando arrastra `Encounter` desde 2.5.2; dos citas de línea podridas y
«diecisiete tablas» (dieciocho) en 05; los niveles de visibilidad como cadena de superconjuntos en
05 (el código dice que no lo son); y en 09, que una fecha no se puede quitar y que el agotamiento
no automatiza nada. Corregidas con la fecha. **Revertir:** no procede; son correcciones de hechos.
