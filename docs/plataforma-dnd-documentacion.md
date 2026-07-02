# Plataforma integral para campañas de D&D

## Visión del producto

La idea central es construir una plataforma web para campañas de Dungeons & Dragons que sirva tanto a Dungeon Masters como a jugadores, integrando gestión de campaña, hojas de personaje, automatización de reglas, sesiones, mapas y una capa visual avanzada opcional con 3D e inteligencia artificial.[cite:27][cite:28][cite:36]

El posicionamiento más fuerte no es competir desde el primer día con un VTT total, sino ofrecer un entorno unificado donde la narrativa, la progresión mecánica del personaje y la colaboración del grupo vivan en un solo lugar.[cite:27][cite:36][cite:46]

La oportunidad está validada por varias categorías existentes: herramientas de worldbuilding y campaign management como Kanka y World Anvil, constructores de personaje como D&D Beyond, y productos centrados en representación visual como Hero Forge.[cite:27][cite:36][cite:46][cite:38]

## Objetivos del producto

El producto debe resolver tres problemas principales. Primero, organizar campañas de manera clara con sesiones, NPCs, lugares, quests, mapas y secretos por rol.[cite:27][cite:36] Segundo, permitir que cada jugador gestione su personaje con una hoja viva que recalcula estadísticas, recursos y progresión según reglas definidas por el sistema.[cite:46][cite:40][cite:37] Tercero, abrir una evolución futura hacia representación visual avanzada mediante avatares, miniaturas y modelos 3D asistidos por IA.[cite:38][cite:45][cite:42]

Los objetivos de negocio deben orientarse a una estrategia progresiva: utilidad personal inmediata para una mesa real, validación con amigos y grupos pequeños, lanzamiento a comunidad cerrada, y monetización posterior mediante límites, funciones premium y assets avanzados.[cite:27][cite:35]

## Propuesta de valor

La propuesta de valor recomendada es: "tu campaña, tus personajes y tus reglas en un solo lugar".[cite:27][cite:36][cite:46]

Para el Dungeon Master, la plataforma debe centralizar planificación, preparación de sesiones, encounter notes, mapas, contenido privado y seguimiento de historia.[cite:28][cite:36] Para los jugadores, debe simplificar creación de personaje, consulta de hoja, progreso, inventario, recursos, hechizos y acceso a la información relevante sin depender siempre del DM.[cite:46][cite:40]

La diferenciación aparece cuando ambos lados se encuentran en un mismo modelo de datos: una campaña contiene personajes jugables, los personajes tienen estado mecánico vivo, y ese estado se conecta con sesiones, mapas, eventos y recursos narrativos.[cite:36][cite:46]

## Público objetivo

El público principal son grupos de juego pequeños o medianos que necesitan una herramienta cómoda para jugar campañas persistentes de D&D, especialmente campañas online o híbridas.[cite:28][cite:36]

El público secundario son Dungeon Masters que preparan campañas largas y desean centralizar worldbuilding, notas y mecánicas en un solo producto, así como jugadores que valoran personalización visual de sus personajes.[cite:27][cite:36][cite:38]

En una etapa posterior, el producto también podría atraer masters que monetizan sus mesas y necesitan un flujo más profesional con plantillas, campañas reutilizables, módulos y compendios distribuibles.[cite:35]

## Alcance funcional

### Módulo de campañas

Cada campaña debe incluir metadatos, descripción, sistema de juego soportado, estado, lista de jugadores, calendario, sesiones y repositorio de entidades relacionadas.[cite:27][cite:36]

Funciones clave:

- Crear y editar campañas.
- Invitar jugadores por enlace o email.
- Definir roles y permisos.
- Gestionar sesiones futuras y pasadas.
- Mantener bitácora, recap y objetivos abiertos.
- Separar contenido público, privado para DM y privado por personaje.[cite:27][cite:36]

### Módulo de worldbuilding

Debe permitir modelar entidades narrativas enlazadas entre sí, siguiendo una estructura tipo wiki conectada.[cite:27][cite:36]

Entidades recomendadas:

- NPCs.
- Lugares.
- Facciones.
- Objetos.
- Misiones.
- Eventos.
- Cronologías.
- Documentos y handouts.

Cada entidad debe soportar relaciones, etiquetas, imágenes, archivos, comentarios y permisos de visibilidad.[cite:27][cite:36]

### Módulo de personajes

Cada jugador debe poder crear su personaje y asociarlo a una campaña concreta.[cite:46]

Funciones mínimas:

- Crear personaje desde cero o desde plantilla.
- Elegir raza, clase, subclase, background y alignment.
- Cargar atributos iniciales por distintos métodos.
- Gestionar inventario, hechizos, skills y recursos.
- Vincular retrato, biografía y notas personales.
- Marcar personaje como público, privado o visible solo al DM y al dueño.

La hoja de personaje debe recalcular automáticamente estadísticas derivadas como modificadores, proficiency bonus, armor class, hit points, spell save DC, attack bonus y otros valores del sistema soportado.[cite:46][cite:40][cite:37]

### Motor de reglas

Este es uno de los componentes más importantes del producto. La lógica de reglas no debe quedar mezclada con la interfaz, sino modelada como un motor independiente orientado a datos.[cite:46][cite:40][cite:37]

Capas recomendadas:

- Reglas base del sistema.
- Fuentes de modificación permanentes, por ejemplo raza, clase, feats o items.
- Fuentes de modificación temporales, por ejemplo buffs, heridas, condiciones o efectos mágicos.
- Overrides de homebrew por campaña.

Capacidades del motor:

- Recalcular valores derivados.
- Validar prerequisitos.
- Aplicar progresión por nivel.
- Resolver fórmulas y stacks de modificadores.
- Emitir eventos de cambio para actualizar UI y auditoría.

### Módulo de sesiones

El producto debe permitir planificar y registrar sesiones con utilidad real antes, durante y después de jugar.[cite:28][cite:36]

Funciones sugeridas:

- Agenda de sesión.
- Resumen anterior.
- Notas del DM.
- Objetivos activos.
- Registro de eventos importantes.
- XP, milestones o progreso.
- Loot obtenido.
- Decisiones del grupo.
- Tareas pendientes.

### Módulo de mapas

La primera versión debería comenzar con mapas 2D interactivos, pines y capas, porque entregan valor más rápido y tienen menor complejidad que una escena 3D completa.[cite:28][cite:36]

Funciones v1:

- Subir mapa.
- Añadir marcadores.
- Enlazar marcadores con lugares, NPCs o quests.
- Definir niebla de guerra simple.
- Mostrar distintas capas para DM y jugadores.

### Módulo social y colaborativo

La experiencia debe funcionar para grupo, no solo como libreta personal del DM.[cite:27][cite:36][cite:46]

Capacidades deseables:

- Comentarios por sesión o entidad.
- Reacciones o confirmaciones ligeras.
- Feed de actividad.
- Notificaciones de cambios importantes.
- Registro de presencia o asistencia.

## Funcionalidades avanzadas

### Representación visual del personaje

Una evolución lógica es ofrecer un creador visual de personajes, similar en espíritu al atractivo de personalización que ha hecho popular a Hero Forge.[cite:38]

Esto puede comenzar con:

- Avatar 2D o busto ilustrado.
- Miniatura estilizada en 3D.
- Configuración de rasgos, ropa, colores y accesorios.
- Export o uso interno dentro de la campaña.

### Imagen a personaje 3D con IA

La función más ambiciosa consiste en permitir que un jugador suba una imagen de referencia y obtenga un modelo 3D aproximado y editable.[cite:45][cite:42]

Flujo recomendado:

1. El usuario sube una o varias imágenes.
2. Un servicio de IA genera una malla aproximada o un avatar base.[cite:45][cite:42]
3. La plataforma convierte el resultado a un formato editable y simplificado para web.
4. El usuario corrige proporciones, accesorios y materiales.
5. El resultado final se usa como representación del personaje en la campaña.

Esta capacidad debe considerarse premium y de fase tardía, porque implica retos de costos, tiempos de procesamiento, calidad inconsistente y edición posterior obligatoria.[cite:45][cite:42]

## Estrategia de producto por fases

| Fase | Alcance principal | Resultado esperado |
|---|---|---|
| Fase 1 | Campañas, sesiones, NPCs, lugares, quests, personajes básicos | Producto útil para una mesa real [cite:27][cite:36] |
| Fase 2 | Hoja de personaje viva y motor de reglas | Diferenciación funcional fuerte [cite:46][cite:40][cite:37] |
| Fase 3 | Mapas 2D, pines, niebla, vistas por rol | Mayor uso durante juego [cite:28][cite:36] |
| Fase 4 | Creador visual de avatar o miniatura | Más engagement para jugadores [cite:38] |
| Fase 5 | Imagen a 3D editable con IA | Función premium avanzada [cite:45][cite:42] |

## Stack tecnológico recomendado

La recomendación principal es usar un stack modular, tipado y muy cómodo para evolución de reglas complejas y producto SaaS multiusuario. Ese stack debe privilegiar productividad, mantenibilidad y capacidad de iteración rápida, no solo moda tecnológica.

### Backend

- **Node.js + TypeScript** como base del runtime y del lenguaje compartido.
- **NestJS** como framework principal por modularidad, DI, testing y separación por dominios.
- **Fastify** como adapter HTTP por rendimiento y bajo overhead.
- **Zod** o validación equivalente para contratos fuertes de entrada y salida.
- **BullMQ** para colas de trabajos asíncronos, especialmente IA, procesamiento de imágenes y tareas pesadas.
- **WebSocket Gateway** para actualizaciones en tiempo real de hojas, sesiones, presencia y mapas.

Justificación: el producto tendrá dominios claros, reglas complejas, eventos, permisos y procesos asíncronos; NestJS encaja muy bien con este tipo de arquitectura. Además, el stack coincide con la experiencia previa del entorno objetivo, reduciendo fricción de construcción y mantenimiento.[cite:18][cite:24]

### Frontend

Hay dos caminos válidos, pero uno es más recomendable para este producto.

**Camino recomendado:**

- **React + TypeScript** para el cliente principal.
- **Vite** para desarrollo rápido.
- **TanStack Query** para data fetching y caché.
- **Zustand** para estado local de UI y editores.
- **Tailwind CSS** o CSS modular con design system propio.
- **React Hook Form** para formularios complejos.

Motivo: el producto tendrá UI muy interactiva, paneles, edición de hojas, mapas, drag and drop, sidebars, modales y componentes de alta frecuencia. Ese tipo de interfaz suele ser más cómoda de sostener en una SPA moderna que en SSR tradicional.

**Camino alterno alineado con preferencias actuales:**

- NestJS + Fastify + HBS para páginas server-rendered.
- Alpine.js para interacciones pequeñas.

Ese camino puede servir para un prototipo inicial administrativo o una demo cerrada, pero para el producto final multiusuario e interactivo será más robusto un frontend dedicado. Esto debe considerarse como concesión práctica frente al patrón preferido en proyectos web más sencillos.[cite:18]

### Base de datos

Se recomienda una combinación principal relacional con apoyo documental opcional.

- **PostgreSQL** como base transaccional principal.
- **Prisma** o **Drizzle ORM** como capa de acceso tipada.
- **Redis** para caché, presencia, rate limiting, colas y sesiones efímeras.
- **S3-compatible object storage** para imágenes, mapas, handouts, retratos y assets.

Justificación:

- El dominio tiene muchas relaciones entre entidades: campañas, personajes, sesiones, jugadores, permisos y vínculos narrativos.
- PostgreSQL resuelve bien integridad, permisos, joins, búsquedas y reporting.
- Redis ayuda con tiempo real y procesos de background.

Opcionalmente, si el motor de reglas o los documentos narrativos requieren estructuras flexibles, se pueden usar columnas JSONB dentro de PostgreSQL antes de introducir otra base adicional.

### Tiempo real

- **WebSockets** para presencia, edición concurrente ligera, actividad de sesión y cambios de hoja.
- **Server-sent events** solo para casos simples de streaming informativo.

### 3D y gráficos

- **Three.js** para el módulo 3D futuro, especialmente representación de personaje, miniatura, escenas ligeras y editor visual.[cite:25]
- **React Three Fiber** si el frontend termina en React y se desea una capa declarativa sobre Three.js.
- **GLTF/GLB** como formato estándar de assets 3D para web.

Three.js es apropiado para una capa visual o un editor limitado de escena en navegador, pero no debe ser el centro del MVP del producto.[cite:25]

### IA y media pipeline

- Servicio separado para tareas de IA, idealmente desacoplado del backend principal.
- Workers para generación de retratos, clasificación de assets y transformación image-to-3D.
- Pipeline de aprobación manual del usuario antes de persistir resultados finales.

Servicios posibles a evaluar en el futuro:

- Generación de retratos o concept art.
- Resumen automático de sesiones.
- Extracción de entidades desde notas.
- Conversión de imagen a modelo 3D aproximado.[cite:45][cite:42]

### Infraestructura

- **Docker** para entornos consistentes.
- **Docker Compose** en desarrollo.
- **Traefik** o **Nginx** como reverse proxy si el despliegue es propio.
- **Railway** para etapas tempranas o staging simple, por afinidad operativa del entorno.[cite:24]
- **Contabo** o VPS equivalente para producción self-hosted con control de costos, si se busca optimizar gasto.[cite:24]
- **GitHub Actions** para CI/CD.
- **Sentry** para observabilidad de errores.
- **OpenTelemetry + Grafana/Prometheus** si se desea telemetría más seria a medida que escale.

## Arquitectura recomendada

### Enfoque general

La recomendación es una arquitectura modular monolítica al inicio. Un monolito modular permite avanzar rápido, mantener coherencia de dominio y evitar sobrecostos prematuros de microservicios.

Dominios sugeridos:

- Auth.
- Users.
- Campaigns.
- Characters.
- Rules.
- Sessions.
- Maps.
- Worldbuilding.
- Assets.
- Billing.
- Notifications.
- AI.

Cada dominio debe tener módulos, servicios, repositorios, DTOs, eventos y tests propios.

### Eventos internos

Conviene usar un patrón basado en eventos de dominio para desacoplar comportamiento.

Ejemplos:

- `character.level_up`
- `character.stats_recomputed`
- `session.closed`
- `map.marker_revealed`
- `asset.generated`
- `campaign.member_joined`

Este enfoque simplifica auditoría, notificaciones y procesos secundarios sin contaminar la lógica principal.

### Permisos y visibilidad

El sistema debe modelar la visibilidad como parte central del dominio, no como añadido tardío.

Niveles sugeridos:

- Público dentro de la campaña.
- Visible solo a jugadores específicos.
- Visible solo al dueño y DM.
- Visible solo al DM.
- Visible por rol administrativo.

## Modelo de datos inicial

### Entidades principales

| Entidad | Descripción |
|---|---|
| User | Cuenta base del sistema |
| Campaign | Espacio principal de juego |
| CampaignMember | Relación usuario-campaña con rol |
| Character | Personaje jugable o NPC avanzado |
| CharacterSheet | Estado mecánico del personaje |
| CharacterFeature | Raza, clase, subclase, feat, trait o efecto |
| Session | Sesión planificada o registrada |
| Location | Lugar del mundo |
| Quest | Misión o arco |
| Faction | Organización o grupo |
| TimelineEvent | Evento cronológico |
| Map | Recurso cartográfico |
| MapMarker | Punto interactivo dentro de un mapa |
| Asset | Archivo multimedia |
| Note | Nota estructurada |
| RuleSet | Conjunto de reglas soportado |
| BillingSubscription | Estado de monetización |

### Consideraciones de modelado

- `CharacterSheet` debe tener parte estructurada y parte flexible.
- Los modificadores conviene modelarlos como efectos composables.
- Los permisos deben poder aplicarse a nivel de entidad.
- El contenido narrativo puede vivir con JSONB para campos flexibles antes de sobrediseñar.

## Diseño del motor de reglas

El motor de reglas merece su propio subsistema.

### Principios

- Data-driven en lugar de lógica hardcodeada por todos lados.
- Determinista y auditable.
- Capaz de recalcular desde estado base.
- Extensible para homebrew.
- Con versionado por ruleset.

### Flujo sugerido

1. Cargar estado base del personaje.
2. Cargar fuentes activas de modificación.
3. Resolver prerequisitos y conflictos.
4. Ejecutar pipeline de cálculo por etapas.
5. Persistir snapshot derivado.
6. Emitir cambios para UI, logs y analytics.

### Salidas del motor

- Hoja calculada.
- Lista de advertencias o inconsistencias.
- Historial de por qué se calculó cada valor.
- Diff respecto al snapshot anterior.

Ese último punto es especialmente valioso para depurar reglas y explicar al jugador de dónde sale cada estadística.

## UX y experiencia de producto

### Experiencia del DM

El DM debe sentir que prepara y corre una campaña sin saltar entre cinco herramientas distintas.[cite:28][cite:36]

Pantallas clave:

- Dashboard de campaña.
- Vista de sesión.
- Panel de entidades narrativas.
- Mapa con capas y secretos.
- Vista rápida de personajes de jugadores.

### Experiencia del jugador

El jugador debe poder entrar, ver su campaña, abrir su hoja, consultar equipo, hechizos, notas, progreso y recursos relevantes de forma inmediata.[cite:46][cite:40]

Pantallas clave:

- Home de campaña.
- Hoja de personaje.
- Inventario.
- Hechizos o habilidades.
- Bitácora compartida.
- Representación visual del personaje.

### Principios UX

- Minimizar fricción para crear personaje.
- Exponer detalle avanzado sin abrumar al usuario nuevo.
- Mantener separación clara entre información narrativa y mecánica.
- Diseñar permisos y secretos de forma intuitiva.
- Optimizar para desktop primero, pero con lectura cómoda en móvil.

## Roadmap de MVP

### MVP estricto

El MVP recomendado incluye:

- Registro e inicio de sesión.
- Creación de campaña.
- Invitación de jugadores.
- Gestión de personajes asociados a campaña.
- Hoja básica con recálculo automático de estadísticas esenciales.
- Notas de sesión.
- NPCs, lugares y quests enlazables.
- Mapa 2D simple con pines.

### Lo que no debe entrar al MVP

- VTT completo.
- Combate táctico avanzado.
- Edición 3D compleja.
- Image-to-3D con IA.
- Marketplace.
- Soporte multi-sistema amplio desde el día uno.

## Monetización recomendada

| Modelo | Aplicación posible |
|---|---|
| Freemium | Número limitado de campañas, storage o assets [cite:27] |
| Suscripción Pro | Más campañas, backups, automatizaciones, assets premium |
| Add-ons | Packs visuales, plantillas, compendios o mapas [cite:35] |
| IA premium | Generación de retratos, resumen de sesiones, image-to-3D [cite:45][cite:42] |

La monetización debe llegar después de comprobar uso real en mesa y retención básica. El valor inicial debe estar en resolver el flujo diario del grupo mejor que una mezcla de documentos, hojas sueltas y apps separadas.[cite:27][cite:36][cite:46]

## Riesgos y mitigación

### Riesgos principales

- Alcance excesivo.
- Complejidad del motor de reglas.
- Costos de IA y media processing.
- Problemas de UX por mezclar demasiados modos de uso.
- Dependencia excesiva en features muy avanzadas antes de validar el núcleo.

### Mitigación

- Construir por fases cerradas.
- Mantener el 3D fuera del MVP.
- Diseñar el motor de reglas con tests desde el inicio.
- Medir uso real de campañas y hojas antes de monetizar.
- Tratar IA como servicio opcional y desacoplado.

## Recomendación final

La mejor decisión estratégica es construir primero una plataforma de campañas y personajes con automatización de reglas, porque ahí está el mayor valor funcional y la mejor probabilidad de adopción temprana.[cite:27][cite:36][cite:46]

La capa 3D y la IA deben existir como visión del producto, pero entrar solo después de validar que la herramienta base se usa de forma recurrente por una mesa real. Ese orden mantiene el proyecto manejable y al mismo tiempo preserva su potencial diferenciador.[cite:38][cite:45][cite:42]
