import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
type Theme = "light" | "dark";
type Material = "opaque" | "glass";
const ThemeContext = createContext<{
  theme: Theme;
  material: Material;
  textScale: number;
  toggle: () => void;
}>({
  theme: "light",
  material: "glass",
  textScale: 100,
  toggle: () => {},
});
/** Ordinary React provider: no Storybook or fixture dependency. Portals inherit root tokens. */
export function ThemeProvider({
  initialTheme = "light",
  material = "glass",
  textScale = 100,
  children,
}: {
  initialTheme?: Theme;
  material?: Material;
  textScale?: number;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState(initialTheme);
  useLayoutEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);
  useLayoutEffect(() => {
    document.documentElement.dataset.cuTheme = theme;
    document.documentElement.dataset.textScale = String(textScale);
    document.documentElement.style.removeProperty("font-size");
  }, [theme, textScale]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        material,
        textScale,
        toggle: () => setTheme(theme === "light" ? "dark" : "light"),
      }}
    >
      <div data-cu-theme={theme} data-ui="preview" data-density="compact">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
