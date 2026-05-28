import { useState, useEffect } from "react";

export type Theme = "dark" | "light";
export type Density = "compact" | "regular" | "comfy";

function getStored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStored("theme", "dark"));
  const [density, setDensityState] = useState<Density>(() => getStored("density", "regular"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    try { localStorage.setItem("density", density); } catch {}
  }, [density]);

  return { theme, setTheme: setThemeState, density, setDensity: setDensityState };
}
