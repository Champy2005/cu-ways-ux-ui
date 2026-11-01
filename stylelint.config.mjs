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
      files: ["src/features/**/*.css"],
      rules: {
        "selector-max-type": 0,
        "selector-max-universal": 0,
        "selector-disallowed-list": ["/:global/", "/\\[data-ui/"],
        "property-disallowed-list": [
          "font-family",
          "font",
          "/^--(status|action|surface|text|link|feedback|warning|error|border|depth)/",
        ],
      },
    },
    {
      files: ["src/**/*.css"],
      excludedFiles: ["src/design-system/tokens/**"],
      rules: {
        "color-named": "never",
        "declaration-property-value-disallowed-list": {
          "/^(border|outline)(-.+)?$/": [
            "/#[a-fA-F0-9]{3,8}\\b/",
            "/\\b(?:rgba?|hsla?|oklch|color)\\(/",
          ],
        },
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
