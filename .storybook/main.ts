import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
    ...(process.env.UI_MCP === "1" ? ["@storybook/addon-mcp"] : []),
  ],
  features: {
    componentsManifest: true,
    ...(process.env.UI_MCP === "1" ? { experimentalReview: true } : {}),
  },
  typescript: { reactDocgen: "react-docgen-typescript" },
  core: { disableTelemetry: true },
};
export default config;
