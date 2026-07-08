export const THEME_KEY = "next-steps-theme";
export type Theme = "light" | "dark" | "system";
export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}
export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}
export function loadTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light" || saved === "system") return saved;
  return "system";
}
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}
export function persistTheme(theme: Theme) { localStorage.setItem(THEME_KEY, theme); }
// Apply the persisted theme immediately on module load so there is no flash
// of the wrong theme before React mounts.
if (typeof document !== "undefined") applyTheme(loadTheme());
