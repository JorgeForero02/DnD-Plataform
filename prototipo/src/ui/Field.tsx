// Estrato: ninguno — primitiva reutilizable.
// NO es «etiqueta encima de un campo de banco»: la etiqueta va en línea,
// discreta, y el valor manda.
import type { ReactNode } from "react";

export function Field({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-s1 flex items-baseline justify-between">
        <span className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          {etiqueta}
        </span>
        {ayuda && <span className="font-chrome text-chrome-xs text-muted/70">{ayuda}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-radius-sm border border-muted/30 bg-bg px-s3 py-s2 font-chrome text-chrome-base text-text placeholder:text-muted/60 focus:border-accent"
      {...rest}
    />
  );
}
