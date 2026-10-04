# Equivalencias del triaje del `06` (2026-10-03)

Tabla de paso del tablero viejo, repartido por origen, al tablero por áreas (regla A.4 del `04`). Cada punto
del tablero viejo tiene exactamente una fila. La copia literal del tablero viejo, de la que sale esta tabla, es
[`pendientes-tablero-viejo-2026-10-03.md`](./pendientes-tablero-viejo-2026-10-03.md) (el `06` del commit `65183f2`).
Cada ficha del tablero nuevo dice de dónde viene en su **Antes:**. Las cerradas en el triaje están, con su
evidencia, en [`pendientes-cerrados-2026-10-03.md`](./pendientes-cerrados-2026-10-03.md).

| # | ID viejo | Sección vieja | Primeras palabras | Prioridad vieja | Destino |
|---|---|---|---|---|---|
| 1 | — | Pendientes (cabecera) | «Fichas abiertas, y todavía algunas cerradas que esperan al triaje…» | — | no es ficha → La regla vive en `04-convenciones.md`, § «A.4 Cómo se lleva el tablero» (regla 6 y 8). La lista de archivos la sustituye el `pendientes-cerrados-<fecha>` del triaje. La frase entre las líneas de «paso 1» y «tres que llevaban Cerrado» está partida («…paso-1.md). y las tres…»). |
| 2 | — | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «De dónde sale. El spec global…» (preámbulo: perfiles, rol, prioridad, | — | no es ficha → Perfiles que aplican: ALL, ACCOUNTS, MARKETPLACE_UGC y MINORS (estos dos antes de SaaS); rol ROLE-01 responsable (B2C), jurisdicción Colombia hoy. Traduce P0→P1, P1→P2, P2→P3 y marca «ya / antes de SaaS»; LEGAL-02 decide qué pasa de un grupo a otro. No se fichan COOK-01…07 ni INFRA-01…06 (viven en `vps1new:/root/docs/06`); SEC-11 remite a un bloque de copias ya sustituido (ver dudas). Vive solo aquí y en el spec global `~/.claude/compliance/`; destino natural: `docs/compliance/inventario.md` (LEGAL-01). |
| 3 | CL-1 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Inventario y reporte de cumplimiento» | — | `LEGAL-01` |
| 4 | CL-2 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «¿Registro abierto o solo por invitación?» | — | `LEGAL-02` |
| 5 | CL-3 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Cabeceras de seguridad también en el HTML, no solo en /api» | — | `LEGAL-03` |
| 6 | CL-4 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Sentry sin datos personales» | — | `LEGAL-04` |
| 7 | CL-5 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Atribución del SRD, de Foundry y de las fuentes» | — | `LEGAL-05` |
| 8 | CL-6 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Páginas legales y aviso en el registro» | — | `LEGAL-06` |
| 9 | CL-7 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Borrar y exportar la cuenta» | — | `LEGAL-07` |
| 10 | CL-8 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Contraseñas y enumeración de cuentas» | — | `LEGAL-08` |
| 11 | CL-9 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «La sesión: token en localStorage, siete días, sin cierre en el servid | — | `LEGAL-09` |
| 12 | CL-10 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Menores de edad» | — | `LEGAL-10` |
| 13 | CL-11 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Plan de incidentes y registro de acciones sensibles» | — | `LEGAL-11` |
| 14 | CL-12 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Las fuentes tipográficas se piden a Google en cada visita» | — | `LEGAL-12` |
| 15 | CL-13 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Cadena de suministro y licencias de dependencias» | — | `LEGAL-13` |
| 16 | CL-14 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Contenido de usuarios: denuncia, retirada y el marco del tablero» | — | `LEGAL-14` |
| 17 | CL-15 | Cumplimiento legal (2026-09-26) — herramienta propia hoy, SaaS después | «Accesibilidad medida con una herramienta» | — | `LEGAL-15` |
| 18 | — | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Para qué sirve esta sección: lo que la adopción…» | — | no es ficha → Ya vive en `04-convenciones.md`, § «A.4 Cómo se lleva el tablero» (último párrafo) y en `superpowers/plans/2026-10-03-adopcion-plantilla.md`. |
| 19 | — | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Lo que decide el autor (2026-10-03)» (tabla) | — | no es ficha → En el tablero nuevo lo sustituye la columna «Decide el autor». |
| 20 | AD-1 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «El CI está en rojo desde el 2026-09-07: lo tumba e2e-browser» | — | `TEST-01` |
| 21 | AD-2 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «fastify llega por un override, no por su rango» | — | `DEP-03` |
| 22 | AD-3 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Cuatro avisos moderados que piden versiones mayores» | — | `DEP-04` |
| 23 | AD-4 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «La prueba de arquitectura no ve import() dinámico ni lo transitivo» | — | `TEST-05` |
| 24 | AD-5 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «01-arquitectura.md pasa de su tope» | — | `DOC-02` |
| 25 | AD-6 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Comprobar que solo web alcanza a la API» | — | `SEG-02` |
| 26 | AD-7 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Los e2e de API en paralelo fallan con ECONNRESET en dos suites» | — | `TEST-02` |
| 27 | AD-8 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «El banco de tareas está a la vista del agente que se mide» | — | `TEST-04` |
| 28 | AD-9 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «SEG — Los registros de tiradas y de sucesos devuelven la fila entera» | — | `SEG-01` |
| 29 | AD-10 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Desplegar el parche de seguridad (espera la aprobación del autor)» | — | `DEP-01` |
| 30 | AD-11 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Nunca se ha probado restaurar una copia de esta base» | — | `DEP-02` |
| 31 | AD-12 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «Ejecutar el triaje del tablero» | — | `DOC-01` |
| 32 | AD-13 | Dejado por la adopción de la plantilla de agentes (2026-10-03) | «¿Se declara el nivel N2?» | — | `TEST-03` |
| 33 | — | Dejado por la auditoría de interfaz (2026-09-19) | «La auditoría (archivada, ~95 hallazgos…) se cruzó contra decisiones.m | — | no es ficha → Ya vive en `_archivo/auditoria-interfaz-2026-09-19.md` y en `superpowers/plans/2026-09-19-correcciones-de-interfaz.md`. |
| 34 | — | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «EscribirFicha.tsx:83 JSDoc «statblock»» | — | `UI-04` |
| 35 | — | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «PanelCarga.tsx:55,70,71 toFixed(0)» | — | `UI-02` |
| 36 | — | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Traza.tsx:314,317 menos ASCII» | — | `UI-02` (parte fundida) |
| 37 | — | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «fechaCorta sin consumidor» | — | `UI-03` |
| 38 | — | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «"Tu iniciativa" cuando el DM tira por otro desde la caja compacta» | — | `UI-05` |
| 39 | 3.1, 3.4, 3.6, 5.1, 5.3/16.3, 6.2, 10.1/10.2, 2.5, 10.5, 2.3, 4.1 (texto), 17.4 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Textos que mienten o se repiten (plan, Tasks 1–4)» | — | cerrada (resuelta) |
| 40 | 8.1, 8.2, 8.6 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Hoja (Task 5)» | — | cerrada (resuelta) |
| 41 | 12.1, 12.2 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Condiciones (Task 6)» | — | cerrada (resuelta) |
| 42 | 17.2/9.4/8.7, 17.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Números y fechas (Task 7)» | — | cerrada (resuelta) |
| 43 | 21.10=10.3, 13.1, 15.1, 15.2, 15.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Cajones con dos cabeceras (Task 8)» | — | cerrada (resuelta) |
| 44 | 15.4, 16.1 (primera mitad), 13.4, 13.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Reordenes (Task 9)» | — | cerrada (resuelta) |
| 45 | 1.5, 4.4, 4.3, 3.2 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Lo que la regla de casa ya exigía (Tasks 10–11)» | — | cerrada (resuelta) |
| 46 | 18.2, 18.3, 10.6, 19.1, 4.5, 4.9, 9.3, 11.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Accesibilidad y comodidad (Tasks 12–13)» | — | cerrada (resuelta) |
| 47 | §20, 20.1 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — hechas el 2 | «Prototipo (Task 14, fuera del repo)» | — | `UI-30` |
| 48 | 12.3/12.4 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Un solo componente de condición (rejilla) y una sola lista de duracio | — | `UI-06` |
| 49 | 6.1/2.1/21.2 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Un solo componente de cambio de PG» | — | `UI-07` |
| 50 | 6.3 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «"De qué tirada sale" lista ~20 tiradas sin quién ni cuándo» | — | `UI-08` |
| 51 | 6.4 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Dados de golpe desde dos sitios de Recursos» | — | `UI-09` |
| 52 | 6.5 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «PG como botón en la banda de la hoja» | — | `UI-10` |
| 53 | 9.1 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Cinco monedas con cinco "Aplicar"» | — | `UI-11` |
| 54 | 16.1 (segunda mitad) | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «"Pasa el tiempo" y "Viajáis" como dos solapas» | — | `UI-12` |
| 55 | 1.6 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Avisos "Alguien se ha sentado a tu mesa" ×4 sin nombre» | — | `MUNDO-04` |
| 56 | 18.6 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Tema y ornamento en la cuenta» | — | `UI-13` |
| 57 | 3.7/11.1 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Dos sucesos por iniciativa tirada por el sistema» | — | `MESA-12` |
| 58 | 3.8/11.2 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Bloque plegable "Iniciativa del asalto 1 — 6 tiradas"» | — | `MESA-13` |
| 59 | 8.4/21.9 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «La hoja de otro jugador como vista de lectura» | — | `HOJA-24` |
| 60 | 4.11 | B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía | «Distintivo de concentración en la tira de turnos» | — | `MESA-14` |
| 61 | 3.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Contador "N de M" al jugador» | — | descartada |
| 62 | 1.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Esconder Hoja/Bolsa al DM» | — | `UI-25` |
| 63 | 1.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Un "Anotar" + chips» | — | cerrada (resuelta) |
| 64 | 2.2 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Quitar Ayudar de la tarjeta» | — | `MESA-16` |
| 65 | 2.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Celda fija para la barra» | — | descartada |
| 66 | 4.2/21.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Economía = turno activo, y una línea "Tú"» | — | `MESA-17` |
| 67 | 4.6/8.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Unificar a disabled» | — | descartada |
| 68 | 5.2/16.2 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «No listar PNJ en Dar PX» | — | cerrada (resuelta) |
| 69 | 7.2/21.8 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Selector de objetivo en el popover» | — | `MESA-18` |
| 70 | 7.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Ventaja/desventaja en la barra» | — | `MESA-19` |
| 71 | 7.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «"No permite tirar el daño"» | — | descartada |
| 72 | 7.6 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «"Nada conecta con la CA"» | — | descartada |
| 73 | 11.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «"Ir a lo último"» | — | descartada |
| 74 | 13.2 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Tres niveles de visibilidad» | — | descartada |
| 75 | 17.1/21.12 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Una sola política de unidades» | — | `UI-26` |
| 76 | 18.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «15 px en la mesa» | — | descartada |
| 77 | 18.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «Cuadrados a 32 px» | — | descartada |
| 78 | 1.1/1.2/7.3/21.1 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «PNJ en la mesa fuera de combate» | — | `MESA-24` |
| 79 | 4.1/21.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejo | «PG del enemigo como estado (Herido…)» | — | `MESA-20` |
| 80 | 4.7/21.6 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «daño en área con salvación a mitad» | — | `MESA-25` |
| 81 | 4.8 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «resistencias y vulnerabilidades al elegir tipo» | — | `MESA-26` |
| 82 | 4.10/21.7 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «deshacer» | — | `MESA-23` |
| 83 | 5.4 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «aviso de fin de combate al jugador con resumen y PX» | — | `MESA-27` |
| 84 | 14.1/14.4/21.11 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «URL para los tres cajones … y reagrupar diez destinos en tres grupos» | — | `UI-27` |
| 85 | 19.2/19.3 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «pantalla de prueba de las 33 animaciones y preferencia global de efec | — | `UI-28` |
| 86 | 9.2 | D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161) | «conversión de monedas y total» | — | `HOJA-25` |
| 87 | — | Dejado por 3A.3 (2026-09-18) | «Lo que la tanda de la barra de acciones…» (P-1 ya no está aquí) | — | no es ficha → Es historia de la tanda. P-1 vive en D-CF-147 y en el archivo. |
| 88 | — | Del prototipo, sin entrar | «Tiradores redimensionables entre las tres columnas» | — | `UI-19` |
| 89 | — | Del prototipo, sin entrar | «Atajos 1–5 … R, Z y Espacio» | — | `UI-20` |
| 90 | — | Del prototipo, sin entrar | «"Repetir" y "Deshacer" en la barra» | — | `MESA-23` (parte fundida) |
| 91 | — | Del prototipo, sin entrar | «La barra a 390 px como hoja inferior» | — | `UI-01` (parte fundida) |
| 92 | — | Del prototipo, sin entrar | «"Lo que el motor está siguiendo"» | — | `MESA-15` |
| 93 | — | Del prototipo, sin entrar | «Bandeja lateral del DM para el daño pendiente» | — | `MESA-10` |
| 94 | — | Del prototipo, sin entrar | «La tarjeta del DM mide 148 px frente a los 92» | — | `UI-21` |
| 95 | — | Del prototipo, sin entrar | «El PNJ del jugador dice "Sin puntos de golpe en la hoja"» | — | `MUNDO-03` |
| 96 | M11 | Del servidor | «Ataque Adicional marca `excedido`» | — | `MESA-01` |
| 97 | — | Del servidor | «`usar()` no expone `excedido`» | — | `MESA-03` |
| 98 | M6 | Del servidor | «`GET …/actions` deriva la hoja dos veces» | — | `MESA-04` |
| 99 | — | Del servidor | «`mecanica` de conjuros y aptitudes solo trae `{ tipo }`» | — | `MESA-05` |
| 100 | M11 | Del servidor | «Un ataque desde la barra es una reacción a veces» | — | `MESA-02` |
| 101 | — | Del tablero | «Integración fina con Just Another VTT» | — | `MESA-28` |
| 102 | M4b | Menores de la revisión final que la ola no cerró (con fichero:línea) | «M4b — la franja "desde aquí te perdiste" no se pinta» | — | `MESA-11` |
| 103 | M7 | Menores de la revisión final que la ola no cerró (con fichero:línea) | «M7 — sin unitaria para `fraseDeMotivos`/`fraseDeRecurso`/`fraseDeMeca | — | `TEST-07` |
| 104 | I2 | Menores de la revisión final que la ola no cerró (con fichero:línea) | «I2, mitad no medida — la banda … entre `lg` (1024) y 1280» | — | `UI-22` |
| 105 | — | Menores de la revisión final que la ola no cerró (con fichero:línea) | «`FichaDeElenco`/`FichaDePnj` conservan el clic de superficie» | — | `UI-18` |
| 106 | — | Dejado por 3A.2 (2026-09-18) | «Fichas que dejaron la revisión final de la rama…» | — | no es ficha → Solo cuenta de dónde salen las fichas. Su sitio es el archivo. |
| 107 | m-4 | API | «`damageType ?? "FORCE"` inventa un tipo» | — | `HOJA-03` |
| 108 | m-6 | API | «Arma mágica sin dos guardas del SRD» | — | `HOJA-04` |
| 109 | m-7 | API | «La concentración solo se registra al encantar» | — | `HOJA-05` |
| 110 | m-9 | API | «`contarTope` y `list()` cuentan poblaciones distintas» | — | `HOJA-06` |
| 111 | m-10 | API | «`addDamageExtra` responde 403 donde `damagePreview` responde 404» | — | `SEG-05` |
| 112 | m-11 | API | «`damagePreviewSchema` con todo opcional, sin discriminante» | — | `MESA-08` |
| 113 | m-12 | API | «`upsert` sin candado en `setEstado`» | — | `HOJA-07` |
| 114 | m-13 | API | «Explorador sembrado a nivel 1, y `PATCH characters/:id { level }` … n | — | `HOJA-02` |
| 115 | I-5 | API | «Semántica de `spell:<key>@N`» | — | `HOJA-10` |
| 116 | — | API | «Castigo divino sin selector de nivel en la web» | — | `MESA-06` |
| 117 | — | API | «El preview de la bandeja reduce solo el daño base» | — | `MESA-07` |
| 118 | — | API | «Marca del cazador, *Shillelagh* y Arma elemental quedan en 3B» | — | `HOJA-11` |
| 119 | — | API | «Perder la concentración no borra el encantamiento» | — | descartada |
| 120 | — | API | «El chip de encantamiento no dice "hasta las…"» | — | `HOJA-08` |
| 121 | — | API | «Encantar solo ofrece las armas del propio personaje» | — | `HOJA-09` |
| 122 | — | API | «El corte de respuestas > 64 KB en este PC» | — | `TEST-02` (parte fundida) |
| 123 | m-3 | Web | «`role="listbox"` con botones» | — | `UI-14` |
| 124 | m-7 | Web | «`<summary>` sin marcador visible» | — | `UI-16` |
| 125 | m-8 | Web | «RTL que faltan (web m-8, c/d/e)» | — | `TEST-08` |
| 126 | m-11 | Web | «La captura `conjuros-1280.png` lleva la cabecera pegajosa superpuesta | — | `TEST-09` |
| 127 | — | Las dos capturas de `e2e-resultados/` | «`conjuros-1280.png` y `conjuros-390.png` seguían sin trackear» | — | no es ficha → Es historia del cierre de 3A.2. Su sitio es el `07` o el archivo. |
| 128 | — | El tablero: Just Another VTT | «Decisión del autor de la madrugada del 2026-09-18…» | — | `MESA-28` (parte fundida) |
| 129 | — | Modo de trabajo desde el 2026-09-18: solo errores (decisión del autor, D-CF-161) | «Con la beta 0.1.0 desplegada…» | — | no es ficha → Es una regla de modo de trabajo. El tablero nuevo puede remitir a D-CF-161. |
| 130 | — | Menores dejados por la revisión final de `cierre/antes-de-3a2` (revisión final 2 | «La ola de arreglos tras `review-final.md`…» | — | no es ficha → Historia. Su sitio es el archivo. |
| 131 | — | Menores dejados por la revisión final de `cierre/antes-de-3a2` (revisión final 2 | Catálogo: «`Collection.tsx` pasa `role="toolbar"`…» | — | `UI-15` |
| 132 | — | Menores dejados por la revisión final de `cierre/antes-de-3a2` (revisión final 2 | Mundo (árbol): «Las raíces plegadas/desplegadas de `DesgloseDelMundo`… | — | `MUNDO-05` |
| 133 | — | Menores dejados por la revisión final de `cierre/antes-de-3a2` (revisión final 2 | Dados: «`id="ventaja-motivo"` está escrito literal» | — | `UI-17` |
| 134 | — | Menores dejados por la revisión final de `cierre/antes-de-3a2` (revisión final 2 | API / reglas de la mesa: «El e2e de concurrencia de `ability-rolls`…» | — | `TEST-12` |
| 135 | — | (blockquote) Cómo se nombra una ficha, y por qué algunas llevan sufijo. | «Este documento fue creciendo por tandas…» | — | no es ficha → Es una regla de nombres. Con IDs por área deja de aplicar a fichas nuevas. Lo que siga valiendo va al archivo o al 04. |
| 136 | D3 | (blockquote) Cómo se nombra una ficha, y por qué algunas llevan sufijo. | «Y una colisión que NO se deshace…: `D3`» | — | no es ficha → Es historia de una colisión. Solo vive en el 06, y debe ir al archivo con la tabla de equivalencias. |
| 137 | — | La copia de seguridad de esta base: copia manual antes de cada cambio en producc | «Para qué sirve esta sección… Decisión del autor del 2026-10-03» | — | no es ficha → Es una regla del autor. La decisión anterior está en `_archivo/pendientes-cerrados-2026-10-03-adopcion.md`. |
| 138 | — | La copia de seguridad de esta base: copia manual antes de cada cambio en producc | «Antes de cualquier cambio en producción … volcado manual» | — | no es ficha → Es una regla de procedimiento. |
| 139 | — | La copia de seguridad de esta base: copia manual antes de cada cambio en producc | «Ya hay una copia automática diaria de esta base, y no se toca» | — | no es ficha → Es un hecho medido que ya vive en el 03. |
| 140 | — | La copia de seguridad de esta base: copia manual antes de cada cambio en producc | «Una restauración de esta base sigue sin probarse» | — | `DEP-02` (parte fundida) |
| 141 | — | Alineado con el código el 2026-09-05, y lo que eso enseñó | «Las 55 secciones se leyeron y se contrastaron…» | — | no es ficha → Es historia y una lección. La «prueba de cuándo» podría pasar al 04 §A.4. |
| 142 | — | (sin título; tras «Alineado con el código el 2026-09-05…») | «Deuda conocida y decisiones abiertas. Cada línea…» | — | no es ficha → Es una regla de cabecera. Puede ir a la cabecera del tablero nuevo o al 04 §A.4. |
| 143 | — | (sin título; tras «Alineado con el código el 2026-09-05…») | «Última revisión: **2026-10-03**…» | — | no es ficha → El tablero nuevo lleva su propia línea. La historia va al archivo. |
| 144 | EM-1 | Dejado por «efectos de mesa» (2026-09-15) — fusionada y desplegada (`334912b`) | «EM-1 cerrada el 2026-09-17 (archivo)» | — | no es ficha → Es una remisión a una ficha ya cerrada. |
| 145 | EM-2 | EM-2 · Crítico, bloqueo y esquiva no tienen efecto | «El crítico vive en el registro…» | — | `MESA-22` |
| 146 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «"El libro entra" convirtió 319 conjuros…» | — | `HOJA-16` |
| 147 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Hasta la ola de arreglos este bloque decía "0 aptitudes…"» | — | no es ficha → Solo en el archivo. |
| 148 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Fuera de A por decisión de autor … 47 actividades de conjuro» | — | no es ficha → ficha HOJA-16. |
| 149 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Hueco de esquema o fórmula rechazada … 19 … 31 … 13» | — | no es ficha → ficha HOJA-16. |
| 150 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «`check.ability` vacío» | — | no es ficha → ficha HOJA-16. |
| 151 | I1 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «Daño en varias partes» | — | no es ficha → ficha HOJA-16. |
| 152 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «`duration.units` sin equivalente (`turn`)…» | — | no es ficha → ficha HOJA-16. |
| 153 | I5 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «`onSave: full`» | — | no es ficha → ficha HOJA-16. |
| 154 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «`save.ability` vacío / expresión sin dados ni bonus» | — | no es ficha → ficha HOJA-16. |
| 155 | C3 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «Consumo con destino a un UUID de compendio» | — | no es ficha → ficha HOJA-16. El arreglo concreto es HOJA-17. |
| 156 | D-CF-105 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «Consumo variable = efecto (hueco C)» | — | no es ficha → ficha HOJA-16. |
| 157 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «Fórmula fuera de las nueve formas de `Origen`» | — | no es ficha → ficha HOJA-16. |
| 158 | I6 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «CD de característica de una clase que no lanza» | — | no es ficha → ficha HOJA-16. El arreglo concreto es HOJA-18. |
| 159 | D-CF-104 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «Dados por tabla de escala entera (hueco A)» | — | no es ficha → ficha HOJA-16. |
| 160 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | Fila «Consumo negativo (reposición, no gasto)» | — | no es ficha → ficha HOJA-16. |
| 161 | I2 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Cuatro aptitudes con `uses.max` que no cabe en `Origen`» | — | no es ficha → ficha HOJA-16. |
| 162 | C3 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Nueve concesiones que `enriquecerClases` NO construye» | — | no es ficha → ficha HOJA-16. La lista la mantiene el código, no el 06. |
| 163 | T3b | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Cinco aptitudes con nombre oficial pero sin prosa en español» | — | no es ficha → ficha HOJA-16. |
| 164 | menor 6 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Cinco `ClassFeature` de `classes.ts` sin fila en el generado» | — | no es ficha → Es un hecho que mantiene el código. → ficha HOJA-16. |
| 165 | D-CF-106 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Once traducciones propias» | — | no es ficha → Vive en `decisiones.md`. |
| 166 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «Cero conjuros o aptitudes sin ningún nombre» | — | no es ficha → Es un hecho del informe generado. |
| 167 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «(1) resolver los UUID de compendio a la clave de la aptitud…» | — | `HOJA-17` |
| 168 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «(2) una forma `cdDeCaracteristica(ability)` en `Origen`…» | — | `HOJA-18` |
| 169 | menor 10 | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «(3) `activacion.type` `special` y `""` caen los dos en `FREE`» | — | `HOJA-19` |
| 170 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «(4) los cuatro nombres corregidos al SRD…» | — | `HOJA-20` |
| 171 | — | Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arregl | «(5) `mezclarScales` expone tablas de escala que no son "un número que | — | `HOJA-21` |
| 172 | — | Dejado por «puerta de efectos» (2026-09-14) — fusionada a `main` el 2026-09-14 y | «Rama `puerta-de-efectos/antes-del-paso-3`; revisión Opus…» | — | no es ficha → Vive ya en el `07` (hito de la puerta de efectos) y en el archivo citado |
| 173 | PE-1 | Dejado por «puerta de efectos» (2026-09-14) — … | «PE-1 · Menores aplazados de las dos revisiones…» — cerrada el 2026-09 | — | cerrada (resuelta) |
| 174 | PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`rollAttack` (DAMAGE) acepta un `attackRollEventId` de otro ataque…» | — | cerrada (resuelta) |
| 175 | PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`pendingDamage.targetCharacterId` viaja en el `ABILITY_ROLL`…» | — | descartada |
| 176 | PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «El dueño de un PNJ jugable con plantilla `DM_ONLY` puede cambiarle lo | — | descartada |
| 177 | PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`answer()` no reintenta al fallar la aplicación del efecto» | — | descartada |
| 178 | PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`XpService.award` bloquea las filas en el orden de entrada…» | — | cerrada (resuelta) |
| 179 | PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «El espacio fino de miles (U+202F) en `frasesDeXp` rompería los `getBy | — | cerrada (resuelta) |
| 180 | PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «La bandeja pide el preview también en tarjetas ya aplicadas…» | — | `MESA-09` |
| 181 | PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «Con la tirada a ciegas, «salvó/falló» de `effectApplied` revela el re | — | cerrada (resuelta) |
| 182 | PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «`GrupoDeRadios` existe tres veces…» | — | cerrada (resuelta) |
| 183 | PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «`DarXp` dentro de `CapaDeCombate` no va con `key` por propuesta…» | — | cerrada (resuelta) |
| 184 | PE-1 (e2e) | Dejado por «puerta de efectos» (2026-09-14) — … | «El bucle «hasta impactar» de `puerta-de-efectos.spec.ts` es probabilí | — | cerrada (resuelta) |
| 185 | PE-1 (e2e) | Dejado por «puerta de efectos» (2026-09-14) — … | «`iniciativa-en-vivo.spec.ts` estaba rojo en `main` desde D-CF-66…» | — | cerrada (resuelta) |
| 186 | PE-2 | Dejado por «puerta de efectos» (2026-09-14) — … | «PE-2 · Un e2e de concurrencia real para `apply-damage` y `POST /xp`»  | — | cerrada (resuelta) |
| 187 | RM-1 / RM-2 | Dejado por «reglas de la mesa» (2026-09-13) — fusionada a `main` el mismo día y  | «Rama `reglas-de-la-mesa/antes-del-paso-3`; revisión Opus…» | — | no es ficha → Solo en el archivo y en decisiones |
| 188 | — | Cierre de la tanda del pulido antes del paso 3 (2026-09-13, Tarea 15) | «Rama `pulido/antes-del-paso-3`, 43 commits…, sin fusionar todavía» | — | no es ficha → Vive en el `07` (hito del pulido) |
| 189 | #1 | Los 24 puntos del anexo (…), uno a uno | «Acciones de la fila del elenco se salen de la tarjeta» | — | cerrada (resuelta) |
| 190 | #2 | Los 24 puntos del anexo (…), uno a uno | «Hoja como «tablas y tarjetas», poco legible» | — | `UI-24` |
| 191 | #3 | Los 24 puntos del anexo (…), uno a uno | «Casillas de los cinco números no simétricas» | — | cerrada (resuelta) |
| 192 | #4 | Los 24 puntos del anexo (…), uno a uno | «PG con «+5 temporales» más ancho que las demás» | — | cerrada (resuelta) |
| 193 | #5 | Los 24 puntos del anexo (…), uno a uno | «Falta reparto/tirada de características al crear personaje» | — | cerrada (resuelta) |
| 194 | #6 | Los 24 puntos del anexo (…), uno a uno | «Sticky del detalle de Objetos se corta bajo la banda fija» | — | cerrada (resuelta) |
| 195 | #7 | Los 24 puntos del anexo (…), uno a uno | «Huecos en Ficha/Rasgos y aptitudes/Personalidad» | — | cerrada (resuelta) |
| 196 | #8 | Los 24 puntos del anexo (…), uno a uno | «*Tearing* al escribir…» | — | cerrada (resuelta) |
| 197 | #9 | Los 24 puntos del anexo (…), uno a uno | «Su color/visibilidad/Archivar-Borrar desordenados» | — | cerrada (resuelta) |
| 198 | #10 | Los 24 puntos del anexo (…), uno a uno | «Formulario de dados poco intuitivo» | — | cerrada (resuelta) |
| 199 | #11 | Los 24 puntos del anexo (…), uno a uno | «El resultado de varios dados da un solo valor» | — | cerrada (resuelta) |
| 200 | #12 | Los 24 puntos del anexo (…), uno a uno | «Los atajos de dado comparten el mismo glifo» | — | cerrada (resuelta) |
| 201 | #13 | Los 24 puntos del anexo (…), uno a uno | «Dados 3D con física de verdad» | — | `UI-29` (parte fundida) |
| 202 | #14 | Los 24 puntos del anexo (…), uno a uno | «Cajón «La mesa tira» mal distribuido» | — | cerrada (resuelta) |
| 203 | #15 | Los 24 puntos del anexo (…), uno a uno | «El hilo no nombra sujeto ni objetivo» | — | cerrada (resuelta) |
| 204 | #16 | Los 24 puntos del anexo (…), uno a uno | «Dados de campaña: reloj y formularios mal repartidos» | — | cerrada (resuelta) |
| 205 | #17 | Los 24 puntos del anexo (…), uno a uno | «Espacios perdidos en varias pantallas» | — | cerrada (resuelta) |
| 206 | #18 | Los 24 puntos del anexo (…), uno a uno | «Salir de la mesa lleva a todas las campañas» | — | cerrada (resuelta) |
| 207 | #19 | Los 24 puntos del anexo (…), uno a uno | «Faltan ajustes del DM antes de la hoja de cada jugador» | — | cerrada (resuelta) |
| 208 | #20 | Los 24 puntos del anexo (…), uno a uno | «Botones de PG temporales del bestiario parecen no hacer nada» | — | cerrada (resuelta) |
| 209 | #21 | Los 24 puntos del anexo (…), uno a uno | «Catálogo de objetos sin filtros» | — | cerrada (resuelta) |
| 210 | #22 | Los 24 puntos del anexo (…), uno a uno | «Botones primarios sin icono» | — | cerrada (resuelta) |
| 211 | #23 | Los 24 puntos del anexo (…), uno a uno | «El grafo del mundo poco intuitivo» | — | cerrada (resuelta) |
| 212 | #24 | Los 24 puntos del anexo (…), uno a uno | «Falta la línea de tiempo comentada» | — | `MUNDO-07` (parte fundida) |
| 213 | — | Los 24 puntos del anexo (…), uno a uno | «Ninguno de los 24 queda sin fila. Los tres que no cierran…» | — | no es ficha → Solo en el archivo |
| 214 | — | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «La revisión final (`0ebdd9f..a69d069`) y las revisiones de cada tarea | — | no es ficha → solo en el archivo |
| 215 | — | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «Hoja: El desnivel de Rasgos, Recursos y Estado queda sin ejercitar…» | — | `TEST-10` |
| 216 | P-2 (2026-09-17) | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «Mundo (árbol): El anillo de vecinos se solapa con 9 o más vecinos…» | — | `UI-23` |
| 217 | P-2 (2026-09-17) | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «Mundo (árbol): «Leer más» se muestra siempre…» | — | `UI-23` (parte fundida) |
| 218 | P-2 (2026-09-17) | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «Mundo (árbol): El chip «Sin hilos» se solapa con el buscador…» | — | `UI-23` (parte fundida) |
| 219 | P-2 (2026-09-17) | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «Mundo (árbol): El editor de hilos queda bajo el pliegue a 1280×800» | — | `UI-23` (parte fundida) |
| 220 | — | Fichas menores dejadas por la revisión final de la rama (2026-09-13) | «Descartado como ruido, con motivo (no entra como ficha)…» | — | no es ficha → Solo en el archivo |
| 221 | — | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión | «El autor aprobó las recomendaciones… (`D-CF-2` a `D-CF-21`)» | — | no es ficha → solo en el archivo |
| 222 | X1, enlaces, J5, I4/M2B-5, I3/M2B-15, `race`/`class`, cambio de cantidad | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión | «~~X1 `RestKind`~~ · ~~enlaces sin rótulo~~ … (hechas)» | — | cerrada (resuelta) |
| 223 | S4 · M2B-4 | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión | «S4 rasgos raciales · M2B-4 cargas — D-CF-20/21: por el conversor de F | — | remisión: `HOJA-13` (S4) y `HOJA-14` (M2B-4) |
| 224 | R1, D8, P3, H7, E0, P6 | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión | «R1 límite por IP · D8 correo · P3 archivar en la mesa · H7 rearmar ·  | — | cerrada (resuelta) |
| 225 | P2 | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión | «P2 mesa a 390 px — Aplazada por el autor el 2026-09-11 (D-CF-26)» | P2 | `UI-01` (parte fundida) |
| 226 | — | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión | «Las fichas siguen en su sitio de abajo hasta que su commit las archiv | — | no es ficha → solo en el archivo |
| 227 | — | (aviso suelto) | «El orden de las secciones NO es fiable…» | — | no es ficha → solo en el archivo |
| 228 | — | Dejado por la tarea 11 del pulido (C4, #15), ronda de revisión (2026-09-13) — ce | «e2e: un dueño citando un PNJ `DM_ONLY` como `sourceCharacterId` es 40 | — | cerrada (resuelta) |
| 229 | HP-1, HP-3…HP-8, HP-9a, HP-10 | Dejado por la hoja a página completa (2026-09-12) | «Lo que las revisiones de las diez tareas de la rama `hoja/pagina-comp | — | no es ficha → Solo en el archivo |
| 230 | HP-9b | Dejado por la hoja a página completa (2026-09-12) | «Catálogo SRD +N y descanso corto — pendiente, espera al paso 3» | — | `HOJA-15` |
| 231 | HP-9b | HP-9b · Catálogo SRD +N y descanso corto — medición, estimación y alcance (2026- | «Medido. La sintonización es hoy solo un marcador de estado…» | — | no es ficha → Va con la ficha de HP-9b, citando por nombre |
| 232 | #24 | El mapa de historia del DM — aplazado por el autor (2026-09-12); el #23 se cerró | «El #23 del anexo está cerrado… Lo que queda abierto es el mapa de his | — | `MUNDO-07` |
| 233 | #13 | #13 · Dados en 3D con física de verdad (aplazado, de la nota de Task 0) | «Coste investigado, no se hace…» | — | `UI-29` |
| 234 | — | Tablero: sandbox del iframe (2026-09-12, ronda de revisión de la Tarea 6) | «`MarcoDelTablero.tsx` monta el `<iframe>` de PlanarAlly sin `sandbox` | — | `SEG-03` |
| 235 | P1 | P1 · Un mago no tiene conjuros — cerrada el 2026-09-18 por 3A.2 | «Movida entera a `_archivo/pendientes-cerrados-2026-09-18-3a2.md`…» | P1 | cerrada (resuelta) |
| 236 | P2 | P2 · La mesa a 390 px reparte sus tres columnas a lo ancho (2026-09-05, paseo de | «Aplazada por el autor el 2026-09-11 (D-CF-26)…» | P2 | `UI-01` |
| 237 | P2 | idem (subsección «Ya no es una sospecha: está medida (2026-09-07)») | «De paso quedó localizada una trampa real e independiente: … `grid-row | P2 | `UI-01` (parte fundida) |
| 238 | — | La pantalla de juego con mapa — alcance nuevo, sin decidir (2026-09-02) | «Lo que el autor quiere, en sus palabras: «yo no quiero un juego plano | — | `MESA-29` |
| 239 | — | Dejado por la segunda tanda de la ronda de interfaz (2026-09-02, madrugada) | (sin contenido) | — | no es ficha → solo en el archivo |
| 240 | — | Huecos abiertos de la fase 2A (2026-09-02) | «Aparecieron al completar el plan y no están resueltos…» | — | no es ficha → solo en el archivo |
| 241 | H10 | Huecos abiertos de la fase 2A (2026-09-02) | «Las formas de área (cono, esfera, línea, cubo, cilindro)…» | — | `MESA-30` |
| 242 | — | Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02 | «Revisado por dos agentes el mismo día. Las fichas marcadas [revisión] | — | no es ficha → solo en el archivo |
| 243 | S2 | Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02 | «De cada aptitud de clase se transcribió el nombre y el nivel, no su t | — | cerrada (resuelta) |
| 244 | S4 | Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02 | «Los rasgos raciales sin efecto numérico se listan, pero no hacen nada | — | `HOJA-13` |
| 245 | S6 | Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02 | «La mejora de característica de los niveles de `asiLevels` no se model | — | `HOJA-01` |
| 246 | S10 | Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02 | «[revisión] El nivel y el nombre de las ~203 aptitudes de clase no est | — | `TEST-11` |
| 247 | — | Deuda de la fase 2B — objetos, inventario y equipo (2026-09-03) | «Lo que quedó abierto al cerrar 2B…» | — | no es ficha → solo en el archivo |
| 248 | I7 | Deuda de la fase 2B — objetos, inventario y equipo (2026-09-03) | «El tabú del druida se perdió al pasar las competencias a claves» | — | `HOJA-22` |
| 249 | — | Deuda de la fase 2B — objetos, inventario y equipo (2026-09-03) | «Lo que la revisión de 2B encontró y se arregló el mismo día…» | — | no es ficha → Solo en el archivo |
| 250 | — (remite a «P4 — Limpieza») | Deuda de la fase 2B — objetos, inventario y equipo (2026-09-03) | «Y una deuda que 2B pagó en vez de heredar: el visor de un personaje…» | — | `SEG-04` |
| 251 | — | Lo que dejó abierto la auditoría de mecánica de 2B (2026-09-03, noche) | «Un intermitente que no era una prueba frágil… abrazo mortal de Postgr | — | no es ficha → Solo en el archivo y el informe |
| 252 | — | Lo que dejó abierto la auditoría de mecánica de 2B (2026-09-03, noche) | «Dos frentes con su refutador, sobre el camino de una mesa real…» | — | no es ficha → solo en el archivo |
| 253 | M2B-4 | Lo que dejó abierto la auditoría de mecánica de 2B (2026-09-03, noche) | «Quedan las cargas (una varita de siete usos que se repone en el desca | — | `HOJA-14` |
| 254 | — | Iluminación y visión (pregunta del autor, 2026-09-02) | «Razonado en distancias y movimiento, §12 bis. Cerrado hoy: los sentid | — | no es ficha → Intro e historia. El razonamiento vive en `superpowers/specs/2026-09-02-distancias-y-movimiento-design.md` (§12 bis). |
| 255 | L1 | Iluminación y visión (pregunta del autor, 2026-09-02) | «Niveles de luz (brillante / tenue / oscuridad) y fuentes de luz» | — | `MESA-31` |
| 256 | L2 | Iluminación y visión (pregunta del autor, 2026-09-02) | «Arco y radio de visión, y que el DM restrinja la visión de alguien» | — | `MESA-32` |
| 257 | L4 | Iluminación y visión (pregunta del autor, 2026-09-02) | «La visión NO es `canView`, y esto es una invariante» | — | no es ficha → Invariante de diseño para cuando llegue el tablero: lo que el jugador no ve en el mapa se filtra en el servidor con `canView`, nunca con CSS. |
| 258 | — | Encontrado al escribir 2A.13 (2026-09-02) | (tabla vacía) | — | no es ficha → Sección vacía. |
| 259 | — | Huecos de mecánica declarados a mitad de 2A (2026-09-02) | «Salieron de un repaso pedido por el autor… Estos cuatro quedan abiert | — | no es ficha → Sección vacía, con una intro que miente porque promete cuatro fichas abiertas. |
| 260 | — | Pedido por el autor el 2026-09-02, colocado — antes de 2A | «Razonado en el análisis de las seis peticiones… Los puntos 4 (modales | — | no es ficha → Intro de la sección; solo queda MUNDO-06. |
| 261 | A2 | Pedido por el autor el 2026-09-02, colocado — antes de 2A | «Invitar por correo a un usuario que ya tiene cuenta — aplazada por el | — | `MUNDO-06` |
| 262 | — | Despliegue — abierto tras escribir la pila (2026-09-02) | «Hay servidor (`vps1new`), dominio… se cierran D1, D2, D4 y D6» (tabla | — | no es ficha → Sección vacía; la historia está en `07-historial.md` y `03-despliegue.md`. |
| 263 | — | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Contraste hecho a mano sobre el commit `70b353c`… El informe completo | — | no es ficha → Intro de la pasada. La frase «lo que falta es casi todo movimiento» ya se remidió en el propio texto el 2026-09-08. |
| 264 | E1 | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Sesiones y Personajes siguen sin buscador ni filtro, y no hay búsqued | — | `MUNDO-01` |
| 265 | — | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Siete de las doce filas de esta tabla se archivaron el 2026-09-08 por | — | no es ficha → Nota de archivo y lección sobre las citas de línea. |
| 266 | E1 | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Buscar sigue siendo de un solo tipo (E1)» | — | `MUNDO-01` (parte fundida) |
| 267 | — | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «D6 y D7 ya no son decisión pendiente» | — | no es ficha → `ownerId` es quien creó la campaña; la autoridad es el rol; `isAdmin` se concede a mano. |
| 268 | — | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Lo que este bloque decía y ya no dice» | — | no es ficha → Las cuatro afirmaciones falsas se conservan en el archivo. |
| 269 | D8 (despliegue) | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «La recuperación de contraseña no es un hueco simple… su ficha viva es | — | cerrada (resuelta) |
| 270 | — | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Coste declarado, para poder decidir sin volver a mirar el código» | — | no es ficha → Nada nuevo; remite a MUNDO-01. |
| 271 | — | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «Tres cosas que conviene no leer mal» (ninguna prueba iba a encontrar  | — | no es ficha → Lecciones sobre puntos ciegos y fichas caducadas. |
| 272 | — | El despliegue de la fase 2, y cómo se verifica (decidido 2026-09-03) | «No se despliega por bloques… una partida de prueba real» (dos cuentas | — | no es ficha → Regla de despliegue y verificación de la fase 2. |
| 273 | — | El despliegue de la fase 2, y cómo se verifica (decidido 2026-09-03) | «Y no bloquea nada de datos, por decisión del autor (2026-09-03)» | — | no es ficha → Cita del autor que era cierta el 2026-09-03 y ya no lo es. |
| 274 | — | El despliegue de la fase 2, y cómo se verifica (decidido 2026-09-03) | «2026-10-03: ese día llegó. Hay gente usando la plataforma» | — | no es ficha → Copia manual antes de cada cambio en producción. |
| 275 | — | P2 — Ruta de mejora del nivel | «Linting sin información de tipos» | P2 | `TEST-06` |
| 276 | — | P2 — Ruta de mejora del nivel | «Sin umbral de cobertura (N2) ni mutación (N3)» | P2 | `TEST-03` (parte fundida) |
| 277 | — | P2 — Ruta de mejora del nivel | «La tercera línea de esta sección se archivó el 2026-09-08» | P2 | no es ficha → Nota de archivo. |
| 278 | — | P3 — Correcciones funcionales conocidas | «Ninguna es un agujero de lectura… todas degradan el comportamiento:»  | P3 | no es ficha → Sección vacía. |
| 279 | — | P4 — Limpieza | (sección vacía; destino de la remisión de `viewerFor`) | P4 | no es ficha → Sección vacía. La deuda de `viewerFor` está medida y vive en la fila del bloque anterior. |
| 280 | — | Decisiones abiertas | «Las tres que había aquí eran falsas y se corrigieron el 2026-09-03» | — | no es ficha → Nota de corrección. |
| 281 | — | Decisiones abiertas | «No se empieza la fase siguiente hasta usar la anterior en una sesión  | — | no es ficha → Regla de proceso. En la práctica la sustituye D-CF-161. |
| 282 | — | Decisiones abiertas | «La mesa de verdad no juega hasta que haya tiempo real (fase 4)» | — | no es ficha → Regla del 2026-09-03 que ya no describe la realidad. |
| 283 | — | Decisiones abiertas | «Las fases 4 y 5 (tiempo real, 3D/IA) siguen sin plan» | — | no es ficha → Estado de alcance, ya decidido. |
| 284 | — | Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron | «Tres auditorías cruzaron toda la documentación… Tres patrones se repi | — | no es ficha → Lecciones de proceso. |
| 285 | N4 | Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron | «La precisada es `N4`, que sigue abierta: el nombre de la regla viaja  | — | cerrada (resuelta) |
| 286 | — | Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron | «Dos filas de esta tabla se archivaron… (U8-glifos, D9)… añade un cuar | — | no es ficha → Una ficha con el arreglo descrito no se relee el día que se entrega. |
| 287 | S11 | Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron | «Los tipos de respuesta del motor y del previo de nivel viven dos vece | — | `HOJA-23` |
| 288 | — | Huecos de mecánica — lo que falta para jugar de verdad | «Ordenados por lo que duele en la mesa. Ninguno es de la fase 3» | — | no es ficha → Intro de la subsección. |
| 289 | L5 | Huecos de mecánica — lo que falta para jugar de verdad | «El DM no puede declarar «este personaje no ve»» | — | `HOJA-26` |
| 290 | — | Huecos de mecánica — lo que falta para jugar de verdad | «Y el límite que conviene escribir en voz alta… la aplicación no model | — | no es ficha → Frontera de diseño, no hueco. |
| 291 | — | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | «Un agente jugó una partida entera… El tramposo no encontró ni un huec | — | no es ficha → Resultado de la mesa de agentes. |
| 292 | — | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | (tabla «Qué encontró el DM / Estado» vacía) | — | no es ficha → Sección vacía. |
| 293 | — | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | «El veredicto del DM, sin diplomacia» | — | no es ficha → Historia. |
| 294 | J5 | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | «Del registro sigue faltando el suceso de muerte, que es la ficha `J5` | — | cerrada (resuelta) |
| 295 | — | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | «Y los tres identificadores que cita no existen en este documento: M13 | — | no es ficha → Lección. |
| 296 | — | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | «`L2-traza-daño` se archivó el 2026-09-08, cerrada por las dos mitades | — | no es ficha → Nota de archivo, con una cita de línea desplazada. |
| 297 | — | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real | «La sala de espera (tarea 8, 2026-09-05) abrió aquí dos fichas que la  | — | no es ficha → Lección y decisiones ya tomadas. |
| 298 | A11-lanzado-cuenta-como-cuerpo-a-cuerpo | A11-lanzado-cuenta-como-cuerpo-a-cuerpo — el bono de daño de la Furia se cuela e | «Abierto, menor, fuera de la frontera de A11. `bonoDeFuria`…» | — | `HOJA-12` |
| 299 | P2-9 | P2-9 · No hay ninguna puerta para ceder un PNJ a un jugador (2026-09-07) | «DECIDIDO por el autor el 2026-09-07: sí se quiere, pero se diseña DEN | P2 | `MUNDO-02` |
| 300 | — | P2-9 · No hay ninguna puerta para ceder un PNJ a un jugador (2026-09-07) | «Abierto, encontrado al escribir el e2e de P2-3… ese estado no se pued | — | `MUNDO-02` (parte fundida) |
| 301 | PM-1 | PM-1 · `entityId` en respuestas de mutación no pasa por la redacción (2026-09-14 | «Cerrada. Decisión del autor: no redactar las quince respuestas de mut | — | cerrada (resuelta) |
| 302 | PM-1 | PM-1 · `entityId` en respuestas de mutación no pasa por la redacción (2026-09-14 | «Abierto, declarado al escribir el plan (E-PM-10)… Las respuestas de M | — | cerrada (resuelta) |
| 303 | PM-2 | PM-2 · El nombre de un PNJ en el hilo no enlaza a su ficha del mundo (2026-09-14 | «Abierto, declarado al escribir el plan (E-PM-12). Desde esta tanda, e | — | `MESA-21` |
| 304 | T3 | T3 · Revelar un grupo entero desde el orden de turnos, de un solo clic (2026-09- | «Cerrada. Decisión del autor: «Revelar» junto a «oculto» en `TiraDeIni | — | cerrada (resuelta) |
| 305 | T3 | T3 · Revelar un grupo entero desde el orden de turnos, de un solo clic (2026-09- | «Abierto, sin decisión de producto (histórico, ya resuelto arriba)» | — | cerrada (resuelta) |
