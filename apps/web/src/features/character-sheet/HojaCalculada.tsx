import { useCharacterSheet } from "./hooks";
import { PaginaDeInventario } from "../inventory/PaginaDeInventario";
import { Caracteristicas, FichaEditable } from "./IdentidadEditable";
import { EmptyState } from "../../ui/Collection";
import { TarjetaDeHoja } from "./Tarjeta";
import { Cabecera } from "./Cabecera";
import { Numeros } from "./pestanas/Numeros";
import { Ataques } from "./pestanas/Ataques";
import { Rasgos } from "./pestanas/Rasgos";
import { Recursos } from "./pestanas/Recursos";
import { Estado } from "./pestanas/Estado";
import type { Disposicion } from "./pestanas/tipos";

// Tarea 2A.10 — la pantalla de la hoja de personaje: lee `GET .../sheet` y enseña la traza de
// cada número derivado, los avisos, las elecciones pendientes, los PG con su delta, recursos y
// descansos, condiciones, velocidad efectiva y sentidos, y deja tirar 1d20+mod desde aquí.
//
// ============================================================================================
// 2026-09-03 — **la maqueta manda en la forma, y esta vez entera**
// ============================================================================================
//
// Hubo una tanda anterior que la «adoptó» tomando ideas sueltas y conservando nuestra
// disposición. El autor miró lo desplegado y dijo que prefería el prototipo. Así que ahora es al
// revés: **la maqueta decide la forma y lo nuestro se adapta a ella**, salvo donde choque con una
// regla vinculante o con lo que de verdad hace el servidor. Lo que ha cambiado, y por qué:
//
//  1. **Cada salvación y cada habilidad es UNA línea**: nombre, bonificador y un dado pequeño.
//     Era un bloque de tres renglones con tres radios de ventaja, la frase «Un solo d20.» y un
//     botón «Tirar» — repetido en las seis salvaciones y las dieciocho habilidades: **veinticuatro
//     bloques** y una pantalla interminable. La decisión de ventaja no se ha escondido: se ha
//     movido al panel que abre el dado, donde aparece **una vez y completa**, con sus tres frases
//     visibles a la vez. El razonamiento entero está en `features/rolls/PanelDeTirada.tsx`.
//  2. **Las secciones son tarjetas con cabecera**, en dos columnas, no bandas a todo lo ancho con
//     un filete. Un recuadro dice dónde acaba una sección; una línea horizontal, no.
//  3. **La tira de la cabecera se pega al nombre**, en su misma banda, en vez de flotar con un
//     hueco enorme debajo. El nombre lo pinta la página (`CharacterDetailPage.tsx`, fuera de la
//     frontera de esta tarea), así que la tira sube hasta su altura con un margen negativo y se
//     alinea a la derecha, que es donde la maqueta la pone.
//  4. **El aviso de DM es una línea**, no un párrafo de letra pequeña.
//  5. **Se retira la piel de vitela** del cuerpo de la hoja. Está razonado en `Tarjeta.tsx`: la
//     vitela sirve para lo que se lee de corrido —una ficha del mundo, la historia del
//     personaje, que la conserva— y no para una hoja de consulta llena de cifras. Es reversible.
//
// **La cabecera fija se queda**, porque no era un defecto: CA, iniciativa, velocidad, PG y
// competencia son los cinco números que se consultan en mitad de un turno, y desplazarse para
// leerlos es exactamente lo que la hoja de papel no obliga a hacer. Ojo con dónde vive: **`sticky`
// se pega dentro de su padre**, así que la tira es HERMANA del cuerpo y nunca su hija; envolver
// las dos en un contenedor nuevo la soltaría sin que ninguna prueba unitaria se enterase (lo mide
// el punto 7 de `e2e/hoja.spec.ts`).
//
// **La maqueta usa metros («Vel. 9 m») y aquí siguen los pies.** No es un descuido: los pasos de
// la traza vienen del servidor en pies, y convertir solo el total dejaría un «9 m» explicado por
// un «30 velocidad base». La conversión, si se quiere, es del motor entero o de nada.
//
// La atribución del SRD que `catalog/index.ts` pide ver en pantalla no se repite aquí: ya la pinta
// `AppShell` en el pie de TODA pantalla con sesión, y esta hoja se monta dentro de un `AppShell`.

export function HojaCalculada({
  campaignId,
  characterId,
  puedeEditar,
  disposicion,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
  // Tarea 3 (spec 2026-09-11) — se la pasa a `Cabecera` tal cual. Desde la Tarea 4 también se la
  // pasa a `Numeros`, `Ataques` y `Rasgos`, sus propias pestañas: cada una decide su rejilla
  // (una columna en "mesa", varias en "pagina") con este mismo valor.
  disposicion: Disposicion;
}) {
  const { data, isLoading, isError } = useCharacterSheet(campaignId, characterId);

  if (isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Calculando la hoja…</p>;
  }
  if (isError || !data) {
    return (
      <EmptyState title="No se pudo cargar la hoja de 5.ª edición">
        Vuelve a intentarlo en un momento.
      </EmptyState>
    );
  }

  // Tarea 5 (spec 2026-09-11) — `hp` y `deathSaves` ya no se leen aquí: viajaban a `PuntosDeGolpe`
  // y `SalvacionesDeMuerte`, que ahora vive en la pestaña `Recursos` y los lee de `data` (el
  // spread `{ ...data, sheet }` de más abajo ya los lleva, sin desestructurarlos aparte).
  const { sheet, reason, character } = data;

  // **`identidad` solo evita el remonte DENTRO del `return` de abajo — ya no entre los dos
  // `return`s.**
  //
  // Esto nació como un `return` temprano con su propia copia de «Ficha» y «Características», y
  // el resto de la hoja era otro `return`. React empareja por posición del árbol, así que al
  // volverse derivable la hoja desmontaba un árbol entero y montaba el otro: **el campo que
  // tenías bajo el cursor desaparecía a media escritura** («element was detached from the DOM»,
  // lo decía el navegador con todas las letras). Compartir esta misma constante entre las dos
  // ramas, en la misma posición, arregló eso.
  //
  // **Desde la Tarea 4 (2026-09-11, «la hoja a página completa») ese arreglo ya no cubre el
  // salto entre ramas.** La rama `!sheet` de abajo sigue pintando `identidad` tal cual, pero la
  // rama derivable ya no la usa: `Características` vive dentro de la pestaña `Numeros` y `Ficha`
  // dentro de `Rasgos` (`pestanas/Rasgos.tsx`) — otro tipo de elemento en esa posición del árbol.
  // React vuelve a desmontar y montar al pasar de una rama a la otra, y el campo que se estaba
  // tecleando en ese instante SÍ puede perder su indicador transitorio de «guardando…»/error.
  // **Es un coste aceptado, no un descuido**: `EdicionEnSitio.tsx` guarda cada campo al perder
  // el foco (`onBlur`), así que lo único que se pierde es ese indicador de un campo que ya se
  // guardó — nunca el valor. Task 7 no puede evitarlo sin romper el propio diseño de pestañas
  // (Ficha vive en su pestaña, no en la posición de `identidad`), así que no se intenta.
  const identidad = (
    <>
      <TarjetaDeHoja titulo="Ficha" etiqueta="ficha del personaje">
        <FichaEditable
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          puedeEditar={puedeEditar}
        />
      </TarjetaDeHoja>
      <TarjetaDeHoja titulo="Características" etiqueta="características">
        <Caracteristicas
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          sheet={sheet}
          puedeEditar={puedeEditar}
        />
      </TarjetaDeHoja>
    </>
  );

  if (!sheet) {
    return (
      // **Las claves no son adorno: dentro de ESTA rama, evitan que el campo desaparezca bajo la
      // mano — ya no protegen el salto hacia la rama derivable de más abajo.**
      //
      // Esta rama y la de abajo son dos `return` distintos. Dentro de una lista o fragmento con
      // el mismo padre, React empareja por `key`, así que si algo reordena estos hermanos (o el
      // día de mañana se les añade uno) el nodo que ya existía no se desmonta: la clave conserva
      // qué nodo es cuál. Es lo que evitaba, cuando esta rama y la de abajo compartían la misma
      // constante `identidad` en la misma posición del árbol, que **el `<input>` que estabas
      // usando se desprendiera del DOM a media escritura** al volverse derivable la hoja —el
      // navegador lo decía con todas las letras en un recorrido: «element was detached from the
      // DOM»—, y le pasaba igual a quien rellena las seis características de un personaje nuevo.
      //
      // **Desde la Tarea 4 (2026-09-11) ese salto entre ramas ya no está protegido**: la rama
      // derivable no vuelve a pintar `identidad` en esta posición — `Características` y `Ficha`
      // viven en pestañas distintas (`Numeros`/`Rasgos`). Las claves siguen siendo correctas
      // DENTRO de esta rama; lo que ya no pueden hacer es emparejar contra un árbol de forma
      // distinta. Ver la nota completa, y el coste aceptado, junto a `identidad` más arriba.
      <div className="flex flex-col gap-s4">
        <div key="cuerpo" data-piel="cromado" className="flex flex-col gap-s4">
          <div key="rejilla" className="grid items-start gap-s4 lg:grid-cols-2">
            <div key="columna-izquierda" className="flex min-w-0 flex-col gap-s4">
              {identidad}
              {/* **Una ficha a medias se completa aquí, no en otra pantalla.** Antes había un
                  botón que abría un diálogo: quien acababa de crear un personaje veía un aviso,
                  pulsaba, y aterrizaba en un formulario distinto del sitio donde iba a leer el
                  resultado. */}
              <EmptyState title="La hoja de 5.ª edición está a medias">
                {reason ?? "Faltan datos para calcular la hoja."}
              </EmptyState>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-s4">
      {/* La cabecera fija vive en su propio componente desde la Tarea 3 (spec 2026-09-11): es
          HERMANA del cuerpo de abajo, nunca su padre — la nota completa sobre por qué está en
          `Cabecera.tsx`. */}
      <Cabecera
        campaignId={campaignId}
        characterId={characterId}
        data={{ ...data, sheet }}
        puedeEditar={puedeEditar}
        disposicion={disposicion}
      />

      {/* El cuerpo. Es HERMANO de la cabecera de arriba, nunca su padre — ver la nota del `sticky`
          en `Cabecera.tsx`. */}
      <div key="cuerpo" data-piel="cromado" className="flex flex-col gap-s4">
        <div key="rejilla" className="grid items-start gap-s4 lg:grid-cols-2">
          {/* --- Columna izquierda: la cadena que explica los números. NO se intercala nada
              entre características, salvaciones y habilidades. --- */}
          <div key="columna-izquierda" className="flex min-w-0 flex-col gap-s4">
            {/* Tarea 4 (spec 2026-09-11) — características, salvaciones y habilidades son ahora
                la pestaña `Numeros`, con la MISMA tarjeta de siempre movida sin reescribir.
                Todavía sin `Tabs` (llegan en la Tarea 7): se monta aquí, donde vivían sus
                tarjetas, con la misma `disposicion` que ya recibe `Cabecera`. */}
            <Numeros
              campaignId={campaignId}
              characterId={characterId}
              data={{ ...data, sheet }}
              puedeEditar={puedeEditar}
              disposicion={disposicion}
            />
          </div>

          {/* --- Columna derecha: lo accionable. --- */}
          <div className="flex min-w-0 flex-col gap-s4">
            {/* Tarea 5 (spec 2026-09-11) — PG, dados de golpe, salvaciones de muerte, recursos y
                descansos, y actividades son ahora la pestaña `Recursos`, con las MISMAS tarjetas
                movidas sin reescribir (incluida la fila de tarjetas pequeñas: percepción pasiva
                se quedó en `Numeros` desde la Tarea 4, y dados+muerte se mudan aquí, así que esa
                fila desaparece — vivía SOLO por ellas). Todavía sin `Tabs` (llegan en la Tarea
                7): se monta donde vivían sus tarjetas, con la misma `disposicion`. */}
            <Recursos
              campaignId={campaignId}
              characterId={characterId}
              data={{ ...data, sheet }}
              puedeEditar={puedeEditar}
              disposicion={disposicion}
            />

            {/* **Espacios de conjuro** no entra en ninguna pestaña de la Tarea 5 (ni `Recursos` ni
                `Estado` la reclaman en el brief): se queda aquí, donde vivía, entre las dos. */}
            {sheet.spellSlots.length > 0 && (
              <TarjetaDeHoja
                titulo={`Espacios de conjuro (${
                  sheet.spellSlotResetOn === "SHORT_REST" ? "descanso corto" : "descanso largo"
                })`}
                etiqueta="espacios de conjuro"
              >
                <ul className="flex flex-wrap gap-s2">
                  {sheet.spellSlots.map((s) => (
                    <li
                      key={s.spellLevel}
                      className="rounded-radius-sm border border-muted px-s2 py-1 font-data text-chrome-sm text-text"
                    >
                      Nivel {s.spellLevel}: {s.slots}
                    </li>
                  ))}
                </ul>
              </TarjetaDeHoja>
            )}

            {/* Tarea 5 — modificadores temporales, condiciones, CA con fórmula, velocidad y
                sentidos, y anulaciones son ahora la pestaña `Estado`, mismas tarjetas movidas. */}
            <Estado
              campaignId={campaignId}
              characterId={characterId}
              data={{ ...data, sheet }}
              puedeEditar={puedeEditar}
              disposicion={disposicion}
            />

            {/* **La bolsa se pinta una sola vez, y la pinta el inventario.** Aquí hubo una
                tarjeta de solo lectura con las cinco monedas; al montar el inventario debajo,
                la misma hoja enseñaba el dinero dos veces —una para leer y otra para mover—, que
                es la clase de duplicado que acaba discrepando en cuanto uno de los dos se
                actualiza y el otro no. Se queda el que además deja hacer algo. */}
          </div>
        </div>

        {/* Tarea 4 — «Ataques y lanzamiento» y «Competencias con armas» son ahora la pestaña
            `Ataques`, montada aquí donde vivía la primera (la segunda vivía en el pie, más
            abajo, y se mueve con ella para no repetirla). */}
        <Ataques
          campaignId={campaignId}
          characterId={characterId}
          data={{ ...data, sheet }}
          puedeEditar={puedeEditar}
          disposicion={disposicion}
        />

        {/* **El hueco del inventario, relleno (fase 2B).** Aquí hubo hasta hoy un recuadro
            punteado que decía «llega en la fase 2B». Lo que se enchufa es el inventario entero, y
            **dentro de la hoja y no en otra pantalla**: equipar algo cambia la CA de arriba
            delante de quien lo hace, y esa relación —que es lo que hace útil a esta
            herramienta— se pierde con una navegación por medio.
            Va **a todo lo ancho y debajo**, no en la columna derecha donde estaba el hueco: son
            tres zonas más carga y monedas, y en una columna de 320 px eso no cabe sin apretarse.
            El hueco marcaba el sitio, no la anchura. */}
        <PaginaDeInventario campaignId={campaignId} characterId={characterId} />

        {/* El pie: lo que se lee una vez por sesión y no se consulta en mitad de un turno.
            Tarea 4 — «Ficha», «Rasgos y aptitudes» y «Personalidad» son ahora la pestaña
            `Rasgos` (su «Competencias con armas» se mudó con `Ataques`, arriba, para no
            repetirla). */}
        <Rasgos
          campaignId={campaignId}
          characterId={characterId}
          data={{ ...data, sheet }}
          puedeEditar={puedeEditar}
          disposicion={disposicion}
        />
      </div>
    </div>
  );
}
