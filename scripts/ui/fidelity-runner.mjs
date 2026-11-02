import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { serve } from "./server.mjs";
import { compareMeasured } from "./fidelity-contracts.mjs";
import { captureKey, restoreCapture, storeCapture } from "./fidelity-cache.mjs";
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
const cache = path.join(base, "fidelity-cache/original");
const captureImplementation = captureKey([
  fs.readFileSync(new URL(import.meta.url), "utf8"),
  fs.readFileSync(new URL("./fidelity-cache.mjs", import.meta.url), "utf8"),
]);
let originalsReused = 0;
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
          height: input.height,
          textScale: input.textScale,
          fixture: input.fixture,
          material: input.material,
          reducedMotion: input.reducedMotion,
          reducedTransparency: input.reducedTransparency,
          states: [],
          differences: [],
        };
        const defaultSettings =
          input.height === 900 &&
          input.textScale === 100 &&
          input.material === "opaque" &&
          input.fixture === "standard" &&
          !input.reducedMotion &&
          !input.reducedTransparency;
        const prefix =
          `${scenario.story}-${width}-${theme}` +
          (defaultSettings
            ? ""
            : `-${input.height}-${input.textScale}-${input.material}-${input.fixture}-${input.reducedMotion ? "rm" : "motion"}-${input.reducedTransparency ? "rt" : "transparency"}`);
        for (const kind of ["original", "react"]) {
          const key = captureKey({
            reference: input.reference,
            scenario,
            width,
            height: input.height,
            theme,
            material: input.material,
            textScale: input.textScale,
            fixture: input.fixture,
            reducedMotion: input.reducedMotion,
            reducedTransparency: input.reducedTransparency,
            environment: input.environment,
            browser: browser.version(),
            captureImplementation,
            navigationOverride: input.navigationOverride,
          });
          if (kind === "original") {
            const cached = restoreCapture(cache, key, output);
            if (cached) {
              record.states.push({
                ...cached,
                cache: "verified original reused",
              });
              originalsReused++;
              continue;
            }
          }
          const captureFiles = [];
          const crops = [];
          const context = await browser.newContext({
            viewport: { width, height: input.height },
            locale: "en-GB",
            timezoneId: "Asia/Bangkok",
            deviceScaleFactor: 1,
            reducedMotion: input.reducedMotion ? "reduce" : "no-preference",
          });
          await context.addInitScript(() => {
            window.__UI_CAPTURE__ = true;
            localStorage.clear();
            sessionStorage.clear();
          });
          const p = await context.newPage();
          if (input.reducedTransparency) {
            const session = await context.newCDPSession(p);
            await session.send("Emulation.setEmulatedMedia", {
              features: [
                { name: "prefers-reduced-transparency", value: "reduce" },
                {
                  name: "prefers-reduced-motion",
                  value: input.reducedMotion ? "reduce" : "no-preference",
                },
              ],
            });
          }
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
              ? `${original.url}/${scenario.source}?scenario=${scenario.legacy}&fixture=${input.fixture}&theme=${theme}&material=${input.material}&textScale=${input.textScale}&responseMode=hold&timing=hold`
              : `${candidate.url}/iframe.html?id=${scenario.story}&args=fixture:${input.fixture}&globals=theme:${theme};material:${input.material};textScale:${input.textScale}`;
          await p.goto(url);
          await p.clock.runFor(100);
          await p.locator("main").first().waitFor();
          if (kind === "original") {
            await p.evaluate(
              ({
                feature,
                legacy,
                theme,
                material,
                fixture,
                textScale,
                reducedMotion,
                reducedTransparency,
              }) => {
                const send = (data) =>
                  window.postMessage(data, location.origin);
                if (feature === "025")
                  send({
                    type: "cuways-demo-settings",
                    settings: {
                      scenarioId: legacy,
                      fixtureName: fixture,
                      responseMode: "hold",
                      theme,
                      material,
                      textScale: String(textScale),
                      reducedMotion,
                      reducedTransparency,
                    },
                  });
                else if (feature === "026") {
                  send({
                    namespace: "us026-demo",
                    type: "configure",
                    config: {
                      responseMode: "manual",
                      fixtureId: fixture,
                      theme,
                      material,
                      textScale: String(textScale),
                      reducedMotion,
                      reducedTransparency,
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
                      fixture,
                      timing: "hold",
                      theme,
                      material,
                      textScale: String(textScale),
                      motion: reducedMotion,
                      transparency: reducedTransparency,
                    },
                  });
              },
              {
                feature: scenario.feature,
                legacy: scenario.legacy,
                theme,
                material: input.material,
                fixture: input.fixture,
                textScale: input.textScale,
                reducedMotion: input.reducedMotion,
                reducedTransparency: input.reducedTransparency,
              },
            );
            await p.waitForFunction(
              (id) => document.documentElement.dataset.selectedScenario === id,
              scenario.legacy,
            );
            if (
              input.navigationOverride &&
              ["027", "028", "034"].includes(scenario.feature)
            ) {
              await p.evaluate(
                async ({ feature, labels, responsiveSource }) => {
                  const {
                    navItem,
                    fitCompactNavigation,
                    positionNavigationTile,
                  } = await import(location.origin + "/theme/components.mjs");
                  const icons = [
                      "home",
                      "services",
                      "jobs",
                      "invites",
                      "profile",
                    ],
                    short = ["Home", "Services", "Jobs", "Invites", "Profile"],
                    active = feature === "034" ? "profile" : "jobs";
                  const items = (compact) =>
                    labels
                      .map((label, index) =>
                        navItem(compact ? short[index] : label, icons[index], {
                          href: "#" + icons[index],
                          active: icons[index] === active,
                        }),
                      )
                      .join("");
                  const desktop = document.querySelector(".cu-nav--desktop"),
                    bottom = document.querySelector(".cu-bottom-nav");
                  if (desktop)
                    desktop.innerHTML =
                      '<span class="cu-nav-tile" aria-hidden="true"></span>' +
                      items(false);
                  if (bottom) {
                    bottom.innerHTML = items(true);
                    fitCompactNavigation(bottom);
                  }
                  // The corrected product navigation inherits the original
                  // US025 enlarged-reading chrome contract, not the obsolete
                  // feature-shortcut header. Keep this treatment explicit in
                  // the reference descriptor and capture receipt.
                  const source = await fetch("/" + responsiveSource).then((r) =>
                    r.text(),
                  );
                  const sheet = new CSSStyleSheet();
                  sheet.replaceSync(source);
                  const rules = [...sheet.cssRules].filter(
                    (rule) =>
                      rule.selectorText?.startsWith(
                        "html:not([data-text-scale=",
                      ) &&
                      /cu-header|mobile-bottom-navigation/.test(
                        rule.selectorText,
                      ),
                  );
                  const style = document.createElement("style");
                  style.dataset.referenceOverride =
                    "product-navigation-reading-size";
                  style.textContent = rules
                    .map((rule) =>
                      rule.cssText
                        .replaceAll(".cu-header ", ".cu-bar--top ")
                        .replaceAll(
                          "[data-header-control='menu']",
                          "[data-shell='menu']",
                        )
                        .replaceAll(
                          '[data-header-control="menu"]',
                          '[data-shell="menu"]',
                        )
                        .replaceAll(
                          ".mobile-bottom-navigation",
                          ".cu-bottom-nav",
                        ),
                    )
                    .join("\n");
                  document.head.append(style);
                  positionNavigationTile(desktop);
                  window.dispatchEvent(new Event("resize"));
                },
                {
                  feature: scenario.feature,
                  labels: input.navigationOverride.labels,
                  responsiveSource: input.navigationOverride.responsiveSource,
                },
              );
            }
          }
          await p.evaluate(() => document.fonts.ready);
          if (
            kind === "original" &&
            input.navigationOverride &&
            ["027", "028", "034"].includes(scenario.feature)
          )
            await p.evaluate(async () => {
              const { fitCompactNavigation, positionNavigationTile } =
                await import(location.origin + "/theme/components.mjs");
              fitCompactNavigation(document.querySelector(".cu-bottom-nav"));
              positionNavigationTile(
                document.querySelector(".cu-nav--desktop"),
              );
              window.dispatchEvent(new Event("resize"));
            });
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
            dock:
              kind === "original"
                ? ".cu-bottom-nav"
                : '[data-ui="ApplicationDock"]',
            dialog: '[role="dialog"],dialog[open]',
            contract:
              kind === "original" ? ".action-panel" : '[data-ui="JobContract"]',
            surveys:
              kind === "original"
                ? ".context-card"
                : '[data-ui="SurveyContext"]',
            jobCard:
              kind === "original" ? ".job-card" : '[data-ui="JobSummary"]',
            proofWorkspace:
              kind === "original"
                ? ".proof-workspace"
                : '[data-ui="ProofWorkspace"]',
            proofRecord:
              scenario.feature !== "026"
                ? ":not(*)"
                : kind === "original"
                  ? ".proof-row"
                  : '[data-ui="ProofRecord"]',
            proofLink:
              kind === "original"
                ? ".cu-evidence-link"
                : '[data-ui="ProofLink"]',
            evidence:
              scenario.feature !== "027"
                ? ":not(*)"
                : kind === "original"
                  ? ".story-grid--task > .card:last-child"
                  : '[data-ui="DeliveryEvidence"]',
            empty:
              kind === "original" ? ".list-empty" : '[data-ui="JobsEmpty"]',
            entitySummary:
              kind === "original"
                ? ".job-summary"
                : '[data-ui="EntitySummary"]',
            taskContext:
              kind === "original"
                ? ".story-grid--task,.proof-grid,.story-grid--reviews"
                : '[data-ui="Columns"]',
            reviews:
              kind === "original"
                ? ".review-history-card"
                : '[data-ui="ReviewHistory"]',
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
                children: [
                  ...e.querySelectorAll(
                    "h2,h3,strong,label,input,select,button,p,time,a,dt,dd",
                  ),
                ]
                  .slice(0, 40)
                  .map((child) => {
                    const b = child.getBoundingClientRect(),
                      c = getComputedStyle(child);
                    return {
                      tag: child.tagName,
                      text: child.textContent.trim().slice(0, 80),
                      x: b.x,
                      y: b.y,
                      width: b.width,
                      height: b.height,
                      font: c.fontSize,
                      line: c.lineHeight,
                      weight: c.fontWeight,
                      padding: c.padding,
                      margin: c.margin,
                      border: c.borderWidth,
                    };
                  }),
              };
            });
            if (!["page", "heading", "navigation", "dock"].includes(name)) {
              const crop = `${prefix}-${kind}-${name}.png`;
              crops.push({ element, crop });
              captureFiles.push(crop);
            }
          }
          if (measures.dialog)
            measures.backdrop = await p.evaluate((kind) => {
              const element = document.querySelector(
                kind === "original"
                  ? "dialog[open]"
                  : '[data-ui="ContentBackdrop"]',
              );
              if (!element) return null;
              const style = getComputedStyle(
                element,
                kind === "original" ? "::backdrop" : null,
              );
              // Normalize color-mix/rgba syntax to the same rendered RGBA.
              // Subtle scrim drift must not disappear under page pixel tolerance.
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 1;
              const context = canvas.getContext("2d");
              context.fillStyle = style.backgroundColor;
              context.fillRect(0, 0, 1, 1);
              return {
                fill: [...context.getImageData(0, 0, 1, 1).data].join(","),
                filter: style.backdropFilter,
              };
            }, kind);
          measures.rootFont = await p.evaluate(
            () => getComputedStyle(document.documentElement).fontSize,
          );
          measures.settings = await p.evaluate(() => ({
            theme: document.documentElement.dataset.cuTheme,
            textScale: document.documentElement.dataset.textScale,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
            reducedTransparency: matchMedia(
              "(prefers-reduced-transparency: reduce)",
            ).matches,
          }));
          if (
            measures.settings.theme !== theme ||
            measures.settings.textScale !== String(input.textScale) ||
            measures.settings.reducedMotion !== input.reducedMotion ||
            measures.settings.reducedTransparency !== input.reducedTransparency
          )
            failures.push(
              "Requested appearance/media settings were not applied",
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
          const image = `${prefix}-${kind}.png`;
          const captureLevel = measures.dialog
            ? "viewport with open dialog"
            : "full page";
          let previous,
            stable,
            stabilityFrames = 0;
          // A frozen JS clock can leave a portal's compositor frame pending even
          // after its DOM geometry settles. Require consecutive identical paints;
          // bounded frame advancement stays below simulated operation deadlines.
          for (let frame = 0; frame < 6; frame++) {
            await p.clock.runFor(17);
            const png = await p.screenshot({
              fullPage: !measures.dialog,
              animations: "disabled",
            });
            stabilityFrames++;
            if (previous?.equals(png)) {
              stable = png;
              break;
            }
            previous = png;
          }
          if (!stable) {
            failures.push(
              "Page paint did not stabilize within six capture frames",
            );
            stable = previous;
          }
          fs.writeFileSync(path.join(output, image), stable);
          // Element screenshots scroll targets into view. Take the untouched
          // page and all geometry first, so a below-fold crop cannot move the
          // original modal/backdrop and manufacture a full-page difference.
          for (const { element, crop } of crops)
            await element.screenshot({
              path: path.join(output, crop),
              animations: "disabled",
              style: crop.endsWith("-header.png")
                ? undefined
                : '.cu-bar--top,.cu-bar--bottom,[data-ui="ApplicationHeader"],[data-ui="ApplicationDock"]{visibility:hidden!important}',
            });
          const state = {
            kind,
            url,
            image,
            measures,
            failures,
            stabilityFrames,
            captureLevel,
            cropTreatment:
              "Close/context crops hide only external application chrome; full-page image retains it. Source and candidate boundaries are named separately and must be inspected.",
            sourceTreatment:
              kind === "original" &&
              input.navigationOverride &&
              ["027", "028", "034"].includes(scenario.feature)
                ? "Immutable original runtime with declared human product-navigation correction, rendered using its own original nav primitives; original files unchanged"
                : "unmodified runtime",
            crops: captureFiles,
          };
          record.states.push(state);
          if (kind === "original")
            storeCapture(cache, key, output, [...captureFiles, image], state);
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
          path.join(output, `${prefix}-diff.png`),
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
  originalsReused,
  selection: input.selection,
  acceptance: "not granted",
  limitations: [
    "Initial states only; transition mappings remain to implement.",
    "Legacy non-US025 navigation requires explicit human override; not automatically accepted.",
  ],
  knownOverrides: JSON.parse(fs.readFileSync("reference/original.json", "utf8"))
    .overrides,
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
