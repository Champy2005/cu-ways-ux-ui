import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { serve } from "./server.mjs";
import { digest, readJSON, writeJSON, current, root } from "./runtime.mjs";

import {
  visualProperties,
  compareEquivalent,
  compareProtected,
} from "./visual-contracts.mjs";
import { verifyRenderedInteractions } from "./rendered-interactions.mjs";

test("recovery and keyboard contracts", async ({ browser }) => {
  const server = await serve(path.join(root, "storybook-static"));
  try {
    const checks = await verifyRenderedInteractions(browser, server.url);
    writeJSON(path.join(current, "interactions.json"), { checks });
  } finally {
    await server.close();
  }
});

test("canonical scenario matrix, cross-instance contracts and protected boundaries", async ({
  browser,
}) => {
  const input = readJSON(path.join(current, "capture-input.json"));
  const output = path.join(current, "images");
  fs.mkdirSync(output, { recursive: true });
  const server = await serve(path.join(root, "storybook-static"));
  const records = [];
  const failures = [];
  const groups = new Map();
  const contexts = [];
  try {
    for (const theme of ["light", "dark"])
      for (const configuration of [
        ...input.viewports,
        ...(input.stress
          ? [
              { width: 320, height: 568, stress: "narrow" },
              { width: 2560, height: 1347, stress: "large" },
              { width: 390, height: 568, stress: "text", textScale: 200 },
              { width: 390, height: 844, stress: "opaque", opaque: true },
            ]
          : []),
      ]) {
        const viewport = {
          width: configuration.width,
          height: configuration.height,
        };
        const context = await browser.newContext({
          viewport,
          locale: "en-GB",
          timezoneId: "Asia/Bangkok",
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        contexts.push(context);
        await context.addInitScript(() => {
          window.__UI_CAPTURE__ = true;
        });
        const page = await context.newPage();
        if (configuration.opaque) {
          const cdp = await context.newCDPSession(page);
          await cdp.send("Emulation.setEmulatedMedia", {
            features: [
              { name: "prefers-reduced-transparency", value: "reduce" },
              { name: "prefers-reduced-motion", value: "reduce" },
            ],
          });
        }
        for (const story of input.stories.filter(
          (s) =>
            !configuration.stress ||
            [
              "system--contracts",
              "us025--l-02",
              "us025--d-02",
              "us026--a-02",
              "us027--a-04",
              "us028--a-04",
              "us034--a-04",
            ].includes(s.id),
        )) {
          const key = `${story.id}__${theme}__${viewport.width}x${viewport.height}${configuration.stress ? "__" + configuration.stress : ""}`;
          const record = {
            key,
            story: story.id,
            theme,
            viewport,
            stress: configuration.stress,
            images: [],
            invariants: [],
            status: "unchanged",
            errors: [],
          };
          try {
            await page.goto(
              `${server.url}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}${configuration.stress && story.id.startsWith("us025--") ? "&args=fixture:long" : ""}`,
              { waitUntil: "domcontentloaded" },
            );
            await page.locator('[data-ui="preview"] > *').first().waitFor();
            await page.evaluate(async () => {
              await document.fonts.ready;
              await new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              );
            });
            if (configuration.textScale)
              await page.evaluate((scale) => {
                document.documentElement.style.fontSize = `${scale}%`;
                document.documentElement.dataset.textScale = String(scale);
              }, configuration.textScale);
            const contentProblems = await page.evaluate(() => {
              const issues = [];
              for (const link of document.querySelectorAll(
                '[data-ui="InlineLink"], [data-ui="ProofLink"]',
              )) {
                const probe = document.createElement("span");
                probe.style.color = "var(--link-inline)";
                link.append(probe);
                if (
                  getComputedStyle(link).color !== getComputedStyle(probe).color
                )
                  issues.push("content link bypasses semantic color");
                probe.remove();
              }
              for (const heading of document.querySelectorAll(
                '[data-ui="ContentDialog"] h2',
              )) {
                const text = heading.firstChild;
                if (text?.nodeType !== Node.TEXT_NODE) continue;
                for (const match of text.textContent.matchAll(
                  /\b[A-Za-z]{2,10}\b/g,
                )) {
                  const range = document.createRange();
                  range.setStart(text, match.index);
                  range.setEnd(text, match.index + match[0].length);
                  if (range.getClientRects().length > 1)
                    issues.push(`dialog title splits short word: ${match[0]}`);
                }
              }
              return issues;
            });
            record.errors.push(...contentProblems);
            if (story.id.startsWith("us") && viewport.width <= 700) {
              // Modal backgrounds are intentionally inert/aria-hidden. This is
              // a rendered ownership assertion, not an interaction with them.
              const dock = page.locator('[data-ui="BottomNavigation"]');
              const selected = dock.locator('[aria-current="page"]');
              await expect(selected).toHaveCount(1);
              await expect(selected).toHaveText(
                story.id.startsWith("us034--") ? "Profile" : "Jobs",
              );
              const unavailable = dock.locator('[aria-disabled="true"]');
              await expect(unavailable).toHaveCount(3);
              for (const entry of await unavailable.all())
                await expect(entry).not.toHaveAttribute("href");
            }
            if (configuration.stress && story.id === "us025--l-02")
              expect(
                await page
                  .locator('[data-ui="JobSummary"] h2')
                  .first()
                  .evaluate((e) => getComputedStyle(e).webkitLineClamp),
              ).toBe("2");
            if (configuration.stress && story.id === "us025--d-02")
              expect(
                await page
                  .locator('[data-ui="SurveyContext"] li')
                  .first()
                  .evaluate((e) => getComputedStyle(e).webkitLineClamp),
              ).toBe("none");
            const runtimeErrors = await page
              .locator(".sb-errordisplay")
              .filter({ visible: true })
              .allTextContents();
            if (runtimeErrors.some(Boolean))
              throw Error(runtimeErrors.join(" ").slice(0, 200));
            const nodes = await page
              .locator("[data-ui]")
              .evaluateAll((elements, properties) => {
                const counts = new Map();
                return elements
                  .filter((e) => e.getBoundingClientRect().width > 0)
                  .map((e) => {
                    const style = getComputedStyle(e);
                    const variant =
                      (e.dataset.status ??
                        e.dataset.role ??
                        e.dataset.variant ??
                        "default") +
                      "/" +
                      (e.dataset.size ?? "default") +
                      (e.getAttribute("aria-busy") === "true"
                        ? "/busy"
                        : e.disabled
                          ? "/disabled"
                          : "");
                    const instance = e.dataset.ui + "/" + variant;
                    const index = counts.get(instance) ?? 0;
                    counts.set(instance, index + 1);
                    const ancestors = [];
                    let parent = e.parentElement;
                    while (parent) {
                      if (parent.dataset.ui) ancestors.push(parent.dataset.ui);
                      parent = parent.parentElement;
                    }
                    return {
                      key: `${instance}/${index}`,
                      ui: e.dataset.ui,
                      variant,
                      ancestors,
                      values: Object.fromEntries(
                        properties.map((p) => [p, style[p]]),
                      ),
                      bounds: {
                        x: e.getBoundingClientRect().x + scrollX,
                        y: e.getBoundingClientRect().y + scrollY,
                        width: e.getBoundingClientRect().width,
                        height: e.getBoundingClientRect().height,
                      },
                    };
                  });
              }, visualProperties);
            for (const node of nodes) {
              if (
                ![
                  "LifecycleBadge",
                  "Action",
                  "CloseControl",
                  "BackLink",
                  "AttachmentTag",
                ].includes(node.ui)
              )
                continue;
              const group = `${theme}/${viewport.width}/${configuration.textScale ?? 100}/${node.ui}/${node.variant}`;
              const earlier = groups.get(group);
              if (earlier) {
                const differences = compareEquivalent(
                  earlier.values,
                  node.values,
                );
                if (differences.length)
                  record.invariants.push({
                    group,
                    differences,
                    canonicalStory: earlier.story,
                    actual: node.values,
                    expected: earlier.values,
                  });
              } else
                groups.set(group, { values: node.values, story: story.id });
            }
            const referenceManifest = fs.existsSync(
              path.join(root, ".artifacts/ui/reference/manifest.json"),
            )
              ? readJSON(
                  path.join(root, ".artifacts/ui/reference/manifest.json"),
                )
              : null;
            const referenceRecord = referenceManifest?.records?.find(
              (r) => r.key === key,
            );
            if (
              input.intent !== "global" &&
              input.referenceUsable &&
              referenceRecord?.observations
            ) {
              record.protectedDifferences = compareProtected(
                referenceRecord.observations,
                nodes,
                {
                  owner: input.intent === "shared" ? input.owner : undefined,
                  geometry:
                    input.intent === "local" &&
                    !story.id.startsWith(`us${input.feature}--`),
                  allowExternalSpacing: false,
                },
              );
              if (record.protectedDifferences.length)
                record.errors.push(
                  "Protected styling or out-of-scope geometry changed",
                );
              if (
                input.intent === "local" &&
                story.id.startsWith(`us${input.feature}--`)
              ) {
                record.contextMovement = compareProtected(
                  referenceRecord.observations,
                  nodes,
                  { geometry: true, owner: input.region },
                ).filter((d) =>
                  d.properties?.some((p) => p.startsWith("bounds.")),
                );
                if (record.contextMovement.length)
                  record.scopeInspection =
                    "Surrounding geometry moved; agent must inspect the contextual difference. No approval implied.";
              }
            }
            const geometry = await page.evaluate(() => {
              const errors = [];
              if (document.documentElement.scrollWidth > window.innerWidth + 2)
                errors.push("horizontal page overflow");
              for (const h of document.querySelectorAll(
                '[data-ui="StatusHeading"]',
              )) {
                const badge = h.querySelector('[data-ui="LifecycleBadge"]');
                if (!badge) continue;
                const a = h.getBoundingClientRect(),
                  b = badge.getBoundingClientRect();
                if (b.right > a.right + 2 || b.top < a.top - 2)
                  errors.push("status heading boundary");
              }
              const dialog = document.querySelector('[role="dialog"]');
              if (dialog) {
                const r = dialog.getBoundingClientRect();
                if (
                  r.left < 12 ||
                  r.right > innerWidth - 12 ||
                  r.top < 12 ||
                  r.bottom > innerHeight - 12
                )
                  errors.push("dialog viewport bounds");
              }
              return errors;
            });
            record.errors.push(...geometry);
            const dialog = page.getByRole("dialog");
            const choices = input.target ? [input.target] : [];
            const featureChoices = story.id.startsWith("us034--")
              ? ["ReviewCard", "ReviewHistory", "Card"]
              : story.id.startsWith("us025--")
                ? ["JobSummary", "Card"]
                : story.id.startsWith("us026--")
                  ? ["ProofRecord", "ProofWorkspace", "Card"]
                  : ["CompletionRequirements", "CancellationEffects", "Card"];
            let close;
            for (const id of choices) {
              const candidate = page
                .locator(`[data-ui="${id}"]`)
                .filter({ visible: true })
                .first();
              if (await candidate.count()) {
                close = candidate;
                break;
              }
            }
            if (!close && (await dialog.count())) close = dialog;
            for (const id of [
              "RecoveryPanel",
              "Loading",
              ...featureChoices,
              "LifecycleBadge",
              "Action",
              "Select",
              "BackLink",
            ]) {
              if (close) break;
              const candidate = page
                .locator(`[data-ui="${id}"]`)
                .filter({ visible: true })
                .first();
              if (await candidate.count()) close = candidate;
            }
            close ??= page.locator('[data-ui="preview"] > *').first();
            record.captureSubject =
              (await close.getAttribute("data-ui")) ?? "preview example";
            const detailStyle = await close.evaluate((subject) =>
              ['[data-ui="ApplicationHeader"]', '[data-ui="ApplicationDock"]']
                .filter((selector) => {
                  const chrome = document.querySelector(selector);
                  return (
                    chrome &&
                    ["sticky", "fixed"].includes(
                      getComputedStyle(chrome).position,
                    ) &&
                    !subject.closest(selector) &&
                    !subject.querySelector(selector)
                  );
                })
                .map((selector) => selector + "{visibility:hidden!important}")
                .join("\n"),
            );
            let contextTarget = (await dialog.count())
              ? page
              : close.locator("..");
            const contextOptions = {};
            let contextAnchor;
            if (!(await dialog.count())) {
              const parentBounds = await contextTarget.boundingBox();
              if (parentBounds) {
                contextAnchor = await contextTarget.evaluate(
                  (e) => e.getBoundingClientRect().top + scrollY,
                );
                const usable = await page.evaluate(() => {
                  let height = innerHeight - 32;
                  for (const selector of [
                    '[data-ui="ApplicationHeader"]',
                    '[data-ui="ApplicationDock"]',
                  ]) {
                    const node = document.querySelector(selector);
                    if (
                      node &&
                      ["sticky", "fixed"].includes(
                        getComputedStyle(node).position,
                      )
                    )
                      height -= node.getBoundingClientRect().height;
                  }
                  return height;
                });
                if (parentBounds.height > usable) contextTarget = page;
              }
            }
            const captures = [
              ["page", page, { fullPage: (await dialog.count()) === 0 }],
              ...((await close.count())
                ? [
                    ["component", close, { style: detailStyle }],
                    ["context", contextTarget, contextOptions],
                  ]
                : []),
              ...((await dialog.count()) &&
              (await dialog.evaluate(
                (e) => e.scrollHeight > e.clientHeight + 1,
              ))
                ? [["component-scrolled", dialog, { style: detailStyle }]]
                : []),
            ];
            for (const [level, locator, captureOptions] of captures) {
              if (level === "component-scrolled")
                await dialog.evaluate((e) => {
                  e.scrollTop = e.scrollHeight;
                });
              if (level === "context" && contextAnchor !== undefined)
                await page.evaluate((top) => {
                  const header = document.querySelector(
                    '[data-ui="ApplicationHeader"]',
                  );
                  const clearance =
                    header &&
                    ["sticky", "fixed"].includes(
                      getComputedStyle(header).position,
                    )
                      ? header.getBoundingClientRect().height
                      : 0;
                  window.scrollTo(0, Math.max(0, top - clearance - 16));
                }, contextAnchor);
              const name = `${key}__${level}.png`;
              const file = path.join(output, name);
              await locator.screenshot({
                path: file,
                animations: "disabled",
                ...captureOptions,
              });
              const reference = path.join(
                root,
                ".artifacts/ui/reference/images",
                name,
              );
              let comparison = "missing";
              if (input.referenceUsable && fs.existsSync(reference)) {
                try {
                  // Compare the stable capture already produced above. Avoid
                  // recapturing every level again just to run the pixel matcher.
                  expect(fs.readFileSync(file)).toMatchSnapshot(name, {
                    maxDiffPixelRatio: 0.0001,
                  });
                  comparison = "unchanged";
                } catch {
                  const isAllowed =
                    input.intent === "global" ||
                    input.intent === "shared" ||
                    (input.intent === "local" &&
                      story.id.startsWith(`us${input.feature}--`));
                  comparison = isAllowed ? "intended-pending" : "unexpected";
                }
              }
              record.observations = nodes;
              record.images.push({
                level,
                treatment:
                  level === "component-scrolled"
                    ? "Native dialog scrolled to footer; subject controls retained."
                    : level === "component" && detailStyle
                      ? "External fixed chrome excluded from subject detail; retained in context/page."
                      : level === "context" && contextAnchor !== undefined
                        ? "Parent-anchored viewport"
                        : "Native bounds",
                file: `images/${name}`,
                sha256: digest(fs.readFileSync(file)),
                comparison,
              });
            }
            if (!(await dialog.count())) {
              const dockErrors = await page.evaluate(() => {
                const dock = document.querySelector(
                  '[data-ui="ApplicationDock"]',
                );
                if (
                  !dock ||
                  getComputedStyle(dock).position !== "fixed" ||
                  !dock.getBoundingClientRect().height
                )
                  return [];
                window.scrollTo(0, document.documentElement.scrollHeight);
                const bounds = dock.getBoundingClientRect();
                const stack = document.querySelector(
                  '[data-ui="Page"] > div:last-child',
                );
                const last = Array.from(stack?.children ?? [])
                  .filter((e) => e.getBoundingClientRect().height > 0)
                  .at(-1);
                return [
                  ...(Math.abs(bounds.bottom - innerHeight) > 1
                    ? ["navigation is not pinned to viewport bottom"]
                    : []),
                  ...(last &&
                  last.getBoundingClientRect().bottom > bounds.top - 12
                    ? ["content lacks bottom-dock clearance"]
                    : []),
                ];
              });
              record.errors.push(...dockErrors);
            }
            const statuses = record.images.map((i) => i.comparison);
            record.status =
              record.errors.length || record.invariants.length
                ? "failed"
                : statuses.includes("unexpected")
                  ? "unexpected"
                  : statuses.includes("missing")
                    ? "inconclusive"
                    : statuses.includes("intended-pending")
                      ? "intended-pending"
                      : "unchanged";
          } catch (error) {
            record.status = "failed";
            record.errors.push(String(error.message).slice(0, 500));
          }
          records.push(record);
          if (["failed", "unexpected"].includes(record.status))
            failures.push({
              key,
              errors: record.errors,
              invariants: record.invariants,
              status: record.status,
            });
          if (records.length % 20 === 0)
            console.log(
              `Captured ${records.length} (core ${input.stories.length * input.viewports.length * 2}, plus targeted stress)`,
            );
        }
      }
    writeJSON(path.join(current, "rendered.json"), {
      records,
      failures,
      browser: browser.version(),
      groups: groups.size,
      checkedStories: [...new Set(records.map((r) => r.story))],
      inspection: "captured-only",
      interactionChecks: [],
    });
    writeJSON(path.join(current, "rendered.json"), {
      records,
      failures,
      browser: browser.version(),
      groups: groups.size,
      checkedStories: [...new Set(records.map((r) => r.story))],
      inspection: "captured-only",
      interactionChecks: readJSON(path.join(current, "interactions.json"))
        .checks,
    });
    expect(
      failures,
      "Rendered contracts and protected-boundary regressions",
    ).toEqual([]);
  } finally {
    for (const c of contexts) await c.close();
    await server.close();
  }
});
