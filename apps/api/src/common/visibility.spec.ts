import { canView } from "./visibility";
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
