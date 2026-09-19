// Task 5 (2026-09-19) — un modificador sin signo cuando vale 0 o menos parece un valor absoluto:
// «Comp. 2» se lee como «tienes 2», no «súmale 2». Las filas de habilidad («linea», `Traza.tsx`)
// ya llevan el signo a mano; `conSigno` es la misma regla, para reutilizar donde haga falta.

/** El signo SIEMPRE delante: `"+3"`, `"−1"`, `"+0"`. El menos es el de verdad (U+2212), no el
 *  guion del teclado — el mismo criterio que ya usa `signoDe` en `Traza.tsx`. */
export function conSigno(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

// Task 7 (2026-09-19) — **un solo convenio de números en es-ES, escrito a mano.**
//
// `conEspacioFino` vivía en `character-sheet/vocabulario.ts` para un único consumidor (el
// marcador de PX); se muda a `dominio/` porque `PanelCarga.tsx` y `campaign-items/vocabulario.ts`
// necesitan la misma regla para pesos y precios con decimales, y una segunda copia es como la
// primera acaba mintiendo. **Ninguna de las dos usa `toLocaleString("es-ES")` ni
// `Intl.NumberFormat`**: el Node de este proyecto trae ICU pequeño (small-icu, solo en-US con
// datos completos) y esas llamadas devuelven en-US en el servidor de pruebas y en producción por
// igual — la regla vinculante del `CLAUDE.md` raíz, no una preferencia de estilo.

/** El espacio fino de miles (U+202F), el mismo carácter que ya usaba `conEspacioFino` en
 *  `character-sheet/vocabulario.ts` — no un espacio normal, que un test disconforme delataría. */
const ESPACIO_FINO = " ";

/**
 * Números en es-ES con espacio fino de miles: «1 250», no «1.250» ni «1250». Se agrupa a mano,
 * de tres en tres desde la derecha.
 */
export function conEspacioFino(n: number): string {
  const negativo = n < 0;
  const digitos = String(Math.trunc(Math.abs(n)));
  const agrupado = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACIO_FINO);
  return negativo ? `-${agrupado}` : agrupado;
}

/**
 * Un número con decimales en es-ES: coma decimal, espacio fino de miles en la parte entera.
 * `decimales(3.5, 1)` → `"3,5"`; `decimales(1250.25, 2)` → `"1 250,25"` (espacio fino, U+202F).
 */
export function decimales(n: number, cifras: number): string {
  const negativo = n < 0;
  const fijado = Math.abs(n).toFixed(cifras);
  const [parteEntera, parteDecimal = ""] = fijado.split(".");
  const enteroAgrupado = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACIO_FINO);
  const resultado = cifras > 0 ? `${enteroAgrupado},${parteDecimal}` : enteroAgrupado;
  return negativo ? `-${resultado}` : resultado;
}
