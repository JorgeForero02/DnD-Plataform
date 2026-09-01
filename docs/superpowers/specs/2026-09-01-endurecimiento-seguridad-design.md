# Endurecimiento de seguridad y pantallas de error — tarea 1.18

**Fecha de la auditoría:** 2026-09-01. **Estado:** hallazgos verificados, pendientes de arreglar.
**Esta tarea se ejecuta en una sesión limpia**, después del cierre de la fase 1
(`2026-09-01-cierre-fase-1-congruencia-design.md`, tarea 1.17) y antes de la capa visual (1.19)
y del plan de la fase 2. **El hallazgo 3 de aquel documento —cambiar la contraseña— encaja
mejor en esta tarea que en aquélla.**

Auditoría hecha a petición del autor sobre el sistema tal como está en el commit `4a3fe43`.
**Cada hallazgo se comprobó en el código o ejecutando la herramienta**; ninguno es sospecha.
El objetivo de este documento es que la sesión que lo arregle **no tenga que volver a auditar**:
abre, lee, y ejecuta.

---

## Lo que SÍ está cubierto (comprobado, no supuesto)

| Amenaza | Estado | Evidencia |
|---|---|---|
| **Inyección SQL** | Cubierto | Cero `queryRaw`/`executeRaw` en `apps/api/src`; todo pasa por Prisma parametrizado |
| **XSS** | Cubierto | Cero `dangerouslySetInnerHTML` e `innerHTML` en `apps/web/src`; React escapa por defecto |
| **Entrada no validada** | Cubierto | `ZodValidationPipe` con esquemas de `@dnd/shared` en cada escritura, en el servidor |
| **Contraseñas** | Cubierto | argon2; nunca en claro, nunca en registros |
| **Autorización** | Cubierto | En el servidor: `canView` (matriz 5×6 probada), `requireDM`, `requireMember`, `requireEditable`. Verificado sobre el DOM real por el recorrido de dos navegadores |
| **Secretos en el código** | Cubierto | Todo por variable de entorno; `.env` y `apps/api/.env` fuera de git |

**Nada de lo de abajo debe romper esto.** En particular: la autorización del servidor **no se
toca**; lo que falta es la capa de alrededor.

---

## Hallazgo 1 · CRÍTICO — `JWT_SECRET` tiene un valor por defecto en el código

`apps/api/src/auth/auth.module.ts:14` y `apps/api/src/auth/jwt.strategy.ts:16`, los dos:

```ts
secret: process.env.JWT_SECRET ?? "change-me-in-production"
```

Si esa variable falta en producción, **la API arranca tan feliz** firmando tokens con una cadena
que está **públicamente en el repositorio de GitHub**. Cualquiera que la lea fabrica un token
válido para el usuario que quiera y entra como él. No hace falta ningún fallo adicional: basta
un despliegue mal configurado.

**Arreglo:** que la API **se niegue a arrancar** sin `JWT_SECRET`, y que exija una longitud
mínima razonable. Fallar en el arranque es infinitamente mejor que funcionar inseguro.
El proyecto de grado del autor hizo exactamente esto (*"enforce minimum jwt secret strength"*).

**Prueba obligatoria:** arrancar sin la variable **falla**, y con una cadena corta también.

---

## Hallazgo 2 · ALTO — 29 vulnerabilidades en dependencias de producción

`pnpm audit --prod` el 2026-09-01: **1 crítica, 16 altas, 11 moderadas, 1 baja**.
(Incluyendo las de desarrollo: 55 en total.)

Paquetes afectados, todos por arrastre de una cadena Nest/Fastify desactualizada:
`fastify`, `@fastify/middie`, `@nestjs/core`, `@nestjs/platform-fastify`, `fast-uri`,
`find-my-way`, `lodash`, `react-router`, `file-type`, `@opentelemetry/core`.

**Y CI no audita nada**, así que esto crece en silencio.

**Arreglo:** subir la cadena de Nest y Fastify, y **añadir `pnpm audit` al workflow** para que
no vuelva a acumularse. Ojo: subir Nest puede tocar el arranque; hay que correr los e2e de API
después, no solo las unitarias.

---

## Hallazgo 3 · ALTO — sin límite de peticiones

No hay `@nestjs/throttler` ni equivalente en `apps/api`. Consecuencias:

- `/auth/login` acepta intentos infinitos → **fuerza bruta contra contraseñas**.
- `/invites/:token/accept` acepta intentos infinitos → **se pueden probar tokens a lo bestia**.

**Arreglo:** límite por IP en autenticación e invitaciones, más generoso en el resto.
**Prueba:** que el intento N+1 recibe 429.

---

## Hallazgo 4 · MEDIO — sin cabeceras de seguridad

`apps/api/src/main.ts` no registra `helmet`. Faltan `X-Frame-Options` (o
`frame-ancestors`), `Content-Security-Policy`, `X-Content-Type-Options: nosniff` y compañía.

**Arreglo:** `@fastify/helmet` con una política revisada — no la de por defecto sin mirar.

---

## Hallazgo 5 · MEDIO — CORS abierto de par en par

`apps/api/src/main.ts:11`: `app.enableCors()` **sin opciones** = cualquier origen.

Y lo irónico es que **no hace falta**: en producción nginx hace de proxy de `/api`, así que el
navegador solo habla con un origen (`docs/01-arquitectura.md`, *"No hay CORS por diseño"*).
La configuración contradice al documento.

**Arreglo:** quitarlo, o restringirlo a los orígenes de desarrollo. Comprobar que el proxy de
Vite sigue funcionando en local.

---

## Hallazgo 6 · MEDIO — no hay pantalla de 404 ni red de errores

`apps/web/src/App.tsx` define `/login`, `/register`, `/join/:token`, `/` y `/campaigns/:id`, y
**no hay ruta comodín**: una URL inventada da **pantalla en blanco**. Tampoco hay
`ErrorBoundary`, así que cualquier error de render deja la aplicación **en blanco**, sin
mensaje ni forma de volver.

Esto ya nos mordió una vez por otro camino: el Crítico 2 de la tarea 1.15 era exactamente una
pantalla en blanco perpetua, y se descubrió leyendo, no usando.

**Arreglo:** ruta 404 y `ErrorBoundary`, ambos con **salida hacia el listado de campañas**.
**Prueba:** una URL inventada muestra el 404; un componente que lanza muestra la pantalla de
error, no un vacío.

---

## Hallazgo 7 · BAJO, declarado — el token vive en `localStorage`

`apps/web/src/store/auth.store.ts`. Es aceptable **hoy** porque no hay superficie de XSS
(hallazgo verificado arriba), pero si algún día aparece una, el token se va con ella.

La alternativa es una cookie `httpOnly`, que trae su propia complejidad (CSRF, configuración del
proxy). **Se deja como compromiso conocido, no como urgencia** — pero conviene revisarlo antes
de abrir el sistema a gente ajena a la mesa del autor.

---

## Orden sugerido para la tarea

1. **Hallazgo 1 primero y solo**, si hay poco tiempo: es una línea y elimina el peor escenario.
2. Hallazgos 3, 4 y 5 juntos: son configuración del arranque de la API y comparten pruebas.
3. Hallazgo 6: es web, independiente, y mejora lo que ve un usuario perdido.
4. Hallazgo 2: el más aburrido y el que más puede romper. **Al final, con los e2e de API
   corriendo después.**

## Y cuando se despliegue

La auditoría de arriba es de código. **La otra mitad de los fallos de despliegue no se ven en
la máquina del autor**: cabeceras que pone o quita el proxy, certificados, puertos publicados,
variables mal puestas — precisamente el hallazgo 1.

Cuando exista un despliegue, conviene una pasada con la skill `auditoria-por-funcionalidad`
(frentes por camino + refutador adversario) **contra el sistema desplegado**, no contra el
local.
