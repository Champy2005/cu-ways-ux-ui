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
  async viteFinal(config) {
    config.server = {
      ...config.server,
      watch: {
        ...config.server?.watch,
        ignored: ["**/.artifacts/**", "**/storybook-static/**"],
      },
    };
    config.plugins = [
      ...(config.plugins ?? []),
      {
        name: "ui-workspace-identity",
        configureServer(server) {
          server.middlewares.use("/__ui/identity", (_req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ root: process.cwd(), schemaVersion: 1 }));
          });
        },
      },
    ];
    return config;
  },
};
export default config;
