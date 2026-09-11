# Historial — el paseo de uso contra producción (2026-09-05)

**Entrada de `07-historial.md` movida entera el 2026-09-11**, tercer corte de la sesión de cerrar
fichas: el fichero llegó a 1007 de sus 1000 líneas y esta era la entrada completa más antigua. No se
reescribe. Su hito se queda en el 07.

---

## El paseo de uso contra producción: un panel que se salía de la pantalla (2026-09-05)

**Recorrido visual con dos cuentas y dos anchos (1280 y 390) contra `dnd.supportive.pro`**, ya con
`cc64ed7` desplegado. Encontró **una cosa**, y era de las que el autor llama «que molestan»:

**A 390 px, el panel de la bandeja de avisos se salía por la izquierda.** Colgaba del botón con
`right-0`, y el botón **no está pegado al borde** —lo empujan el conmutador de tema y «Cuenta»—, así
que el borde izquierdo del panel caía **fuera de la pantalla**: se leía «…undren Piedrarroja». El
navegador no da ningún error por pintar fuera del lienzo y `jsdom` no maqueta, así que esto solo se
ve **mirando o midiendo**. Por debajo de `sm` el panel se ancla ahora **a la ventana** con su margen
a cada lado; a partir de ahí vuelve a colgar del botón, que es donde tiene sitio.

**Medido en el navegador** (`apps/web/e2e/bandeja-de-avisos.spec.ts`): a 390 px la caja del panel
empieza en x ≥ 0 y termina dentro de la ventana. **Mutación**: con la clase anterior, x = **−166**.

**Y dos arreglos del seed, encontrados usándolo desde otra sesión:**

- **Decía ser idempotente y solo lo era con la misma contraseña.** Con otra, el login daba 401, caía
  a registrar y el registro chocaba con un `409 Email already registered` que no explicaba nada.
  Ahora lo dice: *«la cuenta existe, pero la contraseña que le estoy dando no es la suya»*.
- **Una sola clave para las tres cuentas** impedía sembrar con una cuenta real como DM y las de
  demostración como jugadores. Cada cuenta puede traer su correo y su contraseña. Y **una cuenta que
  no sea de `@demo.invalid` no se crea nunca**: registrar el correo real de alguien con una
  contraseña que se inventa un script es crear la cuenta de otra persona.

**Lo que el paseo vio y sigue sin arreglar** (ficha en `06-pendientes.md`): **la mesa a 390 px**
reparte sus tres columnas a lo ancho y las «Herramientas del DM» quedan cortadas. No hay
desbordamiento de la página —el contenedor tiene su propio desplazamiento—, pero en un móvil la
mesa no se usa cómodamente. Es maquetación y pide su propia tanda.
