// Estrato: compone los tres — la mesa es UNA sola pantalla que cambia de estado
// (§5). Nunca se sustituye: los paneles se abren ENCIMA y al cerrarlos vuelves
// exactamente donde estabas.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BandaDeEstado } from "./BandaDeEstado";
import { CabeceraDeEscena } from "./CabeceraDeEscena";
import { ColumnaElenco } from "./ColumnaElenco";
import { HiloDeSesion } from "./HiloDeSesion";
import { BarraDeAcciones } from "./BarraDeAcciones";
import { TiraDeIniciativa } from "./TiraDeIniciativa";
import { PanelDeDados } from "./PanelDeDados";
import { HojaDePersonaje } from "./HojaDePersonaje";
import { Inventario } from "./Inventario";
import { ConsultaDelMundo } from "./ConsultaDelMundo";
import { Reincorporarse } from "./Reincorporarse";
import { HerramientasDeNarracion } from "./HerramientasDeNarracion";
import { RailDePaneles } from "./RailDePaneles";
import { TallerDelDM } from "./TallerDelDM";
import { BloquesDeReglas } from "./BloquesDeReglas";
import { TablasDelDM } from "./TablasDelDM";
import { PonerCondicion } from "./PonerCondicion";
import { Button } from "../ui/Button";
import { IconRayo } from "../ui/icons";
import {
  campanas,
  grupo,
  hilo,
  accionesSirella,
  type Personaje,
  type Accion,
} from "../datos-de-ejemplo";

type Rol = "jugador" | "dm";
type Estado = "reposo" | "sesion" | "combate";
type Tema = "dark" | "light" | "reading";
type Overlay = null | "hoja" | "inventario" | "mundo" | "reincorporar" | "reglas" | "tablas";

export function MesaDeSesion() {
  const { id } = useParams();
  const campana = campanas.find((c) => c.id === id) ?? campanas[0];

  const [rol, setRol] = useState<Rol>("jugador");
  const [estado, setEstado] = useState<Estado>("sesion");
  const [tema, setTema] = useState<Tema>("dark");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [fichaAbierta, setFichaAbierta] = useState<Personaje>(grupo.find((p) => p.esYo)!);
  const [dados, setDados] = useState<Accion | null>(null);
  const [condicionSobre, setCondicionSobre] = useState<string | null>(null);

  const enCombate = estado === "combate";
  const enSesion = estado !== "reposo";
  // El taller es el sitio del DM cuando la mesa está en reposo (§2.1).
  const tallerDM = rol === "dm" && estado === "reposo";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
  }, [tema]);

  // Teclas rápidas como acelerador, nunca único camino. Se ignoran mientras se
  // escribe (§12).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") setOverlay("hoja");
      if (e.key === "i" || e.key === "I") setOverlay("inventario");
      if (e.key === "m" || e.key === "M") setOverlay("mundo");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function abrirFicha(p: Personaje) {
    setFichaAbierta(p);
    setOverlay("hoja");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-text">
      <BandaDeEstado
        campana={campana.titulo}
        rol={rol}
        estado={estado}
        tema={tema}
        tiempoSesion="2 h 47 min"
        onRol={setRol}
        onEstado={setEstado}
        onTema={setTema}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-s3 p-s3">
        <CabeceraDeEscena
          lugar="El Puerto Viejo, almacén cuatro"
          ambiente="Salitre y brea en el aire; algo gotea sobre piedra en la oscuridad del fondo."
          hora="23:40"
          dia="Día 12 · noche cerrada"
          noche
          presentes={grupo}
          esDM={rol === "dm"}
          onRevelar={() => setOverlay("mundo")}
        />

        {enCombate && <TiraDeIniciativa />}

        {tallerDM ? (
          // En reposo, el DM entra a su taller: este es su sitio.
          <TallerDelDM />
        ) : (
          <main
            className={`grid min-h-0 flex-1 gap-s3 ${
              rol === "dm" ? "grid-cols-[17rem_1fr_15rem]" : "grid-cols-[17rem_1fr]"
            }`}
          >
            <ColumnaElenco
              rol={rol}
              enCombate={enCombate}
              onAbrir={abrirFicha}
              onCondicion={setCondicionSobre}
            />

            <section className="flex min-h-0 flex-col rounded-radius-md border border-muted/20 bg-surface">
              <HiloDeSesion
                mensajes={hilo}
                desdeNoLeido={rol === "jugador" ? undefined : "m17"}
                puedeEscribir
              />
            </section>

            {rol === "dm" && (
              <aside className="flex min-h-0 flex-col gap-s4 overflow-y-auto rounded-radius-md border border-muted/20 bg-surface p-s3 scroll-quiet">
                <HerramientasDeNarracion
                  onPedirTirada={() => setDados(accionesSirella[0])}
                  onConsultar={() => setOverlay("mundo")}
                  onReglas={() => setOverlay("reglas")}
                  onTablas={() => setOverlay("tablas")}
                />
              </aside>
            )}
          </main>
        )}

        <div className="flex items-stretch gap-s3">
          <RailDePaneles
            onHoja={() => {
              setFichaAbierta(grupo.find((p) => p.esYo)!);
              setOverlay("hoja");
            }}
            onInventario={() => setOverlay("inventario")}
            onMundo={() => setOverlay("mundo")}
            onReincorporar={() => setOverlay("reincorporar")}
          />
          {enSesion && rol === "jugador" ? (
            <div className="min-w-0 flex-1">
              <BarraDeAcciones
                acciones={accionesSirella}
                enCombate={enCombate}
                recursos={{ accion: false, adicional: false, reaccion: false }}
                onTirar={(a) => setDados(a)}
              />
            </div>
          ) : estado === "reposo" && !tallerDM ? (
            <div className="flex min-w-0 flex-1 items-center justify-between rounded-radius-md border border-copper/30 bg-surface px-s4 py-s3">
              <p className="font-world text-world-base italic text-muted">{campana.dondeSeQuedo}</p>
            </div>
          ) : tallerDM ? (
            <div className="flex min-w-0 flex-1 items-center justify-end rounded-radius-md border border-copper/30 bg-surface px-s4 py-s3">
              <Button variante="accent" icono={<IconRayo />} onClick={() => setEstado("sesion")}>
                Empezar la sesión
              </Button>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>

      {overlay === "hoja" && (
        <HojaDePersonaje p={fichaAbierta} onClose={() => setOverlay(null)} onTirar={setDados} />
      )}
      {overlay === "inventario" && <Inventario onClose={() => setOverlay(null)} />}
      {overlay === "mundo" && (
        <ConsultaDelMundo esDM={rol === "dm"} onClose={() => setOverlay(null)} />
      )}
      {overlay === "reincorporar" && <Reincorporarse onClose={() => setOverlay(null)} />}
      {overlay === "reglas" && <BloquesDeReglas onClose={() => setOverlay(null)} />}
      {overlay === "tablas" && <TablasDelDM onClose={() => setOverlay(null)} />}

      {condicionSobre && (
        <PonerCondicion
          nombre={condicionSobre}
          enCombate={enCombate}
          onClose={() => setCondicionSobre(null)}
        />
      )}

      {dados && <PanelDeDados accion={dados} esDM={rol === "dm"} onCerrar={() => setDados(null)} />}
    </div>
  );
}
