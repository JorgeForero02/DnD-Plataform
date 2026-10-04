# ADR 0001 — `TRUST_PROXY` es un contador de saltos, y llega a Fastify como función

**Estado:** aceptada · **Fecha:** 2026-10-03 · **Decide:** el autor (TRUST_PROXY=2 desde el
2026-09-02; la forma de función, con el parche de dependencias del 2026-10-03).
- Línea en `decisiones.md`: D-AD-1

## Contexto

La API está detrás de **dos** proxies: Traefik (Coolify) y el nginx de `web`
(`docker-compose.prod.yml`). El límite de intentos del login es por IP (`ThrottlerGuard`), así que la
IP que ve la API decide si el límite protege a cada usuario o si todos comparten un cubo.
`03-despliegue.md` § «`TRUST_PROXY` vale 2» tiene la aritmética y las tres comprobaciones.

Desde `fastify` 5.12.1 un `trustProxy` **numérico** no confía en ningún salto (el cambio que cierra
«X-Forwarded-* spoofing under trustProxy hop-count»), y el tipo ya no admite un número.

## Decisión

`TRUST_PROXY` es **el número de proxies** delante de la API (0 = ninguno) y
`apps/api/src/configure-app.ts` lo pasa a Fastify como la función `(address, hop) => hop < N`, que es
exactamente lo que hacía `fastify` 5.11 con el número. En producción vale 2.

## Suposición que se probó

**Medida el 2026-10-03: no se cumple del todo.** La decisión supone que nadie salvo el nginx de `web` habla con la API; en su red también está Traefik (`coolify-proxy`). Detalle y riesgo en la ficha AD-6 de `06-pendientes.md`. Lo que sí está probado es la aritmética: `configure-app.spec.ts`, caso `TRUST_PROXY=2`.

## Alternativas descartadas

- **`trustProxy: true`**: toma la entrada de más a la izquierda de `X-Forwarded-For`, la que pone el
  cliente; el límite dejaría de existir (fue un fallo real, corregido el 2026-09-02).
- **Una lista de IP/CIDR de confianza** (p. ej. `uniquelocal`): a Traefik le puede llegar la IP del
  gateway de Docker, que es privada (`03-despliegue.md`, cadena de proxies), y una lista de rangos
  privados la tomaría por proxy, dejando pasar la cabecera del cliente.
- **Quedarse en `fastify` 5.11**: cuatro avisos high sin parchear.

## Consecuencias

La función confía en el vecino inmediato sin comprobar su IP. **Es seguro solo mientras la API no sea
alcanzable sin pasar por nginx**: hoy no publica puertos; en su red están `web`, `db` y Traefik (medido el 2026-10-03, ficha AD-6), que solo enruta a `web` y descarta el `X-Forwarded-For` del cliente.

## Cuándo revisarse

- Si cambia la topología: la API gana dominio propio, se quita Traefik o nginx, o se añade un CDN
  delante — el número se **recuenta**, no se hereda.
- Si la comprobación de dos redes de `03-despliegue.md` da `429` desde la segunda red.
- Si `fastify` vuelve a cambiar `trustProxy` (revisar al subir de mayor) o si se pasa a Nest 12 (AD-2).
