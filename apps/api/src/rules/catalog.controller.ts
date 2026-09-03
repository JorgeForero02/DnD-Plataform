import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SRD_ARMOR, SRD_CLASSES, SRD_DIFFICULTY_CLASSES, SRD_RACES } from "./catalog";
import { SRD_ITEMS } from "./catalog/items-srd";

// El catálogo por HTTP. **Existe para que la pantalla no lo transcriba a mano**, que es lo que
// hacía la primera versión de la hoja: las razas, subrazas, clases y armaduras estaban copiadas
// en un fichero del navegador. Correcto el día que se escribió y una fuente de deriva desde el
// siguiente — el servidor sigue validando, así que la desviación no se nota como error sino como
// una opción que el desplegable ofrece y el servidor rechaza.
//
// **Solo lo que un selector necesita**, no la ficha entera de cada raza: clave, nombre y las
// subrazas. Las cifras (bonos, velocidad, dado de golpe) ya llegan derivadas en la hoja, con su
// traza; repetirlas aquí sería mandar dos veces el mismo dato por dos caminos que pueden
// discrepar.
//
// Autenticado pero no por campaña: el SRD 5.1 es el mismo para todas, y no revela nada de una
// partida. Bajo `JwtAuthGuard` de todos modos, porque en esta API no hay endpoints anónimos
// salvo los de la propia autenticación.

@UseGuards(JwtAuthGuard)
@Controller("catalog")
export class CatalogController {
  @Get()
  getCatalog() {
    return {
      races: SRD_RACES.map((race) => ({
        key: race.key,
        name: race.name,
        subraces: (race.subraces ?? []).map((sub) => ({ key: sub.key, name: sub.name })),
      })),
      classes: SRD_CLASSES.map((klass) => ({
        key: klass.key,
        name: klass.name,
        hitDie: klass.hitDie,
      })),
      armor: SRD_ARMOR.map((armor) => ({
        key: armor.key,
        name: armor.name,
        category: armor.category,
      })),
      // La guía de CD del SRD (2C.5). Va en el mismo sitio que el resto del catálogo porque es
      // exactamente eso: contenido del manual que la pantalla necesita y no debe transcribir.
      difficultyClasses: SRD_DIFFICULTY_CLASSES,
    };
  }

  /**
   * Los objetos del SRD 5.1, para que la pantalla pueda **meter uno en la mochila** sin
   * transcribir la tabla de armas.
   *
   * Van **enteros y no recortados**, al contrario que las razas y las clases de arriba: aquí las
   * cifras no llegan por otro camino —el daño de un arma no está en la hoja derivada hasta que
   * el arma se equipa—, así que recortarlas obligaría a la pantalla a pedir el objeto otra vez
   * para enseñar «1d8 cortante» en la lista de dónde elegir.
   *
   * Mismo trato que el resto del catálogo: autenticado, pero no por campaña. El SRD es el mismo
   * para todas las mesas y no revela nada de ninguna partida.
   */
  @Get("items")
  getItems() {
    return { items: SRD_ITEMS };
  }
}
