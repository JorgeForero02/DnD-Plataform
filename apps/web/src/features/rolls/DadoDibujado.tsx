// Tarea F3 — el d20, **dibujado**.
//
// La casa común de los iconos de línea es `ui/Iconos.tsx`, y este dado debería acabar allí; hoy
// ese fichero es de otro carril de trabajo, así que el dibujo vive aquí y la mudanza queda
// anotada en el informe de F3. Lo que NO se hace es escribir el emoji del dado: un glifo de
// fuente se pinta a todo color en unos sistemas, como un cuadrado vacío en otros, y nunca se
// parece al resto de la interfaz (docs/04-convenciones.md, regla vinculante).
//
// La silueta es la de un icosaedro visto de frente: hexágono exterior y el triángulo de la cara
// superior. Se dimensiona en `1em` porque va **dentro** de una línea de texto, junto a la cifra
// que sacó, y una altura fija en píxeles se descuadra en cuanto el texto cambia de escala.

export function DadoDibujado({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icono="dado"
      className={["inline-block shrink-0 align-[-0.125em]", className].join(" ")}
    >
      <path d="M12 2.2 21 7.3v9.4L12 21.8 3 16.7V7.3z" />
      <path d="M12 2.2 7 10.6h10z" />
      <path d="M7 10.6 12 21.8l5-11.2" />
      <path d="M3 7.3 7 10.6M21 7.3 17 10.6" />
    </svg>
  );
}
