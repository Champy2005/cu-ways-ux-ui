import type { Preview } from "@storybook/react-vite";
import "../src/design-system/tokens/theme.css";
import "../src/design-system/base.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: { icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === "dark" ? "dark" : "light";
      document.documentElement.dataset.cuTheme = theme;
      return (
        <div data-cu-theme={theme} data-ui="preview">
          <Story />
        </div>
      );
    },
  ],
};
export default preview;
