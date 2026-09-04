// Estrato: pantalla propia — «partidas guardadas» de un RPG, no una lista de
// proyectos (§8.1). Al elegir una, se siente que abres una crónica.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { IconReloj, IconFlechaDcha, IconPluma } from "../ui/icons";
import { campanas } from "../datos-de-ejemplo";

export function ElegirCampana() {
  const navigate = useNavigate();
  const [sel, setSel] = useState(campanas[0].id);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const activa = campanas.find((c) => c.id === sel)!;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen max-w-[72rem] flex-col px-s6 py-s8">
        <header className="mb-s6">
          <p className="font-chrome text-chrome-xs uppercase tracking-[0.3em] text-copper-text">
            Sala de Guerra
          </p>
          <h1 className="mt-s1 font-title text-chrome-2xl text-text">Tus crónicas</h1>
          <p className="mt-s1 max-w-[52ch] font-world text-world-lg text-muted">
            Elige dónde retomar la historia. Cada campaña recuerda exactamente
            dónde la dejasteis.
          </p>
        </header>

        <div className="grid flex-1 grid-cols-[1fr_1.1fr] gap-s6">
          {/* Lista de crónicas */}
          <ul className="space-y-s3">
            {campanas.map((c) => {
              const activo = c.id === sel;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSel(c.id)}
                    className={`group flex w-full items-center gap-s4 rounded-radius-md border px-s4 py-s3 text-left transition-colors ${
                      activo
                        ? "border-copper bg-surface"
                        : "border-muted/20 bg-surface/50 hover:border-muted/50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-12 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.sello }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-title text-chrome-lg text-text">
                        {c.titulo}
                      </span>
                      <span className="mt-s1 flex items-center gap-s2 font-chrome text-chrome-xs text-muted">
                        <IconReloj className="size-3.5" /> {c.ultimaVez} · sesión {c.sesion}
                      </span>
                    </span>
                    <IconFlechaDcha
                      className={`size-5 shrink-0 transition-colors ${
                        activo ? "text-copper-text" : "text-muted/40 group-hover:text-muted"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* La crónica elegida, abierta como un libro */}
          <div key={activa.id} className="anim-surge flex flex-col rounded-radius-md border border-copper/30 bg-surface p-s6">
            <div className="mb-s4">
              <h2 className="font-title text-chrome-xl text-copper-text">{activa.titulo}</h2>
              <p className="font-world text-world-base italic text-muted">{activa.subtitulo}</p>
            </div>
            <div className="mb-s5 flex-1">
              <h3 className="mb-s1 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
                Dónde se quedó
              </h3>
              <p className="capitular max-w-[46ch] font-world text-world-lg leading-relaxed">
                {activa.dondeSeQuedo}
              </p>
            </div>
            <div className="mb-s5">
              <h3 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
                Quién está dentro
              </h3>
              <div className="flex flex-wrap gap-s2">
                {activa.grupo.map((n) => (
                  <span
                    key={n}
                    className="rounded-radius-sm border border-muted/30 px-s2 py-s1 font-chrome text-chrome-sm text-text"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-s3">
              <Button variante="accent" tamano="lg" onClick={() => navigate(`/mesa/${activa.id}`)}>
                Entrar a la mesa
              </Button>
              <Button variante="copper" icono={<IconPluma />} onClick={() => navigate("/crear")}>
                Crear personaje
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
