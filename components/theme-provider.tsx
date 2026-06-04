"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
};

type ThemeContextValue = {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark" | undefined;
  systemTheme: "light" | "dark" | undefined;
  themes: Theme[];
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

const THEME_STORAGE_KEY = "theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme, enableSystem: boolean): "light" | "dark" {
  if (theme === "system" && enableSystem) {
    return getSystemTheme();
  }
  return theme === "dark" ? "dark" : "light";
}

function applyThemeClass(
  resolved: "light" | "dark",
  attribute: "class" | "data-theme"
) {
  const root = document.documentElement;
  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  } else {
    root.setAttribute(attribute, resolved);
  }
  root.style.colorScheme = resolved;
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = false,
  disableTransitionOnChange = false,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme | undefined>(undefined);
  const [resolvedTheme, setResolvedTheme] = React.useState<
    "light" | "dark" | undefined
  >(undefined);
  const [systemTheme, setSystemTheme] = React.useState<
    "light" | "dark" | undefined
  >(undefined);

  const apply = React.useCallback(
    (next: Theme) => {
      const resolved = resolveTheme(next, enableSystem);
      if (disableTransitionOnChange) {
        document.documentElement.classList.add("disable-transitions");
      }
      applyThemeClass(resolved, attribute);
      if (disableTransitionOnChange) {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove("disable-transitions");
        });
      }
      setResolvedTheme(resolved);
      if (enableSystem) {
        setSystemTheme(getSystemTheme());
      }
      return resolved;
    },
    [attribute, disableTransitionOnChange, enableSystem]
  );

  React.useEffect(() => {
    const stored = readStoredTheme(storageKey, defaultTheme);
    setThemeState(stored);
    apply(stored);
  }, [apply, defaultTheme, storageKey]);

  React.useEffect(() => {
    if (!enableSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const sys = getSystemTheme();
      setSystemTheme(sys);
      setThemeState((current) => {
        if (current === "system") {
          apply("system");
        }
        return current;
      });
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [apply, enableSystem]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }
      apply(next);
    },
    [apply, storageKey]
  );

  const themes: Theme[] = enableSystem
    ? ["light", "dark", "system"]
    : ["light", "dark"];

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, resolvedTheme, systemTheme, themes }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: undefined,
      setTheme: () => {},
      resolvedTheme: undefined,
      systemTheme: undefined,
      themes: ["light", "dark"],
    };
  }
  return ctx;
}
