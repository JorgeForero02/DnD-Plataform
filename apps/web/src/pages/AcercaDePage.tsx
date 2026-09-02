// Deuda S1, cerrada — la pantalla que de verdad cumple la CC BY 4.0.
//
// El pie (`ui/LegalNotice.tsx`) lleva la atribución corta a toda pantalla con sesión; esto lleva
// **el texto completo**, que es lo que la licencia pide poder consultar. Va sin sesión a
// propósito: una atribución que exige entrar no está en la obra distribuida, está detrás de
// ella.

import { Link } from "react-router-dom";
import { AppShell, AppHeader, PageHeader, Panel } from "../ui";
import { CC_BY_URL, SRD_ATTRIBUTION_EN, SRD_MODIFICATION_ES, SRD_URL } from "../ui/LegalNotice";

export function AcercaDePage() {
  return (
    <AppShell header={<AppHeader />}>
      <PageHeader title="Acerca de" />

      <Panel tone="vellum">
        <h2 className="font-title text-chrome-lg text-text">Contenido de reglas</h2>
        {/* El aviso va en inglés y **no se traduce**: es el texto de atribución que la licencia
            especifica, y traducirlo sería modificar justo lo que da fe de la modificación. */}
        <p className="mt-s3 font-world text-text" lang="en">
          {SRD_ATTRIBUTION_EN}
        </p>
        <p className="mt-s3 font-world text-text">
          <strong>{SRD_MODIFICATION_ES}</strong>
        </p>
        <ul className="mt-s3 list-disc pl-s4 font-chrome text-chrome-sm text-muted">
          <li>
            <a
              href={SRD_URL}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-accent-text"
            >
              System Reference Document 5.1
            </a>
          </li>
          <li>
            <a
              href={CC_BY_URL}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-accent-text"
            >
              Licencia Creative Commons Attribution 4.0 International
            </a>
          </li>
        </ul>
      </Panel>

      <Panel className="mt-s4">
        <h2 className="font-title text-chrome-lg text-text">Qué contenido trae la aplicación</h2>
        <p className="mt-s3 font-world text-text">
          De serie, esta aplicación solo incluye contenido del <strong>SRD 5.1</strong>. Las reglas
          y las fórmulas son libres; el texto, los nombres de subclases que no están en el SRD, las
          dotes y los conjuros del manual <strong>no se copian ni se distribuyen</strong>. Lo que un
          director de juego escriba en su mesa como contenido propio es uso privado suyo y no viaja
          con la aplicación.
        </p>
      </Panel>

      <p className="mt-s4 font-chrome text-chrome-sm">
        <Link to="/" className="underline hover:text-accent-text">
          Volver al panel
        </Link>
      </p>
    </AppShell>
  );
}
