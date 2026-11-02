import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { serve } from "./server.mjs";
import { compareMeasured } from "./fidelity-contracts.mjs";
const base = path.resolve(".artifacts/ui");
const input = JSON.parse(
  fs.readFileSync(path.join(base, "fidelity-input.json")),
);
const output = path.join(base, "fidelity");
fs.mkdirSync(output, { recursive: true });
const original = await serve(
  path.join(base, "original/source"),
  0,
  input.reference,
);
const candidate = await serve(
  path.resolve("storybook-static"),
  0,
  input.sourceFingerprint,
);
const browser = await chromium.launch();
const records = [];
// Browser canvas decodes the PNGs already produced by Playwright. No second
// screenshot engine, platform font substitution or automatic reference update.
async function pixelDifference(before, after, destination) {
  const page = await browser.newPage();
  try {
    const result = await page.evaluate(
      async ({ a, b }) => {
        const load = async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          return image;
        };
        const [left, right] = await Promise.all([load(a), load(b)]);
        const width = Math.max(left.width, right.width),
          height = Math.max(left.height, right.height);
        const render = (image) => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          const x = c.getContext("2d");
          x.fillStyle = "#fff";
          x.fillRect(0, 0, width, height);
          x.drawImage(image, 0, 0);
          return x.getImageData(0, 0, width, height);
        };
        const x = render(left),
          y = render(right),
          canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d"),
          diff = ctx.createImageData(width, height);
        let pixels = 0;
        for (let i = 0; i < x.data.length; i += 4) {
          const changed =
            Math.max(
              ...[0, 1, 2, 3].map((k) =>
                Math.abs(x.data[i + k] - y.data[i + k]),
              ),
            ) > 16;
          if (changed) pixels++;
          diff.data[i] = changed ? 230 : Math.round(y.data[i] * 0.2 + 204);
          diff.data[i + 1] = changed
            ? 25
            : Math.round(y.data[i + 1] * 0.2 + 204);
          diff.data[i + 2] = changed
            ? 75
            : Math.round(y.data[i + 2] * 0.2 + 204);
          diff.data[i + 3] = 255;
        }
        ctx.putImageData(diff, 0, 0);
        return {
          pixels,
          ratio: pixels / (width * height),
          width,
          height,
          original: [left.width, left.height],
          candidate: [right.width, right.height],
          png: canvas.toDataURL().split(",")[1],
        };
      },
      {
        a:
          "data:image/png;base64," + fs.readFileSync(before).toString("base64"),
        b: "data:image/png;base64," + fs.readFileSync(after).toString("base64"),
      },
    );
    fs.writeFileSync(destination, Buffer.from(result.png, "base64"));
    delete result.png;
    return result;
  } finally {
    await page.close();
  }
}
try {
  for (const scenario of input.scenarios)
    for (const width of input.widths)
      for (const theme of input.themes) {
        const record = {
          story: scenario.story,
          width,
          theme,
          states: [],
          differences: [],
        };
        for (const kind of ["original", "react"]) {
          const context = await browser.newContext({
            viewport: { width, height: input.height },
            locale: "en-GB",
            timezoneId: "Asia/Bangkok",
            deviceScaleFactor: 1,
          });
          await context.addInitScript(() => {
            window.__UI_CAPTURE__ = true;
            localStorage.clear();
            sessionStorage.clear();
          });
          const p = await context.newPage();
          // Freeze simulated reads as well as writes: the legacy host otherwise
          // resolves some recovery scenes while several crops are being taken.
          const epoch = Date.parse("2026-10-28T07:20:00Z");
          await p.clock.install({ time: new Date(epoch) });
          await p.clock.pauseAt(new Date(epoch + 1000));
          const failures = [];
          p.on("pageerror", (e) => failures.push(e.message));
          p.on("response", (r) => {
            if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
          });
          const url =
            kind === "original"
              ? `${original.url}/${scenario.source}?scenario=${scenario.legacy}&fixture=standard&theme=${theme}&material=${input.material}&textScale=100&responseMode=hold&timing=hold`
              : `${candidate.url}/iframe.html?id=${scenario.story}&globals=theme:${theme};material:${input.material};textScale:100`;
          await p.goto(url);
          await p.clock.runFor(100);
          await p.locator("main").first().waitFor();
          if (kind === "original") {
            await p.evaluate(
              ({ feature, legacy, theme, material }) => {
                const send = (data) =>
                  window.postMessage(data, location.origin);
                if (feature === "025")
                  send({
                    type: "cuways-demo-settings",
                    settings: {
                      scenarioId: legacy,
                      fixtureName: "standard",
                      responseMode: "hold",
                      theme,
                      material,
                      textScale: "100",
                    },
                  });
                else if (feature === "026") {
                  send({
                    namespace: "us026-demo",
                    type: "configure",
                    config: {
                      responseMode: "manual",
                      theme,
                      material,
                      textScale: "100",
                    },
                  });
                  send({
                    namespace: "us026-demo",
                    type: "select-scenario",
                    scenarioId: legacy,
                  });
                } else
                  send({
                    channel: "cu-story-v1",
                    story: `US-${feature}`,
                    type: "configure",
                    settings: {
                      scenario: legacy,
                      timing: "hold",
                      theme,
                      material,
                      textScale: "100",
                    },
                  });
              },
              {
                feature: scenario.feature,
                legacy: scenario.legacy,
                theme,
                material: input.material,
              },
            );
            await p.waitForFunction(
              (id) => document.documentElement.dataset.selectedScenario === id,
              scenario.legacy,
            );
          }
          await p.evaluate(() => document.fonts.ready);
          const layoutReady = p.evaluate(
            () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              ),
          );
          await p.clock.runFor(50);
          await layoutReady;
          const regions = {
            page: "main",
            header: "header",
            heading: "main h1",
            navigation: "header nav",
            dialog: '[role="dialog"],dialog[open]',
            contract:
              kind === "original" ? ".action-panel" : '[data-ui="JobContract"]',
            surveys:
              kind === "original"
                ? ".context-card"
                : '[data-ui="SurveyContext"]',
            jobCard:
              kind === "original" ? ".job-card" : '[data-ui="JobSummary"]',
          };
          const measures = {};
          for (const [name, selector] of Object.entries(regions)) {
            const element = p
              .locator(selector)
              .filter({ visible: true })
              .first();
            if (!(await element.count())) continue;
            measures[name] = await element.evaluate((e) => {
              const r = e.getBoundingClientRect(),
                s = getComputedStyle(e);
              return {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                font: s.fontSize,
                weight: s.fontWeight,
                padding: s.padding,
                contentPadding: getComputedStyle(
                  e.querySelector(".dialog-inner") ?? e,
                ).padding,
                text: e.textContent.trim(),
                color: s.color,
                fill: s.backgroundColor,
              };
            });
            if (
              ["header", "dialog", "contract", "surveys", "jobCard"].includes(
                name,
              )
            )
              await element.screenshot({
                path: path.join(
                  output,
                  `${scenario.story}-${width}-${theme}-${kind}-${name}.png`,
                ),
                animations: "disabled",
              });
          }
          measures.rootFont = await p.evaluate(
            () => getComputedStyle(document.documentElement).fontSize,
          );
          measures.actions = await p
            .locator("button,a")
            .filter({ visible: true })
            .evaluateAll((es) =>
              es
                .filter(
                  (e) =>
                    !document.querySelector('dialog[open],[role="dialog"]') ||
                    document
                      .querySelector('dialog[open],[role="dialog"]')
                      .contains(e),
                )
                .filter((e) =>
                  ["Start job", "Refresh job"].includes(e.textContent.trim()),
                )
                .map((e) => ({
                  text: e.textContent.trim(),
                  width: e.getBoundingClientRect().width,
                  height: e.getBoundingClientRect().height,
                })),
            );
          const image = `${scenario.story}-${width}-${theme}-${kind}.png`;
          await p.screenshot({
            path: path.join(output, image),
            fullPage: true,
            animations: "disabled",
          });
          record.states.push({ kind, url, image, measures, failures });
          await context.close();
        }
        const [a, b] = record.states;
        if (a.failures.length || b.failures.length)
          record.differences.push({
            type: "setup",
            details: [...a.failures, ...b.failures],
          });
        record.differences.push(...compareMeasured(a.measures, b.measures));
        record.pixel = await pixelDifference(
          path.join(output, a.image),
          path.join(output, b.image),
          path.join(output, `${scenario.story}-${width}-${theme}-diff.png`),
        );
        if (record.pixel.ratio > 0.0001)
          record.differences.push({
            owner: "page-pixels",
            changedPixels: record.pixel.pixels,
            ratio: record.pixel.ratio,
          });
        record.status = record.differences.some((d) => d.type === "setup")
          ? "inconclusive"
          : record.differences.length
            ? "different"
            : "measurement-match; image inspection required";
        records.push(record);
      }
} finally {
  await browser.close();
  await original.close();
  await candidate.close();
}
const report = {
  reference: input.reference,
  sourceFingerprint: input.sourceFingerprint,
  environment:
    process.platform === "linux"
      ? "pinned Linux renderer"
      : "exploratory native; not canonical",
  records,
  acceptance: "not granted",
  limitations: [
    "Initial states only; transition mappings remain to implement.",
    "Legacy non-US025 navigation requires explicit human override; not automatically accepted.",
  ],
};
fs.writeFileSync(
  path.join(output, "report.json"),
  JSON.stringify(report, null, 2),
);
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
fs.writeFileSync(
  path.join(output, "review.html"),
  `<html><meta charset="utf-8"><style>body{font:14px system-ui}section{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{max-width:100%}</style><h1>Original / React — fidelity not accepted</h1>${records.map((r) => `<h2>${escape(r.story)} ${r.width} ${r.theme}</h2><section>${r.states.map((s) => `<div>${s.kind}<a href="${s.image}"><img src="${s.image}"></a></div>`).join("")}</section><pre>${escape(JSON.stringify(r.differences, null, 2))}</pre>`).join("")}`,
);
console.log(
  JSON.stringify({
    records: records.length,
    different: records.filter((r) => r.status === "different").length,
    inconclusive: records.filter((r) => r.status === "inconclusive").length,
  }),
);
