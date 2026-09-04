// Estrato: ninguno — primitiva de dibujo.
// Iconos SVG en línea. Heredan el color del texto (stroke="currentColor").
// Nunca emoji ni glifos de fuente.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Base({ children, className, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconEscudo = (p: IconProps) => (
  <Base {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></Base>
);
export const IconEspada = (p: IconProps) => (
  <Base {...p}><path d="M14.5 4L20 4l0 5.5-9 9-2.5.5.5-2.5 9-9z" /><path d="M4 20l4-4M6.5 13.5L3 17l4 4 3.5-3.5" /></Base>
);
export const IconConjuro = (p: IconProps) => (
  <Base {...p}><path d="M12 3l1.8 4.6L18.5 9l-4 3 1 5-3.5-2.7L8.5 17l1-5-4-3 4.7-1.4L12 3z" /></Base>
);
export const IconPocion = (p: IconProps) => (
  <Base {...p}><path d="M10 3h4M11 3v4.5L6.5 15a4 4 0 003.5 6h4a4 4 0 003.5-6L13 7.5V3" /><path d="M7.5 13h9" /></Base>
);
export const IconCorazon = (p: IconProps) => (
  <Base {...p}><path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0112 8a3.7 3.7 0 017 2.7C19 15.6 12 20 12 20z" /></Base>
);
export const IconD20 = (p: IconProps) => (
  <Base {...p}><path d="M12 3l8 5v8l-8 5-8-5V8l8-5z" /><path d="M12 3v18M4 8l8 5 8-5M12 3l-8 5m8-5l8 5" /></Base>
);
export const IconOjo = (p: IconProps) => (
  <Base {...p}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.6" /></Base>
);
export const IconOjoTachado = (p: IconProps) => (
  <Base {...p}><path d="M3 3l18 18" /><path d="M10.6 6.1A10.3 10.3 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.3 4M6.3 6.4A17 17 0 002 12s3.5 6.5 10 6.5a10 10 0 004-.8" /><path d="M9.8 9.9a2.6 2.6 0 003.6 3.6" /></Base>
);
export const IconLibro = (p: IconProps) => (
  <Base {...p}><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" /><path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5" /></Base>
);
export const IconMochila = (p: IconProps) => (
  <Base {...p}><path d="M6 9a6 6 0 0112 0v9a2 2 0 01-2 2H8a2 2 0 01-2-2z" /><path d="M9 9a3 3 0 016 0M9 14h6" /></Base>
);
export const IconReloj = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Base>
);
export const IconMundo = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.4 3.7 8.5S14.4 18.2 12 20.5C9.6 18.2 8.3 15.1 8.3 12S9.6 5.8 12 3.5z" /></Base>
);
export const IconLupa = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Base>
);
export const IconCerrar = (p: IconProps) => (
  <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>
);
export const IconFlechaDcha = (p: IconProps) => (
  <Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>
);
export const IconFlechaIzq = (p: IconProps) => (
  <Base {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Base>
);
export const IconMas = (p: IconProps) => (
  <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
);
export const IconMegafono = (p: IconProps) => (
  <Base {...p}><path d="M3 10v4a1 1 0 001 1h2l6 4V5L6 9H4a1 1 0 00-1 1z" /><path d="M16 8.5a4 4 0 010 7M18.5 6a7 7 0 010 12" /></Base>
);
export const IconRayo = (p: IconProps) => (
  <Base {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></Base>
);
export const IconGarra = (p: IconProps) => (
  <Base {...p}><path d="M4 4c3 5 4 9 4 16M9 3c2 5 2.5 9 2.5 17M15 3c-1 5-1 9 .5 17M20 5c-2 4-3.5 8-3.5 15" /></Base>
);
export const IconCalavera = (p: IconProps) => (
  <Base {...p}><path d="M12 3a8 8 0 00-5 14v3h10v-3a8 8 0 00-5-14z" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><path d="M12 15v2" /></Base>
);
export const IconLuna = (p: IconProps) => (
  <Base {...p}><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" /></Base>
);
export const IconSol = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" /></Base>
);
export const IconPluma = (p: IconProps) => (
  <Base {...p}><path d="M20 4C10 6 6 12 5 20M20 4c-1 8-6 12-13 13M20 4l-5 1M8 15l-3 5" /></Base>
);
