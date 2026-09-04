// Entrypoint: la mesa vive en /mesa/:id; alrededor, elegir campaña y crear
// personaje. Todo navegable entre sí (§9). Se mantiene el export por defecto
// que espera main.tsx.
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ElegirCampana } from "./features/ElegirCampana";
import { CrearPersonaje } from "./features/CrearPersonaje";
import { MesaDeSesion } from "./features/MesaDeSesion";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ElegirCampana />} />
        <Route path="/crear" element={<CrearPersonaje />} />
        <Route path="/mesa/:id" element={<MesaDeSesion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
