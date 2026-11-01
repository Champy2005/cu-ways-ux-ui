import type { Preview } from "@storybook/react-vite";
import "../src/design-system/tokens/theme.css";
import "../src/design-system/base.css";
import { ThemeProvider } from "../src/design-system/ThemeProvider";

const preview: Preview = {
  globalTypes: {
    material: {
      description: "Chrome material",
      toolbar: {
        icon: "circlehollow",
        items: ["glass", "opaque"],
        dynamicTitle: true,
      },
    },
    textScale: {
      description: "Reading size",
      toolbar: {
        icon: "paragraph",
        items: [
          { value: 100, title: "100%" },
          { value: 150, title: "150%" },
          { value: 200, title: "200%" },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      description: "Theme",
      toolbar: { icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light", material: "glass", textScale: 100 },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile: {
          name: "Mobile 390",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        desktop: {
          name: "Desktop 1440",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
        narrow: {
          name: "Narrow 320",
          styles: { width: "320px", height: "568px" },
          type: "mobile",
        },
        large: {
          name: "Large desktop",
          styles: { width: "2560px", height: "1347px" },
          type: "desktop",
        },
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === "dark" ? "dark" : "light";
      const material =
        context.globals.material === "opaque" ? "opaque" : "glass";
      const textScale = [100, 150, 200].includes(
        Number(context.globals.textScale),
      )
        ? Number(context.globals.textScale)
        : 100;
      return (
        <ThemeProvider
          key={`${theme}-${material}-${textScale}`}
          initialTheme={theme}
          material={material}
          textScale={textScale}
        >
          <Story />
        </ThemeProvider>
      );
    },
  ],
};
export default preview;
