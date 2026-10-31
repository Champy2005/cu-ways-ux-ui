export default {
  plugins: ["stylelint-declaration-strict-value"],
  ignoreFiles: ["node_modules/**", "storybook-static/**", ".artifacts/**"],
  rules: {
    "color-no-invalid-hex": true,
    "declaration-block-no-duplicate-properties": true,
    "selector-disallowed-list": [
      "/:global/",
      "/\\[data-ui[^\\]]*(LifecycleBadge|Action|ContentDialog)/",
    ],
  },
  overrides: [
    {
      files: ["src/**/*.css"],
      excludedFiles: ["src/design-system/tokens/**"],
      rules: {
        "scale-unlimited/declaration-strict-value": [
          ["/color$/", "background", "box-shadow"],
          {
            ignoreValues: ["transparent", "currentColor", "none", "inherit"],
            disableFix: true,
          },
        ],
      },
    },
  ],
};
