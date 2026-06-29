export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/** Stored preference if the visitor has toggled before, else the OS preference. */
export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Toggles the `dark` class Tailwind's class-based dark: variant looks for, and persists the choice. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}
