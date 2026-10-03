# Pendientes cerrados — adopción de la plantilla (2026-10-03)

**Secciones de `06-pendientes.md` que se archivan enteras durante la adopción de la plantilla.** La
primera, «Desplegar `main` (`84ed965`)», llevaba «hecho el 2026-09-14» en su propio título y seguía en
el tablero afirmando que producción servía `6d2b2ca`. La segunda, «La copia de seguridad de esta base:
DECIDIDO QUE NO», la sustituyó el autor el 2026-10-03, cuando ya había gente usando la plataforma. No se
reescriben. Los enlaces relativos que traen
apuntaban desde `docs/`; aquí no resuelven y se leen como texto.

---

## Desplegar `main` (`84ed965`): reglas de la mesa + desbordes — **hecho el 2026-09-14 (`b6bbeb0` en producción, comprobado en el contenedor)**

**Abierta, del autor.** `main` lleva dos tandas fusionadas el 2026-09-13 que producción (`6d2b2ca`) no
tiene. Qué trae el despliegue: **una migración aditiva** (`20260913100000_table_rules`: tres columnas/
tabla nuevas con defaults; la API la aplica sola al arrancar con `prisma migrate deploy`), **ninguna
variable de entorno nueva**, y ningún cambio de topología (`TRUST_PROXY` sigue en 2). Comprobar
después: `docker ps` con API y web `healthy`, `curl` 200, el bloque «Reglas de la mesa» en Ajustes de
una campaña, y el panel de ataque entero sobre un PNJ con encuentro activo (el caso que abrió la
tanda de desbordes). Cierra cuando `docs/00-INDEX.md` y esta ficha digan el commit que sirve el
servidor, medido allí y no de memoria.

> ## La copia de seguridad de esta base: DECIDIDO QUE NO, y no se vuelve a plantear
>
> **Decisión del autor, reafirmada el 2026-09-05, y SIN fecha de caducidad.** Sus palabras: *«no
> quiero copia de seguridad de la base de datos de este proyecto. Sé que es importante, pero
> estamos en una etapa muy verde de pruebas; las pruebas las hacen agentes y yo moviendo una o dos
> cosas. **No hay usuarios, no hay campañas**, esto ni siquiera es para vender a corto plazo»*.
>
> **No se propone, no se arregla y no se menciona** — ni antes de desplegar, ni antes de una
> migración, ni como nota al margen de otra cosa. La premisa que hace importante una copia —que
> haya algo que perder— **no se cumple**, y está evaluada, no ignorada.
>
> **Esta ficha llevaba escrita su propia caducidad** —*«antes de la primera partida real, esto tiene
> que estar hecho y probado»*— y era ella la que resucitaba el asunto en cada lectura: el 2026-09-05
> lo sacaron tres veces en una sola conversación, citándola. **La caducidad se retira**: quien lea
> esto no tiene que avisar de nada. Cambia el día que haya usuarios o campañas de verdad, **y ese
> día lo dice el autor**.
>
> Lo medido en su momento sobre el script roto —`$POSTGRES_PASSWORD` sin comillas simples, 20 bytes
> contra 6305— se conserva en
> [`_archivo/pendientes-cerrados-hasta-2026-09-05.md`](./_archivo/pendientes-cerrados-hasta-2026-09-05.md).
> Aquí no.

