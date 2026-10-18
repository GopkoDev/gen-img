import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

// The kit's Vite theme provider (shadcn «Dark mode — Vite»), with storage wrapped in try/catch and «system»
// following live changes of the system appearance (ADR-0024). index.html applies the same rule before paint.
export type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "gen-img:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeProviderContext = createContext<ThemeProviderState>({ theme: "system", setTheme: () => null });

function storedTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    const apply = (t: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(t);
    };
    if (theme !== "system") return apply(theme);
    const media = window.matchMedia(DARK_QUERY);
    const follow = () => apply(media.matches ? "dark" : "light");
    follow();
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [theme]);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice applies for this page only (AC-12).
    }
    setThemeState(next);
  };

  return <ThemeProviderContext.Provider value={{ theme, setTheme }}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => useContext(ThemeProviderContext);
