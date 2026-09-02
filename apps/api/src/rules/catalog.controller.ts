import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SRD_ARMOR, SRD_CLASSES, SRD_RACES } from "./catalog";

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
    };
  }
}
