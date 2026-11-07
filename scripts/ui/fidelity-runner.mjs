import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { serve } from "./server.mjs";
import {
  compareMeasured,
  freezeCssAnimations,
  pixelRegionDifference,
  captureStablePaint,
  originalEntryScenario,
  sceneCropBounds,
  fidelityRecordStatus,
} from "./fidelity-contracts.mjs";
import { captureKey, restoreCapture, storeCapture } from "./fidelity-cache.mjs";
import { fidelityArtifacts, digest } from "./runtime.mjs";
const base = path.resolve(".artifacts/ui");
const output = fidelityArtifacts(process.argv.includes("--diagnostic"));
const input = JSON.parse(fs.readFileSync(path.join(output, "input.json")));
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
// Canvas-only comparisons share one page; product contexts remain independent.
const comparisonPage = await browser.newPage();
const cache = path.join(base, "fidelity-cache/original");
const captureImplementation = captureKey([
  fs.readFileSync(new URL(import.meta.url), "utf8"),
  fs.readFileSync(new URL("./fidelity-cache.mjs", import.meta.url), "utf8"),
  fs.readFileSync(new URL("./fidelity-contracts.mjs", import.meta.url), "utf8"),
]);
let originalsReused = 0;
const progress = (phase, last) =>
  fs.writeFileSync(
    path.join(output, "progress.json"),
    JSON.stringify({
      sourceFingerprint: input.sourceFingerprint,
      phase,
      completed: records.length,
      total: input.scenarios.length * input.widths.length * input.themes.length,
      last,
    }),
  );
progress("capturing");
async function applyInteraction(page, kind, scenario) {
  if (input.interactionState === "initial") return;
  if (["jobs", "job-return", "product-jobs"].includes(input.interactionState)) {
    if (scenario.feature !== "026")
      throw Error("Proof job-entry capture requires US026");
    if (await page.getByRole("dialog").isVisible()) {
      await page.keyboard.press("Escape");
      await page.clock.runFor(250);
    }
    const back =
      input.interactionState === "product-jobs"
        ? page
            .getByRole("link", { name: /^(My Jobs|Jobs)$/ })
            .filter({ visible: true })
            .first()
        : page.getByRole("link", { name: "Back to My Jobs", exact: true });
    await back.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "My Jobs", exact: true }).waitFor();
    if (input.interactionState === "job-return") {
      await page
        .getByRole("button", { name: "Open delivery evidence", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("heading", { name: "Proof of delivery", exact: true })
        .waitFor();
    }
    await page.clock.runFor(100);
    return;
  }
  if (input.interactionState === "reconciled") {
    if (!["026", "027", "028"].includes(scenario.feature))
      throw Error(
        "Reconciliation capture requires a proof or task recovery scenario",
      );
    await page
      .getByRole("button", {
        name:
          scenario.feature === "026" ? "Check saved proof" : "Check job status",
        exact: true,
      })
      .click();
    if (kind === "original")
      await page.evaluate(
        (feature) =>
          window.postMessage(
            feature === "026"
              ? { namespace: "us026-demo", type: "resolve" }
              : {
                  channel: "cu-story-v1",
                  story: `US-${feature}`,
                  type: "resolve",
                },
            location.origin,
          ),
        scenario.feature,
      );
    await page.clock.runFor(1000);
    return;
  }
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await page.keyboard.press("Escape");
  // Advance the controlled animation clock, not the held operation.
  await page.clock.runFor(250);
  await dialog.waitFor({ state: "hidden", timeout: 10000 });
  if (input.interactionState === "reopened") {
    const progress = page.getByRole("button", {
      name: "View progress",
      exact: true,
    });
    if (scenario.feature === "026") {
      await page.clock.runFor(50);
      if (
        !(await progress.evaluate(
          (element) => element === document.activeElement,
        ))
      )
        throw Error("Proof dismissal did not restore View progress focus");
      // A keyboard reopening must not acquire Playwright's automatic click
      // scrolling, which is separate from the user's Enter action.
      await page.keyboard.press("Enter");
    } else await progress.click();
    await page.clock.runFor(100);
    await dialog.waitFor({ state: "visible", timeout: 10000 });
  }
}
// Browser canvas decodes the PNGs already produced by Playwright. No second
// screenshot engine, platform font substitution or automatic reference update.
async function pixelDifference(before, after, destination) {
  const page = comparisonPage;
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
            ...[0, 1, 2, 3].map((k) => Math.abs(x.data[i + k] - y.data[i + k])),
          ) > 16;
        if (changed) pixels++;
        diff.data[i] = changed ? 230 : Math.round(y.data[i] * 0.2 + 204);
        diff.data[i + 1] = changed ? 25 : Math.round(y.data[i + 1] * 0.2 + 204);
        diff.data[i + 2] = changed ? 75 : Math.round(y.data[i + 2] * 0.2 + 204);
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
      a: "data:image/png;base64," + fs.readFileSync(before).toString("base64"),
      b: "data:image/png;base64," + fs.readFileSync(after).toString("base64"),
    },
  );
  fs.writeFileSync(destination, Buffer.from(result.png, "base64"));
  delete result.png;
  return result;
}
async function cropScene(png, clip) {
  const encoded = await comparisonPage.evaluate(
    async ({ source, clip }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = clip.width;
      canvas.height = clip.height;
      canvas
        .getContext("2d")
        .drawImage(
          image,
          clip.x,
          clip.y,
          clip.width,
          clip.height,
          0,
          0,
          clip.width,
          clip.height,
        );
      return canvas.toDataURL("image/png").split(",")[1];
    },
    { source: "data:image/png;base64," + png.toString("base64"), clip },
  );
  return Buffer.from(encoded, "base64");
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
          interactionState: input.interactionState,
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
            : `-${input.height}-${input.textScale}-${input.material}-${input.fixture}-${input.reducedMotion ? "rm" : "motion"}-${input.reducedTransparency ? "rt" : "transparency"}`) +
          (input.interactionState !== "initial"
            ? `-${input.interactionState}`
            : "");
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
            interactionState: input.interactionState,
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
          const cropRegions = {};
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
              ? `${original.url}/${scenario.source}?scenario=${originalEntryScenario(scenario)}&fixture=${input.fixture}&theme=${theme}&material=${input.material}&textScale=${input.textScale}&responseMode=hold&timing=hold`
              : `${candidate.url}/iframe.html?id=${scenario.story}&args=fixture:${input.fixture};timing:${input.interactionState === "reconciled" ? "auto" : "hold"}&globals=theme:${theme};material:${input.material};textScale:${input.textScale}`;
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
            // Legacy interactions rebuild chrome. Apply the declared human
            // correction to the resulting scene, not to discarded markup.
            await applyInteraction(p, kind, scenario);
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
          if (kind === "react") await applyInteraction(p, kind, scenario);
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
            proofJobEntry:
              kind === "original"
                ? ".jobs-placeholder"
                : '[data-ui="JobEntry"]',
            proofEmptyState:
              kind === "original"
                ? ".proof-workspace .empty-state"
                : '[data-ui="EmptyState"][data-variant="proof"]',
            proofProgress:
              scenario.feature === "026" &&
              ["dismissed", "jobs", "job-return", "product-jobs"].includes(
                input.interactionState,
              )
                ? kind === "original"
                  ? ".cu-operation"
                  : '[data-ui="ProofProgress"] [data-ui="OperationNotice"]'
                : ":not(*)",
            dialogTitle:
              kind === "original"
                ? "dialog[open] h2"
                : '[data-ui="ContentDialog"] h2',
            page: "main",
            context: "main",
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
          if (
            scenario.feature === "026" &&
            input.interactionState !== "initial"
          )
            measures.focus = await p.evaluate(() =>
              document.activeElement instanceof HTMLInputElement
                ? `input:${document.activeElement.labels?.[0]?.textContent?.trim() ?? ""}`
                : (document.activeElement?.textContent?.trim() ?? ""),
            );
          if (
            scenario.feature === "026" &&
            input.interactionState !== "initial"
          )
            measures.focusPaint = await p.evaluate(() => {
              const focused = document.activeElement;
              if (focused?.tagName !== "MAIN") return null;
              const paint = getComputedStyle(focused);
              return {
                style: paint.outlineStyle,
                width: paint.outlineWidth,
                color: paint.outlineColor,
                offset: paint.outlineOffset,
              };
            });
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
            if (
              ![
                "page",
                "heading",
                "navigation",
                "dock",
                "dialogTitle",
              ].includes(name)
            ) {
              const crop = `${prefix}-${kind}-${name}.png`;
              const level = ["context", "taskContext"].includes(name)
                ? "context"
                : "component";
              const obscured = await element.evaluate((node) => {
                const dialog = document.querySelector(
                  'dialog[open],[role="dialog"]',
                );
                return Boolean(dialog && !dialog.contains(node));
              });
              cropRegions[name] = {
                image: null,
                level,
                visibility: obscured ? "modal-obscured" : "unobscured",
                treatment:
                  name === "header"
                    ? "Isolated header excludes only external proof-page focus outline; real page/focusPaint retain it"
                    : "External application chrome hidden for local component/context inspection",
              };
              // Pin the measured node before screenshot-only visibility styles
              // can change which matching header is considered visible.
              const capturedElement = await element.elementHandle();
              if (!capturedElement)
                throw Error(`Capture boundary detached: ${name}`);
              crops.push({ owner: name, element: capturedElement, crop });
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
          const freezing = p.evaluate(freezeCssAnimations);
          await p.clock.runFor(34);
          let animationDeadline;
          const frozenAnimations = await Promise.race([
            freezing,
            new Promise((_, reject) => {
              animationDeadline = setTimeout(
                () =>
                  reject(
                    Error("Animation pause did not settle within two seconds"),
                  ),
                2000,
              );
            }),
          ]).finally(() => clearTimeout(animationDeadline));
          const captureLevel = measures.dialog
            ? "viewport with open dialog"
            : "full page";
          // A frozen JS clock can leave a portal's compositor frame pending even
          // after its DOM geometry settles. Require consecutive identical paints;
          // bounded frame advancement stays below simulated operation deadlines.
          const pagePaint = await captureStablePaint(p, () =>
            p.screenshot({
              fullPage: !measures.dialog,
              animations: "allow",
            }),
          );
          const stable = pagePaint.png,
            stabilityFrames = pagePaint.frames;
          if (!pagePaint.stable) {
            failures.push(
              "Page paint did not stabilize within eight capture frames",
            );
          }
          fs.writeFileSync(path.join(output, image), stable);
          // Local crops share one pixel phase and never scroll the product.
          // Keep the real page above; only this scene hides external chrome.
          const initialScroll = await p.evaluate(() => ({
            x: scrollX,
            y: scrollY,
          }));
          const scenePaint = await captureStablePaint(p, () =>
            p.screenshot({
              fullPage: !measures.dialog,
              animations: "allow",
              style:
                '.cu-bar--top,.cu-bar--bottom,.product-action-tray,[data-ui="ApplicationHeader"],[data-ui="ApplicationDock"]{visibility:hidden!important}',
            }),
          );
          if (!scenePaint.stable)
            failures.push(
              "Local scene paint did not stabilize within eight capture frames",
            );
          const sceneImage = prefix + "-" + kind + "-scene.png";
          fs.writeFileSync(path.join(output, sceneImage), scenePaint.png);
          const scene = {
            image: sceneImage,
            imageSha256: digest(scenePaint.png),
            width: scenePaint.png.readUInt32BE(16),
            height: scenePaint.png.readUInt32BE(20),
            origin: measures.dialog
              ? { x: 0, y: 0 }
              : { x: -initialScroll.x, y: -initialScroll.y },
            scroll: initialScroll,
            viewport: { width, height: input.height },
            captureLevel: measures.dialog ? "viewport" : "full page",
            stabilityFrames: scenePaint.frames,
          };
          const afterScene = await p.evaluate(() => ({
            x: scrollX,
            y: scrollY,
            ratio: devicePixelRatio,
          }));
          if (
            afterScene.x !== initialScroll.x ||
            afterScene.y !== initialScroll.y ||
            afterScene.ratio !== 1
          )
            failures.push(
              "Scene capture changed scroll or has an unsupported pixel ratio",
            );
          for (const { owner, crop } of crops.filter(
            ({ owner }) => owner !== "header",
          )) {
            const region = cropRegions[owner];
            Object.assign(region, {
              method: "scene",
              ...sceneCropBounds(measures[owner], scene),
            });
            if (region.availability === "offscreen") continue;
            fs.writeFileSync(
              path.join(output, crop),
              await cropScene(scenePaint.png, region.clip),
            );
            region.image = crop;
            captureFiles.push(crop);
          }
          // The sole isolated element capture runs after all scene crops are
          // frozen. Its scroll cannot alter their overlay or fixed-tray positions.
          for (const { owner, element, crop } of crops.filter(
            ({ owner }) => owner === "header",
          )) {
            await p.clock.runFor(34);
            const headerPaint = await captureStablePaint(p, () =>
              element.screenshot({
                animations: "allow",
                style:
                  '#story-main:focus-visible,[data-ui="Page"][data-kind="proof"]:focus-visible{outline:none!important}',
              }),
            );
            if (!headerPaint.stable)
              failures.push(
                "Header paint did not stabilize within eight capture frames",
              );
            fs.writeFileSync(path.join(output, crop), headerPaint.png);
            Object.assign(cropRegions[owner], {
              method: "isolated-header",
              availability: "captured",
              clip: null,
              image: crop,
              stabilityFrames: headerPaint.frames,
            });
            captureFiles.push(crop);
          }
          const state = {
            kind,
            url,
            image,
            imageSha256: digest(stable),
            measures,
            failures,
            stabilityFrames,
            frozenAnimations,
            animationTreatment:
              "CSS animation pause tasks awaited before freezing frame zero; paused/pending/time state recorded. Requested media remains unchanged. Motion behavior needs separate interaction checks.",
            captureLevel,
            scene,
            cropTreatment:
              "Local crops derive from one stable chrome-hidden scene without scrolling. Viewport clipping/offscreen and modal occlusion remain explicit; hidden content is unproven. Isolated header excludes external proof-page focus outline after scene capture. Real page/focusPaint retain focus/chrome.",
            sourceTreatment:
              kind === "original" &&
              input.navigationOverride &&
              ["027", "028", "034"].includes(scenario.feature)
                ? "Immutable original runtime with declared human product-navigation correction, rendered using its own original nav primitives; original files unchanged"
                : kind === "original" &&
                    originalEntryScenario(scenario) !== scenario.legacy
                  ? "Unmodified runtime selected through its existing authoring protocol from an inert list bootstrap; direct R13 URL would start a read outside write-hold mode"
                  : "unmodified runtime",
            crops: captureFiles,
            cropRegions,
            cropHashes: Object.fromEntries(
              captureFiles.map((file) => [
                file,
                digest(fs.readFileSync(path.join(output, file))),
              ]),
            ),
          };
          record.states.push(state);
          if (kind === "original")
            storeCapture(
              cache,
              key,
              output,
              [...captureFiles, image, sceneImage],
              state,
            );
          await context.close();
        }
        const [a, b] = record.states;
        if (a.failures.length || b.failures.length)
          record.differences.push({
            type: "setup",
            details: [...a.failures, ...b.failures],
          });
        record.differences.push(...compareMeasured(a.measures, b.measures));
        record.diff = `${prefix}-diff.png`;
        record.pixel = await pixelDifference(
          path.join(output, a.image),
          path.join(output, b.image),
          path.join(output, record.diff),
        );
        record.diffSha256 = digest(
          fs.readFileSync(path.join(output, record.diff)),
        );
        const pageDifference = pixelRegionDifference(record.pixel);
        if (pageDifference) record.differences.push(pageDifference);
        record.regionComparisons = [];
        for (const owner of new Set([
          ...Object.keys(a.cropRegions),
          ...Object.keys(b.cropRegions),
        ])) {
          const left = a.cropRegions[owner],
            right = b.cropRegions[owner];
          if (!left || !right) {
            const difference = {
              owner,
              reason: "missing named crop counterpart",
            };
            record.regionComparisons.push({
              ...difference,
              original: left ?? null,
              react: right ?? null,
            });
            record.differences.push(difference);
            continue;
          }
          if (
            left.availability === "offscreen" ||
            right.availability === "offscreen"
          ) {
            const availability = {
              original: left.availability,
              react: right.availability,
            };
            record.regionComparisons.push({
              owner,
              level: left.level,
              original: left.image,
              react: right.image,
              visibility: {
                original: left.visibility,
                react: right.visibility,
              },
              availability,
              status:
                left.availability === right.availability
                  ? "uncaptured-offscreen"
                  : "different-availability",
              inspection:
                "No pixels captured for an offscreen region; hidden detail remains unproven",
            });
            record.differences.push({
              type: "coverage",
              owner,
              reason: "offscreen region uncaptured",
              availability,
            });
            if (left.availability !== right.availability)
              record.differences.push({
                type: "correspondence",
                owner,
                reason: "crop availability differs",
                availability,
              });
            continue;
          }
          const diffImage = prefix + "-diff-" + owner + ".png";
          const pixels = await pixelDifference(
            path.join(output, left.image),
            path.join(output, right.image),
            path.join(output, diffImage),
          );
          const difference = pixelRegionDifference(pixels, {
            owner,
            level: left.level,
          });
          const visibilityMismatch = left.visibility !== right.visibility;
          record.regionComparisons.push({
            owner,
            level: left.level,
            original: left.image,
            react: right.image,
            diff: diffImage,
            diffSha256: digest(fs.readFileSync(path.join(output, diffImage))),
            visibility: { original: left.visibility, react: right.visibility },
            availability: {
              original: left.availability,
              react: right.availability,
            },
            pixel: pixels,
            status:
              difference || visibilityMismatch
                ? "different"
                : "pixel-match; inspection required",
            inspection:
              left.visibility === "modal-obscured" ||
              right.visibility === "modal-obscured"
                ? "Obscured context only; does not establish detail inspection of the background"
                : "not inspected",
          });
          if (difference) record.differences.push(difference);
          if (left.availability !== right.availability)
            record.differences.push({
              owner,
              reason: "crop availability differs",
            });
          if (visibilityMismatch)
            record.differences.push({
              owner,
              reason: "crop visibility differs",
            });
        }
        record.status = fidelityRecordStatus(record.differences);
        records.push(record);
        progress("capturing", {
          story: record.story,
          width,
          theme,
          status: record.status,
          images: record.states.map((state) => state.image),
        });
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
    `Selected ${input.interactionState} state only; uncaptured transitions remain unproven.`,
    "Legacy non-US025 navigation requires explicit human override; not automatically accepted.",
  ],
  knownOverrides: JSON.parse(fs.readFileSync("reference/original.json", "utf8"))
    .overrides,
};
fs.writeFileSync(
  path.join(output, "report.json"),
  JSON.stringify(report, null, 2),
);
progress("completed");
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
