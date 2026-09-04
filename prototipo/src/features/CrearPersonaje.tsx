// Estrato: pantalla propia — el creador de personaje de un RPG (§8.2). Pasos
// con consecuencias visibles: al elegir raza se ve QUÉ cambia en los números;
// al elegir clase, qué sabes hacer. Nada de formulario largo con «Guardar».
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { IconFlechaIzq, IconFlechaDcha, IconEspada, IconConjuro } from "../ui/icons";

type Raza = { id: string; nombre: string; nota: string; ajustes: Record<string, number> };
type Clase = { id: string; nombre: string; nota: string; sabe: string[]; icono: React.ReactNode };

const razas: Raza[] = [
  { id: "semielfa", nombre: "Semielfa", nota: "Entre dos mundos, cómoda en ambos.", ajustes: { CAR: 2, DES: 1, CON: 1 } },
  { id: "enano", nombre: "Enano de las colinas", nota: "Terca como la piedra, y tan resistente.", ajustes: { CON: 2, SAB: 1 } },
  { id: "tiefling", nombre: "Tiefling", nota: "Un linaje que arde bajo la piel.", ajustes: { CAR: 2, INT: 1 } },
  { id: "mediano", nombre: "Mediano", nota: "Pequeño, veloz y con una suerte insultante.", ajustes: { DES: 2 } },
];

const clases: Clase[] = [
  { id: "picara", nombre: "Pícara arcana", nota: "Golpea donde duele y desaparece.", sabe: ["Ataque furtivo", "Pericia en herramientas", "Trucos arcanos"], icono: <IconEspada className="size-5" /> },
  { id: "brujo", nombre: "Brujo", nota: "Un pacto con algo que no deberías haber invocado.", sabe: ["Descarga sobrenatural", "Invocaciones", "Magia de pacto"], icono: <IconConjuro className="size-5" /> },
  { id: "montaraz", nombre: "Montaraz", nota: "El bosque es tu casa y tu emboscada.", sabe: ["Enemigo predilecto", "Rastreo", "Estilo de combate"], icono: <IconEspada className="size-5" /> },
];

const baseAtributos = { FUE: 10, DES: 13, CON: 12, INT: 11, SAB: 10, CAR: 12 };
const orden = ["FUE", "DES", "CON", "INT", "SAB", "CAR"] as const;

export function CrearPersonaje() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [raza, setRaza] = useState<Raza | null>(null);
  const [clase, setClase] = useState<Clase | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const faltan =
    paso === 0 && !raza
      ? "Elige una raza para seguir."
      : paso === 1 && !clase
        ? "Elige una clase para seguir."
        : null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto grid min-h-screen max-w-[74rem] grid-cols-[1.3fr_1fr] gap-s6 px-s6 py-s6">
        {/* Los pasos */}
        <div className="flex flex-col">
          <button
            onClick={() => navigate(-1)}
            className="mb-s4 inline-flex w-fit items-center gap-s1 font-chrome text-chrome-sm text-muted hover:text-text"
          >
            <IconFlechaIzq className="size-4" /> Dejarlo para luego
          </button>
          <div className="mb-s5 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
            <span className={paso === 0 ? "text-copper-text" : ""}>1 · Origen</span>
            <span className="h-px w-6 bg-muted/40" />
            <span className={paso === 1 ? "text-copper-text" : ""}>2 · Vocación</span>
          </div>

          {paso === 0 && (
            <div className="anim-surge">
              <h1 className="font-title text-chrome-xl text-text">¿De dónde vienes?</h1>
              <p className="mb-s4 font-world text-world-base text-muted">
                Tu origen decide con qué números empiezas.
              </p>
              <div className="space-y-s2">
                {razas.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRaza(r)}
                    className={`flex w-full items-center gap-s3 rounded-radius-md border px-s4 py-s3 text-left transition-colors ${
                      raza?.id === r.id ? "border-copper bg-surface" : "border-muted/20 hover:border-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-title text-chrome-md text-text">{r.nombre}</div>
                      <p className="font-world text-world-base italic text-muted">{r.nota}</p>
                    </div>
                    <div className="flex shrink-0 gap-s1">
                      {Object.entries(r.ajustes).map(([k, v]) => (
                        <Badge key={k} tono="copper">
                          {k} +{v}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {paso === 1 && (
            <div className="anim-surge">
              <h1 className="font-title text-chrome-xl text-text">¿A qué te dedicas?</h1>
              <p className="mb-s4 font-world text-world-base text-muted">
                Tu vocación decide qué sabes hacer.
              </p>
              <div className="space-y-s2">
                {clases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClase(c)}
                    className={`w-full rounded-radius-md border px-s4 py-s3 text-left transition-colors ${
                      clase?.id === c.id ? "border-copper bg-surface" : "border-muted/20 hover:border-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-s2">
                      <span className="text-copper-text">{c.icono}</span>
                      <span className="font-title text-chrome-md text-text">{c.nombre}</span>
                    </div>
                    <p className="mt-s1 font-world text-world-base italic text-muted">{c.nota}</p>
                    {clase?.id === c.id && (
                      <div className="mt-s2 flex flex-wrap gap-s1">
                        {c.sabe.map((s) => (
                          <Badge key={s} tono="accent">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-s5 flex items-center gap-s3">
            {paso === 1 && (
              <Button variante="fantasma" icono={<IconFlechaIzq />} onClick={() => setPaso(0)}>
                Atrás
              </Button>
            )}
            {paso === 0 ? (
              <Button variante="accent" disabled={!raza} onClick={() => setPaso(1)}>
                Siguiente: vocación <IconFlechaDcha className="size-4" />
              </Button>
            ) : (
              <Button variante="accent" disabled={!clase} onClick={() => navigate("/mesa/c1")}>
                Sentarse a la mesa
              </Button>
            )}
            {/* Lo que falta se dice sin regañar. */}
            {faltan && <span className="font-chrome text-chrome-sm text-muted">{faltan}</span>}
          </div>
        </div>

        {/* La hoja construyéndose a la vista */}
        <aside className="rounded-radius-md border border-copper/30 bg-surface p-s5">
          <h2 className="mb-s1 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
            Se está construyendo
          </h2>
          <p className="mb-s4 font-title text-chrome-lg text-text">
            {raza?.nombre ?? "Alguien"} {clase ? `· ${clase.nombre}` : ""}
          </p>
          <div className="grid grid-cols-3 gap-s2">
            {orden.map((k) => {
              const ajuste = raza?.ajustes[k] ?? 0;
              const total = baseAtributos[k] + ajuste;
              return (
                <div key={k} className="rounded-radius-sm border border-muted/25 bg-bg py-s2 text-center">
                  <div className="font-chrome text-chrome-xs uppercase text-muted">{k}</div>
                  <div className="font-data text-chrome-lg text-text">{total}</div>
                  {ajuste > 0 && (
                    <div className="anim-surge font-data text-chrome-xs text-copper-text">
                      base {baseAtributos[k]} +{ajuste}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {clase && (
            <div className="mt-s4 border-t border-muted/20 pt-s3">
              <h3 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
                Sabrás hacer
              </h3>
              <ul className="space-y-s1">
                {clase.sabe.map((s) => (
                  <li key={s} className="font-world text-world-base text-text">
                    · {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
