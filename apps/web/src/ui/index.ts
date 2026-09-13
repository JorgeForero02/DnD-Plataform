export { Button } from "./Button";
export type { ButtonProps, ButtonVariant } from "./Button";
export { Field, fieldControlClass } from "./Field";
export type { FieldProps } from "./Field";
export { Panel } from "./Panel";
export type { PanelProps, PanelTone } from "./Panel";
export { Badge } from "./Badge";
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { MenuDeAcciones } from "./MenuDeAcciones";
export type { AccionDeMenu } from "./MenuDeAcciones";
export { Tabs } from "./Tabs";
export type { TabItem, TabsProps } from "./Tabs";
export { ThemeToggle } from "./ThemeToggle";
export { getStoredTheme, getPreferredTheme, applyTheme, setTheme, initTheme } from "./theme";
export type { Theme } from "./theme";
export { CartographicGrid, DrawnHorizon, CompassMark, OrnamentRule } from "./Ornament";
export { AppShell, AppHeader, PageHeader, Breadcrumbs } from "./AppShell";
export type { Crumb } from "./AppShell";
export { Toolbar, ListRow } from "./Collection";
// C5 (2026-09-04) — las dos primitivas que la maqueta tiene en fichero propio y aquí vivían
// dentro de `Collection.tsx`. `Collection.tsx` las sigue reexportando para las importaciones
// directas que ya existen; el barril las toma de su casa nueva.
export { FilterChip } from "./FilterChip";
export { EmptyState } from "./EmptyState";
export {
  LegalNotice,
  SRD_URL,
  CC_BY_URL,
  SRD_ATTRIBUTION_ES,
  SRD_MODIFICATION_ES,
} from "./LegalNotice";
