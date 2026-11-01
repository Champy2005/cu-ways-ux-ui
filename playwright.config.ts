import { defineConfig } from "@playwright/test";
const output = process.env.UI_RUN_DIR ?? ".artifacts/ui/current";
export default defineConfig({
  testDir: "./scripts/ui",
  testMatch: "rendered.spec.mjs",
  workers: 1,
  retries: 0,
  updateSnapshots: "none",
  timeout: 900000,
  outputDir: `${output}/playwright`,
  reporter: [["list"], ["json", { outputFile: `${output}/playwright.json` }]],
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
