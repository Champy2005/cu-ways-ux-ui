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
      for (const viewport of input.viewports) {
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
        for (const story of input.stories) {
          const key = `${story.id}__${theme}__${viewport.width}x${viewport.height}`;
          const record = {
            key,
            story: story.id,
            theme,
            viewport,
            images: [],
            invariants: [],
            status: "unchanged",
            errors: [],
          };
          try {
            await page.goto(
              `${server.url}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`,
              { waitUntil: "networkidle" },
            );
            await page
              .locator(
                '[data-ui="ApplicationFrame"], [data-ui="LifecycleBadge"]',
              )
              .first()
              .waitFor();
            await page.evaluate(async () => {
              await document.fonts.ready;
              await new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              );
            });
            const runtimeErrors = await page
              .locator(".sb-errordisplay")
              .filter({ visible: true })
              .allTextContents();
            if (runtimeErrors.some(Boolean))
              throw Error(runtimeErrors.join(" ").slice(0, 200));
            const nodes = await page
              .locator(
                '[data-ui="LifecycleBadge"],[data-ui="Action"],[data-ui="CloseControl"],[data-ui="BackLink"]',
              )
              .evaluateAll(
                (elements, properties) =>
                  elements
                    .filter((e) => e.getBoundingClientRect().width > 0)
                    .map((e) => {
                      const style = getComputedStyle(e);
                      return {
                        ui: e.dataset.ui,
                        variant:
                          e.dataset.status ?? e.dataset.role ?? "default",
                        values: Object.fromEntries(
                          properties.map((p) => [p, style[p]]),
                        ),
                      };
                    }),
                visualProperties,
              );
            for (const node of nodes) {
              const group = `${theme}/${viewport.width}/${node.ui}/${node.variant}`;
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
              input.intent === "local" &&
              input.referenceUsable &&
              referenceRecord?.observations
            ) {
              record.protectedDifferences = compareProtected(
                referenceRecord.observations,
                nodes,
              );
              if (record.protectedDifferences.length)
                record.errors.push(
                  "Protected component styling changed during local task",
                );
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
            const target = dialog.count().then((n) =>
              n
                ? dialog
                : page
                    .locator(`[data-ui="${input.target ?? "LifecycleBadge"}"]`)
                    .filter({ visible: true })
                    .first(),
            );
            const component = await target;
            const fallback = page
              .locator(
                '[data-ui="Card"],[data-ui="RecoveryPanel"],[data-ui="Loading"]',
              )
              .first();
            const close = (await component.count()) ? component : fallback;
            const captures = [
              ["page", page],
              ...((await close.count())
                ? [
                    ["component", close],
                    [
                      "context",
                      (await dialog.count()) ? page : close.locator(".."),
                    ],
                  ]
                : []),
            ];
            for (const [level, locator] of captures) {
              const name = `${key}__${level}.png`;
              const file = path.join(output, name);
              await locator.screenshot({
                path: file,
                animations: "disabled",
                ...(level === "page"
                  ? { fullPage: (await dialog.count()) === 0 }
                  : {}),
              });
              const reference = path.join(
                root,
                ".artifacts/ui/reference/images",
                name,
              );
              let comparison = "missing";
              if (input.referenceUsable && fs.existsSync(reference)) {
                try {
                  await expect(locator).toHaveScreenshot(name, {
                    animations: "disabled",
                    maxDiffPixelRatio: 0.0001,
                    timeout: 3000,
                    ...(level === "page"
                      ? { fullPage: (await dialog.count()) === 0 }
                      : {}),
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
                file: `images/${name}`,
                sha256: digest(fs.readFileSync(file)),
                comparison,
              });
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
              `Captured ${records.length}/${input.stories.length * input.viewports.length * 2}`,
            );
        }
      }
    writeJSON(path.join(current, "rendered.json"), {
      records,
      failures,
      groups: groups.size,
      checkedStories: [...new Set(records.map((r) => r.story))],
      inspection: "captured-only",
      interactionChecks: [],
    });
    // Reuse canonical pages for actual hover, focus and boundary contracts.
    const interactionContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    contexts.push(interactionContext);
    await interactionContext.addInitScript(() => {
      window.__UI_CAPTURE__ = true;
    });
    const p = await interactionContext.newPage();
    await p.goto(`${server.url}/iframe.html?id=us034--a-01&globals=theme:dark`);
    await p.getByRole("button", { name: "Next", exact: true }).waitFor();
    const next = p.getByRole("button", { name: "Next", exact: true });
    await next.scrollIntoViewIfNeeded();
    const before = await next.boundingBox();
    await next.hover();
    const after = await next.boundingBox();
    expect(after).toEqual(before);
    await next.focus();
    expect(
      await next.evaluate((e) => getComputedStyle(e).outlineStyle),
    ).not.toBe("none");
    await next.click();
    await expect(
      p.getByRole("button", { name: "Previous", exact: true }),
    ).toBeVisible();
    writeJSON(path.join(current, "rendered.json"), {
      records,
      failures,
      groups: groups.size,
      checkedStories: [...new Set(records.map((r) => r.story))],
      inspection: "captured-only",
      interactionChecks: [
        "pagination navigation",
        "stable hover geometry",
        "keyboard focus",
      ],
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
