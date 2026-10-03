# Despliegue — la copia de esta base, sin comprobar (hasta el 2026-10-03)

**El párrafo «Lo primero, y no es una formalidad…» de `03-despliegue.md`, § *Copias de seguridad*,
movido entero el 2026-10-03.** Decía que no se había comprobado si el trabajo diario de las 04:00 del
servidor cubría esta base. El 2026-10-03 se midió que sí: `dnd-pg.sql.gz` aparece en las copias de los
días 1, 2 y 3 de octubre. No se reescribe. Los enlaces relativos y rutas que trae apuntaban desde `docs/`;
aquí no resuelven y se leen como texto.

---

**Lo primero, y no es una formalidad: la base de este proyecto vive DENTRO de una pila de
Compose, así que NO es un recurso de base de datos de Coolify y no aparece en su pantalla de
copias.** El servidor tiene su propio trabajo diario a las 04:00, con 7 días en local y 30 en
`gdrive:vps1new-backups`, y con restauración ya probada — **pero no se ha comprobado si ese
trabajo descubre contenedores de Postgres nuevos por sí solo o si lleva una lista escrita a
mano**. Es lo primero que hay que mirar tras el despliegue:

```bash
ssh vps1new "cat /root/docs/00-INDEX.md"     # y desde ahí, el documento de copias
```

Si la lista es fija, **añadir este contenedor es parte del despliegue, no un pendiente para
otro día**. Una copia que nadie ha verificado que cubra esta base es peor que saber que no la
cubre.
