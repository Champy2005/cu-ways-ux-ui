import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
import { ownershipRule } from "./scripts/ui/rules.mjs";
export default ts.config(
  {
    ignores: [
      "node_modules/**",
      ".artifacts/**",
      "storybook-static/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/features/**/*.mjs"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { cuways: { rules: { ownership: ownershipRule } } },
    rules: { "cuways/ownership": "error" },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@base-ui/*", "**/other-feature-private/**"],
              message: "Features consume public canonical components.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/design-system/**/*.{ts,tsx}"],
    ignores: ["**/*.stories.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "storybook/*",
                "@storybook/*",
                "**/features/**",
                "**/fixtures/**",
              ],
              message:
                "Reusable design-system runtime must remain workbench-independent.",
            },
          ],
        },
      ],
    },
  },
);
