import { canView, laAudienciaCrecio } from "./visibility";
import type { Visibility } from "@dnd/shared";

const OWNER = "owner1";
const GRANTED = "granted1";
const OTHER = "other1";

const resource = (visibility: Visibility) => ({
  visibility,
  createdById: OWNER,
  grantedUserIds: [GRANTED],
});

const ALL: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

describe("canView", () => {
  it("admin sees every visibility", () => {
    const admin = { userId: "admin1", role: null, isAdmin: true };
    for (const v of ALL) expect(canView(admin, resource(v))).toBe(true);
  });

  it("DM sees every visibility", () => {
    const dm = { userId: "dm1", role: "DM" as const, isAdmin: false };
    for (const v of ALL) expect(canView(dm, resource(v))).toBe(true);
  });

  it("non-member (role null, not admin) sees nothing", () => {
    const outsider = { userId: OTHER, role: null, isAdmin: false };
    for (const v of ALL) expect(canView(outsider, resource(v))).toBe(false);
  });

  it("player who is the owner", () => {
    const owner = { userId: OWNER, role: "PLAYER" as const, isAdmin: false };
    expect(canView(owner, resource("PUBLIC"))).toBe(true);
    expect(canView(owner, resource("PLAYERS"))).toBe(true);
    expect(canView(owner, resource("SPECIFIC_PLAYERS"))).toBe(false); // owner not in grants
    expect(canView(owner, resource("OWNER_DM"))).toBe(true);
    expect(canView(owner, resource("DM_ONLY"))).toBe(false);
  });

  it("player who is a granted specific player", () => {
    const granted = { userId: GRANTED, role: "PLAYER" as const, isAdmin: false };
    expect(canView(granted, resource("PUBLIC"))).toBe(true);
    expect(canView(granted, resource("PLAYERS"))).toBe(true);
    expect(canView(granted, resource("SPECIFIC_PLAYERS"))).toBe(true);
    expect(canView(granted, resource("OWNER_DM"))).toBe(false);
    expect(canView(granted, resource("DM_ONLY"))).toBe(false);
  });

  it("player who is neither owner nor granted", () => {
    const other = { userId: OTHER, role: "PLAYER" as const, isAdmin: false };
    expect(canView(other, resource("PUBLIC"))).toBe(true);
    expect(canView(other, resource("PLAYERS"))).toBe(true);
    expect(canView(other, resource("SPECIFIC_PLAYERS"))).toBe(false);
    expect(canView(other, resource("OWNER_DM"))).toBe(false);
    expect(canView(other, resource("DM_ONLY"))).toBe(false);
  });
});

// **El retículo de audiencias, y por qué no es una fila.** (Revisión de cierre, 2026-09-04.)
//
// Estas pruebas existen porque la primera versión de «¿subió la visibilidad?» ordenaba los cinco
// niveles en una lista y comparaba índices. Los casos de abajo son exactamente los que un índice
// contesta mal, y **son los que ninguna prueba cubría**: la única que había iba de `DM_ONLY` a
// `OWNER_DM`, que pasa con cualquier orden que ponga `DM_ONLY` primero.
describe("laAudienciaCrecio — quién ve algo ahora que no lo veía antes", () => {
  const recurso = (
    visibility: Visibility,
    createdById = "creador",
    grantedUserIds: string[] = [],
  ) => ({ visibility, createdById, grantedUserIds });

  it("de DM_ONLY a PLAYERS crece: de nadie a todos", () => {
    expect(laAudienciaCrecio(recurso("DM_ONLY"), recurso("PLAYERS"))).toBe(true);
  });

  it("bajar no crece nunca, aunque el salto sea grande", () => {
    expect(laAudienciaCrecio(recurso("PUBLIC"), recurso("DM_ONLY"))).toBe(false);
    expect(laAudienciaCrecio(recurso("PLAYERS"), recurso("SPECIFIC_PLAYERS", "c", ["p1"]))).toBe(
      false,
    );
  });

  // **El par que rompía el índice.** `OWNER_DM` la ve el creador; `SPECIFIC_PLAYERS` la ven los
  // concedidos. Ninguno contiene al otro, así que ordenarlos es inventarse una relación.
  it("de OWNER_DM a SPECIFIC_PLAYERS SIN conceder a nadie NO crece: pasa a no verla nadie", () => {
    expect(
      laAudienciaCrecio(recurso("OWNER_DM", "creador"), recurso("SPECIFIC_PLAYERS", "creador", [])),
    ).toBe(false);
  });

  it("y con la lista incluyendo solo al creador tampoco: son la misma persona", () => {
    expect(
      laAudienciaCrecio(
        recurso("OWNER_DM", "creador"),
        recurso("SPECIFIC_PLAYERS", "creador", ["creador"]),
      ),
    ).toBe(false);
  });

  it("pero si concede a alguien más, sí crece", () => {
    expect(
      laAudienciaCrecio(
        recurso("OWNER_DM", "creador"),
        recurso("SPECIFIC_PLAYERS", "creador", ["creador", "p1"]),
      ),
    ).toBe(true);
  });

  // **Y el camino inverso, que el índice también contestaba mal.** Para el creador es la primera
  // vez que la ve, así que anunciarlo es correcto.
  it("de SPECIFIC_PLAYERS a OWNER_DM crece si el creador no estaba concedido", () => {
    expect(
      laAudienciaCrecio(
        recurso("SPECIFIC_PLAYERS", "creador", ["p1"]),
        recurso("OWNER_DM", "creador"),
      ),
    ).toBe(true);
  });

  it("y no crece si ya lo estaba", () => {
    expect(
      laAudienciaCrecio(
        recurso("SPECIFIC_PLAYERS", "creador", ["creador", "p1"]),
        recurso("OWNER_DM", "creador"),
      ),
    ).toBe(false);
  });

  it("añadir un concedido crece; quitarlo no", () => {
    const uno = recurso("SPECIFIC_PLAYERS", "c", ["p1"]);
    const dos = recurso("SPECIFIC_PLAYERS", "c", ["p1", "p2"]);
    expect(laAudienciaCrecio(uno, dos)).toBe(true);
    expect(laAudienciaCrecio(dos, uno)).toBe(false);
  });

  it("de PLAYERS a PUBLIC no crece: hoy son la misma gente", () => {
    expect(laAudienciaCrecio(recurso("PLAYERS"), recurso("PUBLIC"))).toBe(false);
  });
});
