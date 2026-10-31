import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./scripts/ui",
  testMatch: "rendered.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 900000,
  outputDir: ".artifacts/ui/current/playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: ".artifacts/ui/current/playwright.json" }],
  ],
  snapshotPathTemplate:
    "{testDir}/../../.artifacts/ui/reference/images/{arg}{ext}",
  use: {
    headless: true,
    locale: "en-GB",
    timezoneId: "Asia/Bangkok",
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
