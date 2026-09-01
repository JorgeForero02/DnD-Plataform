# Cierre real de la fase 1 — congruencia entre lo que el sistema puede y lo que ofrece

**Fecha:** 2026-09-01. **Estado:** hallazgos verificados, pendientes de arreglar.
**Es la tarea 1.17**, la primera de la siguiente sesión. Con ella la fase 1 queda cerrada de
verdad; hasta entonces, no.

Surge de una pregunta del autor —*"¿hay un cuaderno interno para escribir la historia?"*— que
destapó que **las fichas del mundo no tienen texto**. Al tirar de ahí se hizo un contraste
sistemático entre **lo que el modelo y la API permiten** y **lo que la pantalla ofrece**.

**Todo lo de abajo está comprobado en el código**, no supuesto.

## Por qué ninguna prueba lo encontró

Las 167 unitarias y los 6 recorridos de navegador comprueban con mucho detalle **que lo que
existe funciona**. Ninguna puede gritar por lo que falta: verifican que un texto que no existe
se le oculta correctamente a quien no debe verlo.

Es el punto ciego estructural de una suite de pruebas, y la razón de que este contraste haya
que hacerlo **a mano y a propósito**. Conviene repetirlo al cerrar cada fase.

---

## A · Campos que se escriben y nadie lee

### A1 · `Entity.body` no existe en la pantalla — **P0**

`schema.prisma:80` (`body Json?`) y `entity.schema.ts:7` (`body: z.unknown().optional()`) lo
tienen; la API lo guardaría. **`EntityEditor.tsx` no lo pinta ni lo envía**, y `entities/api.ts`
tampoco.

Una ficha es hoy **nombre + etiquetas + visibilidad + enlaces + comentarios**. Una entidad de
tipo `DOCUMENT` **no puede contener un documento**; un NPC no puede tener su descripción.
**La wiki es un índice sin páginas.**

Al arreglarlo, **decidir si el texto es plano o con formato**. Mejor ahora que migrar después:
`body` es `Json?`, así que el modelo aguanta las dos cosas.

### A2 · Las etiquetas se guardan y **no se ven en ninguna parte**

`EntityEditor.tsx:45` es el **único** sitio de toda la web que lee `entity.tags`: el propio
campo donde se escriben. **La lista no las muestra y no hay forma de filtrar por ellas.**

O sea, son **escritura sin lectura**: el DM las teclea, se guardan correctamente, y no sirven
para nada. Etiquetar un mundo entero y no poder decir *"enséñame todo lo de Barovia"* es
justamente lo que hace inútil una etiqueta.

---

## B · Cosas que **la API tampoco sabe hacer** (no es solo interfaz)

Estas necesitan endpoint nuevo, así que son más caras y hay que decidir si entran.

### B1 · Una campaña no se puede editar ni borrar

`campaigns.controller.ts` tiene **solo** `@Post()`, `@Get()`, `@Get(":id")` y
`@Get(":id/members")`. **No hay `PATCH` ni `DELETE`.**

Nombre y descripción se fijan al crearla **para siempre**, y una campaña creada por error
**no se puede borrar jamás**. Se acumulan en el panel del usuario sin remedio.

### B2 · No se puede expulsar a un jugador, ni salirse de una campaña

`membership.service.ts` tiene `requireMember`, `requireDM` y `listMembers`. **Nada más.** Una
vez aceptada la invitación, esa membresía es permanente: si alguien deja el grupo, sigue
viendo todo lo que sea `PLAYERS` para siempre.

Para una herramienta cuyo argumento central es **el control de quién ve qué**, no poder
retirar el acceso es una incoherencia seria.

### B3 · No se puede cambiar el nombre visible ni la contraseña

`auth.controller.ts` tiene `register`, `login` y `me`. **No hay forma de cambiar nada.**
Y **no hay recuperación de contraseña**: quien la olvide pierde la cuenta y todo lo que haya
escrito con ella.

---

## C · Ausencia funcional

### C1 · No hay búsqueda ni filtro en ninguna pantalla

Verificado: cero. Con veinte fichas se navega bien; con las de una campaña real, se navega
**haciendo scroll**. Junto con A2 (las etiquetas invisibles) es lo que separa una wiki
utilizable de una lista.

---

## Lo que propongo que entre en 1.17

**Obligatorio, es lo que cierra la fase:**

- **A1** — el cuerpo de texto de las fichas. Barato: modelo, esquema y API ya están.
- **A2** — etiquetas visibles en la lista y **filtrado por etiqueta**. Convierte en útil algo
  que ya se guarda.
- **B2** — expulsar y salir. Es coherencia con la promesa del producto, no una comodidad.

**A discutir, según lo que pese:**

- **B1** — editar y borrar campaña. Necesario en cuanto haya más de dos.
- **B3** — cambiar contraseña. Encaja mejor con la tarea de seguridad (1.18) que aquí.
- **C1** — búsqueda. Puede esperar si A2 aporta lo suficiente.

**Y al terminar, repetir este contraste**: recorrer el esquema campo a campo y la API endpoint
a endpoint, y preguntar por cada uno *"¿quién lo usa desde la pantalla?"*. Es media hora y hoy
ha encontrado seis cosas.
