# Despliegue

> **Estado (2026-09-02): hay servidor asignado y el despliegue está autorizado, pero
> TODAVÍA NO SE HA DESPLEGADO NADA.** Este documento y `docker-compose.prod.yml` se
> escribieron para revisarse **antes** del primer despliegue. Nada de lo que hay aquí abajo
> se ha ejecutado contra el servidor: lo que sí se ha comprobado está en "Lo que está
> verificado" y lo que no, en "Lo que hay que comprobar el primer día".

- **Servidor:** `vps1new` (`159.195.240.38`), Debian 13 dedicado, **Coolify 4.3.10** con
  **Traefik** (`coolify-proxy`) de proxy inverso y Let's Encrypt para los certificados. Ya
  aloja otras cinco aplicaciones.
- **Dominio:** `dnd.supportive.pro`, que ya resuelve a esa IP.
- **Holgura el 2026-09-02:** ~3,7 GB de RAM libres de 7,8 y 222 GB de disco de 251, con 18
  contenedores en marcha. Por eso la pila **declara límites de memoria** en vez de dejar que
  cada servicio coja lo que quiera (768 MB API, 512 MB Postgres, 128 MB web): es la sexta
  aplicación de la máquina, no la única.

Sustituye a `docs/DEPLOY.md` <!-- docs-lint-ignore -->, que se eliminó el 2026-08-31 al
adoptar la estructura numerada.

## La pila se probó entera en local antes de desplegar (2026-09-02)

No es teoría: `docker-compose.prod.yml` se levantó completo en la máquina del autor, con las
imágenes construidas desde cero y una base de datos vacía, publicando solo `web` en un puerto
del host — porque en producción **no se publica ninguno**, entra Traefik.

Lo que se comprobó, en orden:

| Comprobación | Resultado |
|---|---|
| Las dos imágenes construyen | `dndprodtest-api` y `dndprodtest-web` |
| Arranque en orden, esperando salud | `db` sana → `api` sana → `web` |
| Migraciones sobre base vacía | Las **tres** aplicadas por el `CMD` de la imagen |
| La SPA se sirve | `GET /` → **200**, con su `<title>` |
| El proxy `/api` llega a la API | `GET /api/auth/me` → **401** (sin token, correcto) |
| Escritura real de punta a punta | `POST /api/auth/register` → **201** con su token |
| El límite de intentos actúa | Sexto intento de login → **429** |

Y una que hay que leer con cuidado, porque **enseña dónde está de verdad la seguridad**:

```
Rotando X-Forwarded-For falso:  401 401 401 401 401 401   <- NUNCA limita
Sin cabecera falsa:             401 401 401 401 401 429   <- limita al sexto
```

**En local eso es correcto y esperable.** Delante de la API hay **un solo** proxy (el nginx de
`web`), así que la cabecera que le llega es `<falsa>, <gateway>` y `TRUST_PROXY=2` alcanza la
entrada de la izquierda — la que puso el cliente. Con un proxy menos del que se declara, el
contador se queda con lo que mandó quien llamó.

**En producción no ocurre, y el motivo no es el número:** `coolify-proxy` (Traefik) corre **sin
`forwardedHeaders.trustedIPs`**, así que **descarta la cabecera que manda el cliente** y escribe
la suya con la conexión real. La cadena pasa a ser `<cliente real>, <traefik>`, y el 2 alcanza al
cliente real.

> **La protección la da Traefik descartando la cabecera; el 2 solo llega hasta ella.** Si algún
> día se pone la API detrás de otro proxy, o se le da dominio propio, o alguien configura
> `trustedIPs` en Traefik, **este razonamiento deja de valer** y hay que rehacerlo. Por eso la
> regla escrita es *cuenta los proxies*, y no un número que copiar.

### Desplegar corta el servicio unos segundos

Medido el 2026-09-02, tras ocho despliegues seguidos: **`docker compose up` recrea los tres
contenedores**, y durante esa ventana el dominio responde **503**. Dura del orden de medio
minuto —la primera petición tras el `finished` de Coolify puede fallar y la siguiente ya va—,
así que **un 503 justo después de desplegar no es un fallo: es el arranque**. Solo hay motivo
para preocuparse si sigue ahí pasado un minuto, y entonces se mira
`docker ps --filter name=5awvsn1dnkexhcjzg7kjwom6`, que dice si los tres están `healthy`.

No hay despliegue sin corte porque no hay réplicas: un solo contenedor por servicio. Montarlo
sería otra tarea, y para una mesa de cinco personas no compensa todavía — pero **conviene no
desplegar en mitad de una partida**.

### Comprobación obligatoria el primer día

Con la pila ya desplegada, desde **fuera** del servidor:

```bash
# 1. Seis intentos de login con credenciales malas. El sexto tiene que ser 429.
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://dnd.supportive.pro/api/auth/login \
    -H "Content-Type: application/json" -d '{"email":"nadie@nada.invalid","password":"mal"}'
done

# 2. Lo mismo, pero falsificando la cabecera. TIENE que seguir dando 429 al sexto:
#    si da 401 seis veces, Traefik NO está saneando y el límite no protege a nadie.
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://dnd.supportive.pro/api/auth/login \
    -H "X-Forwarded-For: 9.9.9.$i" -H "Content-Type: application/json" \
    -d '{"email":"nadie@nada.invalid","password":"mal"}'
done
```

Espera un minuto entre tandas: la ventana del limitador es de 60 segundos.

**El segundo comando es el que importa**, y es el que nadie hace. Si sale 401 seis veces, el
límite de intentos no existe en la práctica y hay que revisar `TRUST_PROXY` y la configuración
de Traefik antes de dar el despliegue por bueno.

## Lo que está verificado

- **Ambas imágenes Docker construyen** (`dnd-api`, `dnd-web`), comprobado en la tarea 0.10.
- **`node dist/src/main.js` arranca en modo producción** y mapea las rutas de auth
  (tarea 0.10 / commit `53ac276`).
- **`docker-compose.prod.yml` es un fichero válido**: `docker compose -f
  docker-compose.prod.yml config` renderiza sin errores y conserva los límites de memoria,
  las comprobaciones de salud y las dependencias. **Eso es todo lo que demuestra**: que el
  fichero es correcto, no que la pila funcione en el servidor.
- **La aritmética de `TRUST_PROXY`** (más abajo) está comprobada ejecutando el resolvedor
  real de Fastify —`@fastify/proxy-addr` 5.1.0 y `@fastify/forwarded` 3.0.2, las versiones
  instaladas en este repositorio— sobre la cabecera exacta que produce esta cadena de
  proxies.
- **CI en GitHub Actions verde** en cada push a `main` y en cada PR (`.github/workflows/ci.yml`),
  con dos trabajos: `test` (instala, genera Prisma, aplica migraciones contra un Postgres de
  servicio, y corre `pnpm lint`, `pnpm format:check`, `pnpm check:docs`, `pnpm check:estado`,
  `pnpm test` y `pnpm --filter @dnd/api test:e2e` — **`pnpm build` no está entre ellos**, ver
  [06-pendientes.md](./06-pendientes.md)) y `e2e-browser` (instala Playwright y corre `pnpm
  --filter @dnd/web e2e` contra la API y la web reales, subiendo el reporte como artefacto si
  falla). **El lint corre desde el 2026-08-31**; ver [07-historial.md](./07-historial.md).

## Una sola pila, no dos aplicaciones

`docker-compose.prod.yml` declara los tres servicios —`db`, `api`, `web`— en **una única
pila de Docker Compose**, y **solo `web` recibe dominio**. La alternativa era registrar la
API y la web como dos aplicaciones de Coolify independientes; se descarta por tres motivos,
en orden de peso:

1. **El nginx de `web` es lo que hace que `/api` sea el mismo origen que la página**
   (`apps/web/nginx.conf`). Ese es el mecanismo por el que este proyecto **no tiene CORS**
   (ver [01-arquitectura.md](./01-arquitectura.md) y el comentario de
   `apps/api/src/configure-app.ts`). Darle a la API su propio dominio obliga a encender
   `CORS_ORIGIN` y a mantener una lista de orígenes permitidos: más superficie, y una regla
   de arquitectura rota para no ganar nada.
2. **Cambia el número de saltos de proxy.** Una API con dominio propio queda a **un** salto
   de Traefik, mientras que las peticiones que entran por nginx siguen a **dos**. Con las
   dos rutas vivas a la vez **ningún valor de `TRUST_PROXY` es correcto**, y el que sobre
   por un lado es exactamente el agujero descrito abajo.
3. **Un solo despliegue atómico.** En una pila, `web` y `api` se construyen del mismo commit
   y arrancan juntas; como dos aplicaciones pueden quedar en versiones distintas sin que
   nada avise, y hay que cablear a mano un nombre de red interna entre ellas.

Consecuencia que hay que aceptar, y está anotada en [06-pendientes.md](./06-pendientes.md):
**un Postgres declarado dentro de una pila de Compose no es un "recurso de base de datos" de
Coolify**, así que **no hereda su pantalla de copias de seguridad**. Ver la sección de copias
más abajo.

## `TRUST_PROXY` vale 2 en este servidor, y por qué no es 1

**Esto es lo más fácil de equivocar de todo el despliegue, y falla en silencio: todo
funciona, y el límite de intentos de login no protege a nadie.**

`TRUST_PROXY` **no es un booleano ni un "sí, hay proxy": es el número de proxies que hay
delante de la API**. Fastify confía en exactamente N saltos contando **desde el socket hacia
fuera** y se queda con esa entrada de `X-Forwarded-For` (`apps/api/src/configure-app.ts`).

La cadena real en este servidor tiene **dos** proxies, no uno:

```
navegador --https--> Traefik (coolify-proxy) --http--> web/nginx --http--> api
```

- **Traefik** arranca en Coolify **sin `forwardedHeaders.trustedIPs`** (comprobado en el
  `Cmd` del contenedor `coolify-proxy`: solo los `entrypoints`, `http3`, el resolvedor ACME
  y `api.insecure=false`). Con esa configuración Traefik **descarta** el `X-Forwarded-For`
  que mande un cliente no confiable y lo reescribe a partir de la conexión real. Sale de
  Traefik como `X-Forwarded-For: <cliente>`.
- **nginx** (`apps/web/nginx.conf`) usa `proxy_add_x_forwarded_for`, que **añade** por la
  derecha: llega a la API como `X-Forwarded-For: <cliente>, <ip-de-traefik>`, con el socket
  siendo nginx.

Ejecutando el resolvedor real de Fastify sobre esa cabecera (socket `10.0.0.9` = nginx,
`X-Forwarded-For: 203.0.113.7, 10.0.0.2`):

| `TRUST_PROXY` | `req.ip` resultante | |
|---|---|---|
| `1` | `10.0.0.2`, la de **Traefik** | **Roto.** La misma IP para todos los visitantes del planeta |
| **`2`** | **`203.0.113.7`, la del cliente** | **Correcto** |
| `3` o más | la del cliente, *hoy* | De más: en cuanto llegue una cabecera más larga se traga lo que ponga el cliente |
| `true` | la entrada **más a la izquierda** | El atacante elige su propia clave; el límite deja de existir |

Con `1`, el `ThrottlerGuard` —que agrupa por `req.ip`— mete a todo internet en **un solo
cubo**: cinco intentos fallidos de cualquiera dejan a **todos los usuarios** fuera del
login. Es exactamente el defecto que arregló la tarea 1.18a (hallazgo 3, ver
[07-historial.md](./07-historial.md)), reapareciendo por la topología del servidor en vez de
por el código. `.env.example` y [02-entorno.md](./02-entorno.md) decían `1` porque se
escribieron cuando el único proxy previsto era nginx; `.env.example` ya está corregido y el
02 sigue pendiente (ver [06-pendientes.md](./06-pendientes.md)).

**Lo que hace segura la cifra `2` aquí es una propiedad de ESTE despliegue, no una verdad
general:** como Traefik descarta la cabecera que manda el cliente, la entrada que la API
acaba leyendo **no se puede falsificar desde fuera**. Si algún día se pone un CDN delante
(Cloudflare y similares añaden otro salto), o se configuran `trustedIPs` en Traefik, o se le
da dominio propio a la API, **este número cambia** y hay que recalcularlo, no heredarlo.

**La regla, para no copiar un número:** cuenta los proxies que hay entre el cliente y el
proceso de la API en el despliegue que tengas delante; ese es el valor. Sin proxy → `0`. API
directamente detrás de Traefik y nada más → `1`. Traefik y luego nginx → `2`.

### Cómo comprobarlo en el sistema en marcha

Ninguna de las tres comprobaciones se puede hacer desde un portátil: dependen de la
topología. Se hacen **después del primer despliegue**.

**1 · Confirmar que Traefik sigue sin IPs de confianza** (solo lectura, no cambia nada):

```bash
ssh vps1new "docker inspect coolify-proxy --format '{{json .Config.Cmd}}'" | grep -io 'forwardedheaders[^\"]*' || echo "sin forwardedHeaders: Traefik sanea la cabecera"
```

Si algún día aparece `forwardedHeaders.trustedIPs` o `forwardedHeaders.insecure`, vuelve a
leer esta sección antes de tocar nada: cambia la premisa.

**2 · Confirmar que nginx ve a Traefik como su cliente directo**, es decir que entre los dos
hay exactamente un salto:

```bash
ssh vps1new "docker ps --filter name=web --format '{{.Names}}'"    # localiza el contenedor
ssh vps1new "docker logs --tail 20 NOMBRE-DEL-CONTENEDOR-WEB"
```

El `$remote_addr` del log combinado de nginx (el primer campo de cada línea) debe ser una IP
interna de Docker —la de Traefik—, nunca la del visitante. Si fuera la del visitante, Traefik
no estaría delante y el número sería otro.

**3 · La prueba que de verdad importa, porque mide comportamiento y no configuración.**
`AUTH_RATE_LIMIT_DEFAULT` son 5 intentos por minuto y por IP
(`apps/api/src/common/rate-limit.constants.ts`). Desde **una** red, seis intentos de login
con contraseña incorrecta:

```bash
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://dnd.supportive.pro/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"nadie@example.com","password":"incorrecta"}'
done
```

Esperado: cinco `401` y luego un `429`. Ahora, **desde una red distinta** (datos móviles, no
el mismo wifi), **una sola** petición igual:

- **`401` → correcto.** Las dos redes tienen cubos separados: la API está viendo la IP real.
- **`429` → `TRUST_PROXY` se queda corto.** Las dos redes comparten cubo, que es justo el
  fallo. Súbelo y vuelve a probar (contando que en Coolify eso recompila la imagen).

**Sin el segundo paso la prueba no vale nada**: el `429` desde una sola red sale igual
estando bien que estando mal.

## Procedimiento

**1 · Aplicación en Coolify**
Proyecto `dnd`, entorno `production`. Recurso nuevo desde repositorio Git, rama `main`,
**build pack: Docker Compose**, fichero `docker-compose.prod.yml`, contexto la raíz del
repositorio. **No** se declara ningún recurso PostgreSQL de Coolify aparte: la base va dentro
de la pila.

**2 · Dominio**
Asignar `dnd.supportive.pro` **al servicio `web` y solo a él**. `api` y `db` se quedan sin
dominio y sin puertos publicados. Coolify genera las etiquetas de Traefik a partir de esa
asignación; **no se escriben a mano** en el compose, y **cambiar `applications.fqdn` por SQL
no las regenera** (trampa documentada en `vps1new:/root/docs/`).

**3 · Variables de entorno** (en la UI de Coolify, nunca en el repositorio)

| Variable | Valor | Nota |
|---|---|---|
| `POSTGRES_USER` | `dnd` | |
| `POSTGRES_PASSWORD` | aleatoria, generada | `openssl rand -base64 24`. No se reutiliza de ningún otro sitio |
| `POSTGRES_DB` | `dnd` | |
| `JWT_SECRET` | **`openssl rand -hex 32`** | **Obligatoria y de 32 caracteres como mínimo: sin ella, vacía o más corta, la API se niega a arrancar** (`apps/api/src/common/jwt-secret.ts`) en vez de firmar con un valor por defecto. `rand -hex 32` da 64 caracteres, de sobra. **Nunca el valor de ejemplo de ningún documento**: por eso `.env.example` la deja vacía en vez de poner un marcador |
| `JWT_EXPIRES_IN` | `7d` | Ya es el valor por defecto del compose; solo se declara para cambiarlo |
| `SENTRY_DSN` | opcional | Vacía o sin declarar = Sentry apagado, sin error |

Y tres que **NO se ponen**, cada una por su motivo:

- **`TRUST_PROXY`**: ya vale `2` fijo en `docker-compose.prod.yml`, porque es una propiedad
  de la topología y no del entorno. Que viva en el fichero y no en la UI es deliberado: así
  se revisa en un diff, y **cambiarla en la UI de Coolify recompilaría la imagen entera**
  (ver la trampa de abajo).
- **`AUTH_RATE_LIMIT`**: existe **solo** para que la suite de Playwright, que corre todo
  desde una única IP, no se auto-estrangule; ponerla en producción afloja la protección
  contra fuerza bruta en login, registro, aceptar invitación y cambio de contraseña.
- **`CORS_ORIGIN`**: no hace falta, porque nginx sirve `/api` en el mismo origen que la
  página. Solo haría falta si algún día un cliente viviera en otro dominio —una app móvil, un
  segundo frontal, o la API expuesta con dominio propio—, y en ese momento habría que
  recalcular también el número de saltos de arriba.

**4 · `DATABASE_URL`**
No se escribe a mano: el compose la construye apuntando a `db:5432` dentro de la red de la
pila. **Nunca una dirección pública**; `db` no publica ningún puerto ni al host ni a
internet.

**5 · Migraciones**
El `CMD` de `apps/api/Dockerfile` ejecuta `prisma migrate deploy` antes de arrancar el
proceso: **el esquema se aplica solo en cada despliegue**. Por eso `api` espera a que `db`
esté `service_healthy` y no solo a que su contenedor exista.

**6 · Auto-despliegue y comprobación**
Activar auto-deploy en push a `main`, con CI verde como condición previa. Entrar a
`https://dnd.supportive.pro`, registrarse e iniciar sesión sobre HTTPS. Si `SENTRY_DSN` está
puesta, provocar un error de prueba y confirmar que llega. Y hacer las tres comprobaciones de
`TRUST_PROXY` de arriba.

## Comprobaciones de salud

- **`db`**: `pg_isready`. Sirve, y es la que impide que la API arranque antes de tiempo.
- **`web`**: `wget --spider` sobre `/`, que devuelve el `index.html`. Sirve.
- **`api`**: **la API no expone hoy ningún endpoint de salud.** No existe ningún
  `@Controller("health")` ni controlador raíz —los ocho que registra `apps/api/src/app.module.ts`
  cuelgan de `auth`, `campaigns`, `invites`, `entities`, `links`, `comments`, `sessions` y
  `characters`—, así que `GET /` responde **404**. La comprobación del compose hace un
  `fetch` a `/` y da por sana cualquier respuesta HTTP, 404 incluido: **demuestra que el
  servidor HTTP está escuchando y responde, y nada más**. En particular **no** demuestra que
  la base de datos siga accesible, así que una API viva con Postgres caído se vería "sana".
  Es una limitación aceptada, no un descuido; está anotada en
  [06-pendientes.md](./06-pendientes.md), y arreglarla es añadir un endpoint, es decir un
  cambio de código con su propia ficha.

## Copias de seguridad

**La base de datos es lo único irreemplazable de esta pila.** Las imágenes se reconstruyen
del repositorio y el `index.html` no vale nada; las campañas, los personajes y las entidades
no están en ningún otro sitio.

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

**Qué exige de verdad una restauración** (no basta con "hay copias"):

1. **Un volcado completo, no solo de datos**: `pg_dump` con el esquema incluido. Prisma
   guarda el estado de las migraciones en la tabla `_prisma_migrations` **dentro de la misma
   base**; un volcado solo-datos la deja fuera, y al arrancar, `prisma migrate deploy`
   intentaría reaplicar migraciones sobre tablas que ya existen.
2. **Postgres 16.** Un volcado de 16 no se restaura en un servidor de versión menor.
3. **El rol y el nombre de base que espera `DATABASE_URL`** (`dnd` / `dnd`). Trampa ya
   documentada del servidor: **`pg_dumpall` no crea la base `postgres` por defecto ni
   actualiza la contraseña de un rol que ya existe** — restaurar sobre un Postgres nuevo con
   otra contraseña deja a la API sin poder conectar, y el síntoma no menciona la contraseña.
4. **`JWT_SECRET` no hace falta para restaurar datos**, pero cambiarlo invalida todas las
   sesiones abiertas y los usuarios tendrán que volver a entrar. Las contraseñas son hashes
   argon2 y viajan dentro del volcado, así que sobreviven a la restauración.
5. **Una restauración probada en un contenedor desechable, comparando conteos de filas con
   producción** — que es exactamente como se validó la del resto del servidor. Hasta hacer
   eso, la copia es una hipótesis, no una copia.

El volumen se llama `dnd_pgdata_prod`, distinto del `dnd_pgdata` de desarrollo a propósito,
para que nadie confunda uno con otro en un `docker volume ls`. **Copiar el volumen en
caliente no es una copia de seguridad**: hay que volcar con `pg_dump`.

## Trampas del servidor que aplican a esta pila

Documentadas en `vps1new:/root/docs/`, y todas nos afectan:

- **Cambiar una variable de entorno en Coolify RECOMPILA la imagen**, porque allí son
  argumentos de construcción. No es un reinicio de segundos: es un build completo con su
  corte de servicio. Para una variable como `TRUST_PROXY` eso significa dos cosas: **acertar
  el valor antes del primer despliegue** —por eso vive en el compose, revisable en un diff— y
  contar con una reconstrucción entera si la prueba de las dos redes dice que está mal.
- **Cambiar `applications.fqdn` por SQL no regenera las etiquetas de Traefik**
  (`custom_labels` cacheadas). Los dominios se tocan por la UI o la API de Coolify.
- **No se gestionan a mano los contenedores de Coolify**: ni `docker restart` ni `docker rm`.
  Se opera por su UI o su API.
- **`docker rm -f` no borra volúmenes anónimos** → si alguna vez hay que limpiar, `docker rm -fv`.
- **Docker se salta UFW**; los puertos publicados se filtran en `DOCKER-USER`. Esta pila **no
  publica ninguno**, que es la forma barata de no tener ese problema.
- **`acme.json` de Traefik**: hay que **parar** Traefik antes de restaurarlo, no reiniciarlo.

## Lo que hay que comprobar el primer día

Nada de esto se puede verificar desde una máquina de desarrollo. Es la lista literal:

1. La pila construye y arranca en Coolify, y `api` pasa a `healthy`. Si se queda en
   `starting`, lo primero que hay que mirar es si `prisma migrate deploy` falló contra `db`.
2. `https://dnd.supportive.pro` carga la web y el certificado lo emite Let's Encrypt.
   Comprobar el certificado **desde el servidor** (`openssl s_client` contra `127.0.0.1:443`
   con `-servername`), no desde el navegador de este PC: **Norton intercepta el TLS aquí** y
   el certificado que se ve no es el del servidor.
3. Registro y login funcionan sobre HTTPS.
4. **Las tres comprobaciones de `TRUST_PROXY`**, y sobre todo la de las dos redes.
5. El trabajo de copias de las 04:00 **incluye** esta base — y si no, añadirla ese mismo día.
6. Una restauración de prueba en un contenedor desechable, con conteo de filas.
7. El consumo real de la pila cabe en la holgura de la máquina (`docker stats`) y los límites
   de memoria del compose no están estrangulando a nadie.
