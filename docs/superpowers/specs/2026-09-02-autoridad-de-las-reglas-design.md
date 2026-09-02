# Con qué autoridad escribe una regla — hueco H6, resuelto · 2026-09-02

> **Es un diputado confundido** (*confused deputy*), confirmado: el motor actúa como actor
> privilegiado —con la autoridad del DM— inducido por un actor sin privilegios —el jugador— a
> ejecutar una escritura. Misma estructura que el ejemplo canónico de Norm Hardy.

## El fallo, en siete puntos

Adoptados tal cual salieron del estudio de PostgreSQL (`SECURITY DEFINER`), GitHub Actions
(`pull_request_target`), Salesforce, Zapier e IAM:

1. **Cada regla fija en su creación el identificador exacto del objeto y el nivel destino** —
   como una consulta preparada. **Nunca se resuelve en el momento del disparo.**
2. El efecto corre con **la autoridad del DM que delegó**, siempre a través de `canView`, y se
   identifica al actor real: *«regla X, delegada por el DM Y, disparada por Z»*.
3. **Prohibidos los objetivos dinámicos por etiqueta en la v1**, salvo que solo quien tiene
   permiso de escritura pueda poner esa etiqueta. *(Esto corrige el diseño: el sistema de
   eventos proponía «revelar todas las fichas con la etiqueta X», y un jugador que pueda poner
   esa etiqueta tiene una vía de escalada.)*
4. Si algún día entran los objetivos dinámicos, **exigen confirmación explícita del DM**. En una
   regla estática esa confirmación sería teatro; en una dinámica, es la barrera.
5. **Auditoría obligatoria**: disparador, delegante, identificador y versión de la regla,
   condición evaluada, objeto, valor anterior y nuevo, y el resultado de `canView`.
6. **Contención**: interruptor general, límite de disparos, invalidación si el objeto cambia de
   dueño o se borra, y revocación **sin ventana residual**.
7. **Se declara como invariante** en `docs/04-convenciones.md`.

---

**Contexto del producto:** el DM configura reglas del tipo `CUANDO un jugador abre la ficha X ENTONCES revelar la ficha Y`. "Revelar" es subir el nivel de visibilidad de un objeto, una escritura que pasa siempre por el evaluador único `canView` en servidor. El disparo de la regla lo produce un jugador sin privilegios de escritura sobre ese objeto. ¿Con qué autoridad corre el efecto?

---

## 0. Confirmación: sí, es un caso de "confused deputy"

Un "confused deputy" es, por definición, un programa con más privilegios que es engañado por otro con menos privilegios para que abuse de su autoridad ([Wikipedia](https://en.wikipedia.org/wiki/Confused_deputy_problem); [AWS IAM docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html)). El ejemplo canónico (Norm Hardy, el compilador que escribe en un fichero restringido porque el *cliente* eligió el nombre del fichero de salida) tiene la misma estructura exacta que este producto: **un actor sin privilegio (el jugador) elige el momento y el argumento (qué ficha abrir) que decide qué acción de escritura ejecuta un actor con privilegio (el motor de reglas, actuando en nombre del DM)**.

La pregunta de diseño no es "¿es esto un confused deputy?" — lo es estructuralmente en cuanto el objetivo de la escritura puede depender de una elección del jugador — sino **dónde está la frontera que impide que lo sea en la práctica**. Esa frontera es exactamente el tema de las secciones B y C.

---

## 1. PostgreSQL: SECURITY DEFINER vs SECURITY INVOKER

Por defecto una función en PostgreSQL es `SECURITY INVOKER`: corre con los privilegios de quien la llama. `SECURITY DEFINER` la hace correr con los privilegios de quien la **posee** — es el mecanismo nativo de Postgres para "un usuario sin privilegio dispara una acción que sí tiene privilegio", el equivalente exacto a lo que se le pide a la regla del DM.

El fallo documentado y repetido es el **secuestro de `search_path`**: si la función `SECURITY DEFINER` no fija su propio `search_path`, cualquier invocador puede hacer `SET search_path = miesquema_hostil;` antes de llamarla, y la función termina resolviendo nombres de tabla/función/operador contra objetos falsos creados por el atacante en un esquema temprano en la ruta — ejecutando código arbitrario con los privilegios del dueño de la función ([Cybertec PostgreSQL](https://www.cybertec-postgresql.com/en/abusing-security-definer-functions/); [postgresql.org, discusión del commit que documenta el riesgo](https://www.postgresql.org/message-id/E1eqKv8-000697-VI@gemulon.postgresql.org)).

Esto no es teórico: es **CVE-2018-1058**, con el propio equipo de PostgreSQL confirmando que el esquema `public`, escribible por cualquiera por defecto en versiones ≤14, hace el ataque trivial contra `pg_dump` y contra cualquier `SECURITY DEFINER` mal escrito. La mitigación oficial son dos, cualquiera de las dos basta:
- En la función: `SET search_path = pg_catalog, nombre_esquema_fijo` (o cualificar cada nombre de objeto con su esquema).
- En la base: `REVOKE CREATE ON SCHEMA public FROM PUBLIC` — que desde PostgreSQL 15 es el comportamiento por defecto en `template1`.

Recomendación adicional del propio equipo de Postgres: `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` y conceder `EXECUTE` solo a los roles que de verdad necesitan disparar el efecto, para que ni siquiera la superficie de "quién puede invocar" quede abierta.

**Lección trasladable:** el peligro de un `SECURITY DEFINER` no es la delegación de autoridad en sí — es delegarla **sin fijar de antemano, de forma inmutable, qué va a resolver cada nombre/referencia dentro de la función**. El invocador solo debe poder variar los *argumentos* que la función declaró que acepta, nunca la *resolución* de qué objeto o esquema se toca. Aplicado al producto: la regla del DM es el análogo de la función `SECURITY DEFINER`; el jugador que la dispara es el invocador. La regla es segura en la medida en que **fija de antemano, de forma no reinterpretable por el disparo, qué objeto exacto se revela** — igual que la función seria fija su `search_path`.

---

## 2. GitHub Actions: `GITHUB_TOKEN`, `pull_request_target` y "pwn requests"

El `GITHUB_TOKEN` es un token efímero, generado por workflow, con privilegios sobre el repo. Desde 2021 GitHub permite (y hoy recomienda) fijarlo a **solo lectura por defecto a nivel de organización/repo**, y declarar explícitamente en cada job los permisos de escritura que de verdad necesita (`permissions:` en el YAML) — mínimo privilegio declarado en el momento de *configurar* el workflow, no en el de ejecutarlo ([GitHub Changelog 2021](https://github.blog/changelog/2021-04-20-github-actions-control-permissions-for-github_token/); [StepSecurity](https://www.stepsecurity.io/blog/github-token-how-it-works-and-how-to-secure-automatic-github-action-tokens)).

El caso de estudio es `pull_request_target`. A diferencia de `pull_request`, este evento ejecuta el workflow **en el contexto del repo base**, con el `GITHUB_TOKEN` y los secretos completos del repo destino, mientras que el disparador (abrir/actualizar un PR) lo controla cualquiera, incluido un fork externo no confiable. El "pwn request" ocurre cuando ese workflow además hace `checkout` del *código del PR* (el que trae el atacante) y lo ejecuta — el disparador de bajo privilegio consigue que se ejecute código suyo con el token de alto privilegio del repo destino ([Endor Labs](https://www.endorlabs.com/learn/pwn-request-threat-a-hidden-danger-in-github-actions); [GitHub Security Lab](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/); [StepSecurity](https://www.stepsecurity.io/blog/github-actions-pwn-request-vulnerability)). Es un incidente recurrente en proyectos open source reales, tan repetido que en junio de 2026 GitHub cambió `actions/checkout` v7 para bloquear por defecto los patrones de checkout más peligrosos bajo `pull_request_target` ([GitHub Changelog](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/); [The Hacker News](https://thehackernews.com/2026/06/github-updates-actionscheckout-to-block.html)).

**Lección trasladable:** el fallo no es "dar privilegio a una automatización disparada por alguien de menor privilegio" — eso es necesario para que CI funcione. El fallo es dejar que el disparador de bajo privilegio **controle también el *contenido* de lo que la automatización privilegiada ejecuta o lee** (el código del PR fork). Análogo directo: si la regla del DM permitiera que el jugador influyera no solo en *cuándo* dispara sino en *qué objeto* se revela, se reproduce el mismo patrón. Mientras el objeto revelado esté fijado por el DM al crear la regla y el jugador solo controle el *cuándo* (qué evento cumple la condición), el paralelismo con `pull_request_target` no se cumple — es más parecido a `pull_request` normal (privilegio bajo, sin acceso a secretos) que a un pwn request.

---

## 3. Salesforce: modo sistema vs modo usuario, `WITH SECURITY_ENFORCED` / `USER_MODE`

Apex corre en **modo sistema** por defecto: ignora permisos de objeto, de campo y reglas de compartición del usuario que disparó la ejecución. Los Flows heredan ese mismo dilema: pueden correr *"en contexto de sistema sin compartición"* (ignoran todo permiso del usuario), *"en contexto de sistema con compartición"* (respetan reglas de compartición pero no field-level security) o *"en contexto de usuario"* (respetan todo lo que respeta el usuario que dispara) ([SFDCPoint](https://www.sfdcpoint.com/salesforce/system-mode-and-user-mode-in-salesforce/); [Automation Champion](https://automationchampion.com/2020/11/21/getting-started-with-process-builder-part-21-running-a-flow-in-system-mode/)).

`WITH SECURITY_ENFORCED` (en SOQL) y su sucesor `WITH USER_MODE` (SOQL + DML) son el mecanismo que Salesforce añadió para que un desarrollador que necesita ejecutar en modo sistema pueda, aun así, **forzar la comprobación de permisos del usuario en el punto concreto de la consulta o la escritura**, sin renunciar al resto de la ejecución en modo sistema ([Medium — Sanjay](https://medium.com/@sanjayece90/apex-security-in-salesforce-part-3-with-security-enforced-vs-user-mode-d0f2cbf9c3d1); [Salesforce Developer Docs](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html)).

**Lección trasladable:** Salesforce no obliga a elegir entre "todo con la autoridad del usuario disparador" o "todo con la autoridad de quien programó el flujo" — ofrece un **modo mixto explícito, decidido en el punto de diseño del automatismo (no en el de ejecución), con la comprobación de permiso incrustada exactamente en la operación sensible**. Es el mismo patrón que en Postgres (fijar en el momento de creación qué se comprueba) y confirma que la industria converge en: *la autoridad efectiva de un automatismo se decide dónde se declara el automatismo, no dónde se dispara*.

---

## 4. Zapier / IFTTT: la automatización actúa con las credenciales de quien la conectó

Aquí el patrón es distinto y sirve de contraejemplo útil. Un Zap corre siempre con el token OAuth de la persona que lo autenticó, no con el del usuario que provoca el evento disparador en el sistema origen. Esto crea dos problemas documentados, ninguno idéntico al del producto pero ambos relevantes:

- **"Ghost logins" / autor ausente**: si el Zap lo creó un empleado que ya no está en la empresa, el automatismo sigue corriendo con su token OAuth — que no se revoca automáticamente al offboardearlo — y nadie en el equipo tiene ni visibilidad ni control de esa autoridad delegada ([Reco.ai](https://www.reco.ai/blog/ghost-logins-in-zapier-the-hidden-risk-in-automation-platforms)).
- **Incidente real de mayo de 2026**: una cadena de vulnerabilidades en Zapier permitía, con solo una cuenta gratuita, robar una clave de publicación interna e inyectar código que se ejecutaba en el navegador de *cualquier* usuario con sesión iniciada, alterando automatizaciones ajenas y actuando contra los servicios conectados en su nombre — el confused deputy llevado a la implementación, no al diseño ([Aviatrix](https://aviatrix.ai/threat-research-center/zapier-bug-chain-account-takeover-2026/)).

**Lección trasladable:** delegar la autoridad "de por vida, sin caducidad y sin revisión" a la identidad de quien configuró el automatismo es frágil en el tiempo, no solo en el momento del disparo. Es el argumento a favor de la sección F (revocación, caducidad) más que de la B/C.

---

## 5. Motores de reglas activos (Drools, active databases, ECA) y triggers en general

Los sistemas ECA (Event-Condition-Action) — la familia teórica a la que pertenecen tanto los triggers de base de datos como este motor de reglas del DM — no tienen, como concepto de diseño, una noción nativa de "autoridad del disparador vs autoridad del creador de la regla": el modelo académico asume una única autoridad administrativa (el DBA que define el trigger) y no modela un disparador de menor privilegio como actor de seguridad ([Wikipedia — Active database](https://en.wikipedia.org/wiki/Active_database); [Wikipedia — ECA](https://en.wikipedia.org/wiki/Event_condition_action)). Los triggers de PostgreSQL, en particular, se reducen exactamente al caso de la sección 1: corren con la autoridad de su dueño salvo que se declaren de otro modo, y heredan el mismo riesgo de `search_path`.

Drools (motor de reglas de negocio de referencia en Java) tampoco resuelve esto por sí mismo: modela el contexto (working memory, facts) pero no una noción de "quién disparó el hecho tiene menos autoridad que quien escribió la regla" — la separación de autoridad, cuando existe, es responsabilidad de la capa de aplicación que envuelve al motor, no del motor.

**Lección trasladable:** no hay que esperar que el motor de reglas resuelva esto solo. Es explícitamente responsabilidad del diseño de la aplicación (como en Salesforce, sección 3) decidir en qué "modo" corre el efecto y comprobarlo en el punto de escritura — nunca delegarlo al propio motor de reglas ni asumir que "es un trigger, así que hereda la autoridad correcta por defecto".

---

## 6. Kubernetes / IAM: impersonation acotada, `--as`, bind a un recurso concreto

Kubernetes RBAC modela explícitamente la delegación acotada vía el verbo `impersonate`: un principal de bajo privilegio puede tener permiso para actuar *como* otra identidad, pero solo si el rol se lo concede, y lo idiomático es acotarlo con `resourceNames` a **una identidad concreta**, no a "cualquier usuario" ([johnharris.io](https://johnharris.io/2019/08/least-privilege-in-kubernetes-using-impersonation/); [Gcore](https://gcore.com/blog/k8s-rbac-permissions)). El patrón recomendado — un grupo de equipo obtiene permiso de `impersonate` limitado a una única cuenta de servicio administradora del namespace, en vez de recibir el rol de admin directamente — es la versión K8s de "la autoridad se fija en el momento de conceder el permiso, con alcance mínimo y nombrado, no en el momento de usarlo".

Del lado negativo: cuando `impersonate` se concede sin `resourceNames` (sobre `*`), cualquier identidad comprometida con ese permiso puede hacerse pasar por cluster-admin — es la escalada de privilegios documentada más citada de RBAC mal configurado ([sourcery.ai — CKV2-K8S-3](https://www.sourcery.ai/vulnerabilities/ckv2-k8s-3-impersonate-permissions)).

**Lección trasladable:** conceder autoridad delegada es aceptable; concederla *sin acotar el objetivo* no lo es. Traducido al producto: que el jugador dispare una escritura en nombre del DM es aceptable si esa escritura solo puede aterrizar sobre el objeto exacto que el DM nombró — es inaceptable si el disparo permite que la escritura aterrice sobre un conjunto que el jugador puede ensanchar.

---

## 7. Reglas de reenvío de correo, webhooks, bots de moderación

Las reglas de reenvío de Outlook/Gmail son el caso "trigger-action" más citado como vector de abuso real, no como ejemplo académico: MITRE ATT&CK las cataloga como técnica de persistencia y exfiltración (**T1114.003**) porque, una vez creada la regla, actúa con la autoridad plena del buzón sin que el propietario la revise, y sobrevive a la rotación de contraseña — el "disparador" (recepción de un correo con ciertas características) puede en la práctica ser influido por el propio atacante enviando el correo con el asunto/remitente que activa la regla que él mismo puso ([MITRE ATT&CK T1114.003](https://attack.mitre.org/techniques/T1114/003/); [Red Canary](https://redcanary.com/blog/threat-detection/o365-email-rules-mindmap/)). La mitigación de Microsoft 365 es a nivel de política, no de regla: deshabilitar el reenvío externo por defecto en el tenant, y exigir revisión/alerta cuando una regla se crea o modifica ([Practical 365](https://practical365.com/microsoft-365-auditing-bec-attacks/)).

El caso académico más directamente aplicable al producto es **Decoupled-IFTTT** (papers de investigación sobre plataformas trigger-action tipo IFTTT para IoT): documenta el mismo problema — el motor de la plataforma obtiene autorización amplia sobre servicio origen y destino en el momento de conectar las cuentas, y en el momento del disparo no hay garantía de que la acción ejecutada corresponda a la intención original del usuario que creó la regla. Su solución es exactamente la hipótesis B de este informe: **separar el momento de autorización (creación de la regla, donde se fijan los límites exactos de qué dato/operación puede tocar) del momento de disparo (donde el motor solo puede ejecutar dentro de esos límites ya fijados, nunca reinterpretarlos)** ([arXiv 1707.00405 — Decoupled-IFTTT](https://arxiv.org/pdf/1707.00405)).

---

## Respuestas a las preguntas de diseño

### A. ¿Delegación con la autoridad del DM, o alternativa mejor?

Sí, con matices — y toda la evidencia de las secciones 1–7 converge en la misma respuesta: **la delegación es el patrón correcto y universal** (Postgres `SECURITY DEFINER`, `GITHUB_TOKEN` del workflow, Salesforce modo sistema, `impersonate` de K8s, autorización OAuth de Zapier). Ningún sistema real evita la delegación — sería inviable: exigir que el efecto corra con la autoridad del disparador es directamente lo que impide que la regla exista (el jugador nunca podría revelar la ficha, sea como sea que se dispare). La alternativa "que el jugador tenga, aunque sea puntualmente, el privilegio de escritura" es peor: rompería `canView` como evaluador único y crearía una vía de escritura paralela.

La pregunta correcta no es *si* delegar sino *qué tan acotada* está la delegación. Aquí es donde la mayoría de los sistemas fallan (secciones 1, 2, 4, 7) o aciertan (secciones 1 con `search_path` fijo, 3, 6) según si acotan el objetivo en el momento de conceder o lo dejan abierto al momento de disparar.

### B. La frontera segura: ¿se sostiene la hipótesis de "consulta preparada"?

**Sí, se sostiene, y es la formulación más precisa encontrada en toda la investigación.** Es literalmente el resultado de Decoupled-IFTTT (sección 7) y el mecanismo de `SET search_path` fijo en `SECURITY DEFINER` (sección 1): la autoridad delegada es segura si **la "forma" de la operación privilegiada (qué objeto, qué campo, qué nivel de destino) queda fijada, resuelta y congelada en el momento en que el privilegiado arma la regla**, y lo único que el disparo de baja autoridad puede aportar después es la decisión binaria de *cuándo* ejecutar esa forma ya fijada — nunca un dato que se interprete para decidir *sobre qué* ejecutarla.

El paralelismo con consulta preparada es exacto: en SQL preparado, el atacante controla el *valor* del parámetro pero no la *estructura* de la sentencia (qué tabla, qué columna); aquí el jugador controla el *momento* del disparo (qué evento cumple la condición) pero no debe controlar *qué objeto se revela ni a qué nivel*. Eso lo fija el DM, con una referencia directa al ID del objeto (no a una condición que el jugador pueda satisfacer variablemente), en el momento de crear la regla.

Riesgo residual a vigilar: el "cuándo" no es completamente inerte. Si el jugador puede *provocar a voluntad* la condición (por ejemplo abrir la ficha X en el momento que le convenga, para revelar Y justo antes de un combate), eso es una preocupación de **diseño de juego** (fuga de información fuera de contexto narrativo), no de control de acceso — pero vale la pena que el DM lo sepa: la regla no impide que el jugador *elija el timing* del efecto, solo que elija *el objetivo*.

### C. Objetivo dinámico ("revelar todas las fichas con etiqueta X")

Este es el caso donde la hipótesis de B se rompe si no se blinda explícitamente, y es exactamente el patrón que causó el "pwn request" de GitHub Actions (sección 2: el disparador de bajo privilegio no elige directamente el objetivo, pero sí controla un dato — el contenido del PR — que el sistema privilegiado resuelve dinámicamente en el momento de actuar).

Si un jugador puede poner la etiqueta X en un objeto (por ejemplo, etiquetando su propia ficha, o un objeto que él mismo creó si el producto lo permite), un objetivo dinámico por etiqueta le da la misma capacidad que una escritura directa: elige qué se revela vistiéndolo con la etiqueta correcta antes de disparar la condición. Esto dinamita la garantía de B porque la "forma" de la operación deja de estar fijada por el DM — el conjunto de objetos afectados pasa a depender de datos que el disparador de baja autoridad puede alterar.

Cómo lo resuelven los sistemas reales, por analogía directa:
- **AWS (`aws:SourceArn`/`aws:SourceAccount`, sección 6bis del análisis)**: cuando la resolución dinámica es indispensable (el servicio llamante no puede fijar de antemano un ARN único), la mitigación no es prohibir lo dinámico sino **anclar la condición a un identificador que el actor de bajo privilegio no puede fabricar ni influir** (la cuenta/organización de origen, no un nombre elegido por un tercero).
- **Postgres `SECURITY DEFINER`**: la recomendación es justo la opuesta a lo dinámico — fijar el `search_path`, es decir, **restringir explícitamente el universo de objetos resolubles** en vez de dejar que la resolución dependa de lo que exista en el momento de la llamada.
- **Kubernetes `impersonate` con `resourceNames`**: cuando hace falta acotar un conjunto, se acota por **nombre explícito**, no por un atributo mutable por terceros.

Recomendación concreta para este producto, con ese mismo patrón: **si se permite un objetivo por etiqueta, la etiqueta solo puede aplicarla o modificarla quien tiene privilegio de escritura sobre el objeto** (DM, o creador/dueño, igual que exige ya la regla de autorización del proyecto) — nunca el jugador que además puede disparar la condición. Es decir: no prohibir lo dinámico de raíz, sino exigir que **el conjunto de objetos afectados solo lo controle quien armó la regla** (o alguien con privilegio de escritura equivalente sobre ese atributo), reproduciendo la garantía de B a nivel de conjunto en vez de a nivel de objeto único. Si el producto no puede garantizar hoy que el etiquetado esté protegido con ese mismo nivel de autorización, la opción más simple y más segura — y la más alineada con "objeto exacto, ID fijo, resuelto en el momento de crear la regla" — es **no ofrecer objetivos dinámicos en la v1** y limitar las reglas a un ID de objeto concreto elegido por el DM.

### D. Modo de confirmación (proponer, el privilegiado aprueba)

Es una mitigación real y con precedente (aprobaciones en Flow de Salesforce, revisión obligatoria en `pull_request_target` tras el endurecimiento de `actions/checkout`), pero su valor depende enteramente de **si cambia quién decide, o solo añade fricción a algo que ya estaba decidido**.

- **Es suficiente** cuando el objetivo es genuinamente dinámico o ambiguo (el caso C) y el DM revisa *antes de que ocurra* el efecto concreto que se propone — ahí la confirmación es el único punto donde de verdad se reintroduce el juicio de quien tiene autoridad.
- **Es teatro** cuando el objetivo ya estaba fijado en el momento de crear la regla (el caso B, resuelto correctamente) y se pide confirmación igualmente: el DM aprobará mecánicamente cientos de veces una acción que él mismo ya autorizó al configurar la regla, hasta que deje de leerla — degradando la seguridad real a un clic reflejo, sin aportar nada que el propio diseño de la regla no garantizara ya. También es teatro si la UI de confirmación no muestra con claridad el "antes/después" real (qué ficha, qué nivel, para quién) — sin eso, confirmar no es distinto de no confirmar.

Regla práctica: usar confirmación como mitigación *solo* para las reglas de objetivo dinámico (sección C) que el producto decida sí soportar, no como sustituto de acotar la autoridad en el diseño de la regla cuando el objetivo ya es estático.

### E. Qué debe quedar en el registro de auditoría

Para que la delegación sea defendible ante una pregunta tipo "¿por qué vio esto el jugador Z?", el registro debe reconstruir la cadena completa de autoridad, no solo el resultado:

1. **Quién disparó**: el jugador (o el evento del sistema) cuya acción cumplió la condición, con marca de tiempo exacta.
2. **Quién delegó**: el DM que creó la regla, y el ID/versión de la regla concreta que se disparó (si la regla se editó después de crearse, qué versión estaba vigente en el momento del disparo).
3. **Qué condición se evaluó y con qué datos**: el evento concreto (qué ficha abrió, qué etiqueta tenía en ese momento si el objetivo era dinámico) — para poder auditar después si el jugador influyó indebidamente en el resultado.
4. **Qué cambió**: objeto afectado, campo (nivel de visibilidad), valor anterior y valor nuevo — nunca solo el valor nuevo; sin el valor anterior no se puede diferenciar "la regla hizo esto" de "esto ya era así".
5. **Bajo qué autoridad corrió el efecto**: que quede explícito en el registro que la escritura se ejecutó "como el DM, vía regla X, disparada por el jugador Y" — igual que AWS exige que el `aws:SourceArn`/`aws:SourceAccount` quede en el log de CloudTrail para poder demostrar en qué cuenta actuó el servicio delegado, y no simplemente qué servicio actuó.
6. **Resultado de la evaluación de `canView`/autorización en ese momento**, si el producto ya versiona eso — para poder demostrar que el efecto respetó el evaluador único y no lo esquivó.

### F. Mecanismos de contención estándar

De la comparación entre plataformas (especialmente Zapier/IFTTT en la sección 4, donde su ausencia es la causa raíz de los "ghost logins", y Kubernetes en la 6):

1. **Interruptor general**: capacidad de desactivar todas las reglas de un DM o de una campaña de un golpe (equivalente al `Off — Forwarding is disabled` de tenant en Microsoft 365).
2. **Límite de disparos**: un tope de ejecuciones por regla/por sesión/por unidad de tiempo, para que un jugador que descubre cómo disparar la condición repetidamente no pueda usarlo como canal de fuga de información a voluntad.
3. **Caducidad de la delegación**: la autoridad que representa la regla no debería sobrevivir indefinidamente sin revisión — reevaluar o requerir reconfirmación del DM tras cambios relevantes (el objeto referenciado se borró, cambió de dueño, la campaña cambió de DM), análogo al problema de "ghost login" de Zapier cuando el creador original ya no está.
4. **Revocación inmediata y en cascada**: borrar o desactivar una regla debe detener su efecto de inmediato — sin ventana en la que siga corriendo "residualmente" (el fallo señalado repetidamente en reglas de reenvío de correo: sobreviven a rotación de contraseña porque no dependen de la sesión del atacante sino de la regla en sí).
5. **La regla deja de ser válida si cambia la propiedad del objeto objetivo**: si el objeto destino cambia de dueño o de campaña, la regla original (creada bajo otra autoridad) no debería seguir escribiendo sobre él sin revalidación.

---

## Recomendación concreta y numerada para este producto

1. **Cada regla fija, en el momento de su creación por el DM, el ID exacto del objeto a revelar y el nivel de visibilidad destino exacto — no una condición ni una consulta que se resuelva en el momento del disparo.** Es la aplicación directa de B: la regla es una "sentencia preparada" cuya forma queda congelada al crearla.
2. **El motor de reglas ejecuta el efecto con la autoridad del DM (autor de la regla), nunca con la del jugador que dispara** — la escritura sigue pasando por `canView`/las mismas comprobaciones de servidor que cualquier otra escritura de DM, pero identificando como actor real a "regla X, delegada por el DM Y, disparada por Z", no directamente al jugador.
3. **No ofrecer objetivos dinámicos por etiqueta u otro atributo mutable en la v1**, salvo que el producto pueda garantizar que solo quien tiene privilegio de escritura sobre ese atributo (DM/creador) puede modificarlo — nunca el jugador que también puede disparar la condición (aplicación directa de C).
4. **Si en el futuro se ofrece objetivo dinámico, exigir modo de confirmación explícito del DM antes de aplicar el efecto**, mostrando con claridad qué objeto concreto entra en el conjunto y por qué — no un modo de confirmación genérico para reglas de objetivo ya estático, donde sería teatro (D).
5. **Registrar en auditoría, por cada disparo**: jugador disparador, DM delegante, ID y versión de la regla, evento/condición evaluada con sus datos, objeto afectado, valor anterior y nuevo de visibilidad, y confirmación de que pasó por `canView` (E).
6. **Añadir contención operativa**: interruptor general por campaña, límite de disparos por regla/periodo, invalidación automática de la regla si el objeto destino cambia de dueño/campaña o se borra, y revocación inmediata (sin ventana residual) al desactivar o editar una regla (F).
7. **Documentar la decisión en `docs/04-convenciones.md`** (o donde corresponda según las reglas del proyecto), incluyendo explícitamente que las reglas del DM son un caso deliberado de delegación acotada tipo `SECURITY DEFINER`, con su frontera de seguridad (objetivo fijado en creación, no en disparo) declarada como invariante que cualquier feature futura de "objetivo dinámico" debe preservar o justificar por qué no.

---

## Errores conocidos a evitar (con la fuente donde se documentaron)

| Error | Sistema donde se documentó | Fuente |
|---|---|---|
| Dejar que el `SECURITY DEFINER`/trigger resuelva nombres de objeto según el `search_path` del invocador en vez de fijarlo | PostgreSQL — CVE-2018-1058 y patrón repetido de abuso | [Cybertec PostgreSQL](https://www.cybertec-postgresql.com/en/abusing-security-definer-functions/), [postgresql.org](https://www.postgresql.org/message-id/E1eqKv8-000697-VI@gemulon.postgresql.org) |
| Dejar que el esquema público sea escribible por cualquiera, ampliando gratis la superficie de objetos falsificables | PostgreSQL ≤14 por defecto | [Postgres 15 release notes / discusión CVE-2018-1058](https://www.postgresql.org/message-id/E1eqKv8-000697-VI@gemulon.postgresql.org) |
| Ejecutar con secretos/token de escritura completos un flujo cuyo disparador (PR de un fork) también controla el código que se ejecuta | GitHub Actions — "pwn request" vía `pull_request_target` | [GitHub Security Lab](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/), [StepSecurity](https://www.stepsecurity.io/blog/github-actions-pwn-request-vulnerability) |
| No fijar permisos mínimos explícitos por job y dejar el token en modo permisivo por defecto | GitHub Actions | [GitHub Changelog 2021](https://github.blog/changelog/2021-04-20-github-actions-control-permissions-for-github_token/) |
| Ejecutar automatismos siempre en modo sistema sin ningún punto donde se fuerce comprobación de permiso del usuario real | Salesforce Apex/Flow, antes de `WITH SECURITY_ENFORCED`/`USER_MODE` | [Salesforce Developer Docs](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html) |
| Delegar `impersonate` sin acotar `resourceNames`, permitiendo hacerse pasar por cualquier identidad incluida cluster-admin | Kubernetes RBAC | [sourcery.ai CKV2-K8S-3](https://www.sourcery.ai/vulnerabilities/ckv2-k8s-3-impersonate-permissions) |
| Confiar un rol cross-account a un `Principal` sin condición de `ExternalId`/`SourceAccount`, permitiendo que un tercero use el ARN de otro cliente para acceder a sus recursos | AWS IAM — confused deputy cross-account y cross-service (CloudTrail→S3) | [AWS IAM docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html) |
| Dejar que una automatización siga corriendo indefinidamente con el token OAuth de un empleado que ya no está, sin revisión ni revocación | Zapier — "ghost logins" | [Reco.ai](https://www.reco.ai/blog/ghost-logins-in-zapier-the-hidden-risk-in-automation-platforms) |
| Confiar en que el reenvío/las reglas de buzón no son un vector de escritura persistente: sobreviven a la rotación de contraseña y se usan para exfiltración/persistencia real | Microsoft 365 / Exchange Online — BEC vía reglas de reenvío (MITRE T1114.003) | [MITRE ATT&CK](https://attack.mitre.org/techniques/T1114/003/), [Red Canary](https://redcanary.com/blog/threat-detection/o365-email-rules-mindmap/) |
| Autorizar en el momento de conectar la cuenta sin volver a acotar en el momento del disparo qué dato/operación concreta puede tocar la plataforma | Plataformas trigger-action tipo IFTTT | [Decoupled-IFTTT, arXiv 1707.00405](https://arxiv.org/pdf/1707.00405) |

---

## Fuentes consultadas

- [Confused deputy problem — Wikipedia](https://en.wikipedia.org/wiki/Confused_deputy_problem)
- [The confused deputy problem — AWS IAM User Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html)
- [Abusing SECURITY DEFINER functions in PostgreSQL — Cybertec](https://www.cybertec-postgresql.com/en/abusing-security-definer-functions/)
- [PostgreSQL schema search_path security and ergonomics — bigsmoke.us](https://blog.bigsmoke.us/2022/11/11/postgresql-schema-search_path)
- [Documentar implicaciones de seguridad de search_path — postgresql.org](https://www.postgresql.org/message-id/E1eqKv8-000697-VI@gemulon.postgresql.org)
- [PWN Request Threat: A Hidden Danger in GitHub Actions — Endor Labs](https://www.endorlabs.com/learn/pwn-request-threat-a-hidden-danger-in-github-actions)
- [GitHub Actions Pwn Request Vulnerability — StepSecurity](https://www.stepsecurity.io/blog/github-actions-pwn-request-vulnerability)
- [Keeping your GitHub Actions and workflows secure Part 1 — GitHub Security Lab](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- [Safer pull_request_target defaults for GitHub Actions checkout — GitHub Changelog](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/)
- [GitHub Updates actions/checkout to Block Common Pwn Request Attack — The Hacker News](https://thehackernews.com/2026/06/github-updates-actionscheckout-to-block.html)
- [GitHub Actions: Control permissions for GITHUB_TOKEN — GitHub Changelog](https://github.blog/changelog/2021-04-20-github-actions-control-permissions-for-github_token/)
- [GITHUB_TOKEN: How It Works and How to Secure It — StepSecurity](https://www.stepsecurity.io/blog/github-token-how-it-works-and-how-to-secure-automatic-github-action-tokens)
- [Apex Security in Salesforce: WITH SECURITY_ENFORCED vs USER_MODE — Medium](https://medium.com/@sanjayece90/apex-security-in-salesforce-part-3-with-security-enforced-vs-user-mode-d0f2cbf9c3d1)
- [Secure Apex Classes — Salesforce Developer Docs](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html)
- [System Mode and User Mode in Salesforce — SFDCPoint](https://www.sfdcpoint.com/salesforce/system-mode-and-user-mode-in-salesforce/)
- [Getting Started with Process Builder — Running a flow in system mode — Automation Champion](https://automationchampion.com/2020/11/21/getting-started-with-process-builder-part-21-running-a-flow-in-system-mode/)
- [Ghost Logins in Zapier — Reco.ai](https://www.reco.ai/blog/ghost-logins-in-zapier-the-hidden-risk-in-automation-platforms)
- [Zapier Vulnerabilities Exposed: Potential Account Takeover Risks — Aviatrix](https://aviatrix.ai/threat-research-center/zapier-bug-chain-account-takeover-2026/)
- [Forward thinking: How adversaries abuse Office 365 email rules — Red Canary](https://redcanary.com/blog/threat-detection/o365-email-rules-mindmap/)
- [Email Collection: Email Forwarding Rule, T1114.003 — MITRE ATT&CK](https://attack.mitre.org/techniques/T1114/003/)
- [Using Microsoft 365 Auditing and Alerts to Monitor Email Forwarding — Practical 365](https://practical365.com/microsoft-365-auditing-bec-attacks/)
- [Active database — Wikipedia](https://en.wikipedia.org/wiki/Active_database)
- [Event condition action — Wikipedia](https://en.wikipedia.org/wiki/Event_condition_action)
- [Least Privilege in Kubernetes Using Impersonation — johnharris.io](https://johnharris.io/2019/08/least-privilege-in-kubernetes-using-impersonation/)
- [Kubernetes RBAC Permissions You Might Not Know About — Gcore](https://gcore.com/blog/k8s-rbac-permissions)
- [Authorization bypass due to impersonate permissions — sourcery.ai CKV2-K8S-3](https://www.sourcery.ai/vulnerabilities/ckv2-k8s-3-impersonate-permissions)
- [Decoupled-IFTTT: Constraining Privilege in Trigger-Action Platforms for the Internet of Things — arXiv 1707.00405](https://arxiv.org/pdf/1707.00405)
