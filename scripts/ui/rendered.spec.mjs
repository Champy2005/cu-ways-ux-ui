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
              { waitUntil: "networkidle" },
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
            if (configuration.stress && story.id === "us025--l-02")
              expect(
                await page
                  .locator('[data-ui="StatusHeading"] h2')
                  .first()
                  .evaluate((e) => getComputedStyle(e).webkitLineClamp),
              ).toBe("2");
            if (configuration.stress && story.id === "us025--d-02")
              expect(
                await page
                  .locator('[data-ui="StatusHeading"] h2')
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
                        "default") + (e.disabled ? "/disabled" : "");
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
            let contextTarget = (await dialog.count())
              ? page
              : close.locator("..");
            let contextOptions = {};
            if (!(await dialog.count())) {
              const parentBounds = await contextTarget.boundingBox();
              if (parentBounds && parentBounds.height > viewport.height * 1.3) {
                const bounds = await close.boundingBox();
                const scroll = await page.evaluate(() => ({
                  y: scrollY,
                  height: document.documentElement.scrollHeight,
                }));
                const y = Math.max(0, bounds.y + scroll.y - 24);
                contextTarget = page;
                contextOptions = {
                  clip: {
                    x: 0,
                    y,
                    width: viewport.width,
                    height: Math.min(viewport.height, scroll.height - y),
                  },
                };
              }
            }
            const captures = [
              ["page", page, { fullPage: (await dialog.count()) === 0 }],
              ...((await close.count())
                ? [
                    ["component", close, {}],
                    ["context", contextTarget, contextOptions],
                  ]
                : []),
            ];
            for (const [level, locator, captureOptions] of captures) {
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
                  await expect(locator).toHaveScreenshot(name, {
                    animations: "disabled",
                    maxDiffPixelRatio: 0.0001,
                    timeout: 3000,
                    ...captureOptions,
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
    await p.goto(`${server.url}/iframe.html?id=us025--l-02`);
    await p.getByRole("button", { name: "Menu", exact: true }).click();
    const mobileMenu = p.getByRole("navigation", { name: "Mobile menu" });
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.getByRole("link").first().focus();
    await p.keyboard.press("Escape");
    await expect(mobileMenu).toHaveCount(0);
    await expect(
      p.getByRole("button", { name: "Menu", exact: true }),
    ).toBeFocused();
    await p.evaluate(() => window.scrollTo(0, 400));
    expect(
      (await p.locator('[data-ui="ApplicationHeader"]').boundingBox()).y,
    ).toBe(0);
    await p.clock.install();
    await p.goto(
      `${server.url}/iframe.html?id=us026--a-03&args=timing:stalled`,
    );
    await expect(p.getByRole("dialog")).toBeVisible();
    await p.keyboard.press("Escape");
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(
      p.getByRole("button", { name: "View progress" }),
    ).toBeVisible();
    await p.clock.fastForward(12001);
    await expect(
      p.getByRole("heading", { name: "Save not confirmed" }),
    ).toBeVisible();
    await expect(
      p.getByRole("button", { name: "Check saved proof" }),
    ).toBeVisible();
    await expect(p.getByRole("button", { name: "Save proof" })).toHaveCount(0);
    await p.goto(
      `${server.url}/iframe.html?id=us025--l-01&args=timing:stalled`,
    );
    await expect(p.getByText("Loading your jobs")).toBeVisible();
    await p.clock.fastForward(12001);
    await expect(p.getByText("Loading your jobs")).toHaveCount(0);
    await expect(p.getByRole("button", { name: "Try again" })).toBeEnabled();
    await p.getByRole("button", { name: "Try again" }).click();
    await expect(
      p.getByRole("button", { name: "View job" }).first(),
    ).toBeVisible();
    // Objective fault injection: a canonical token reaches direct and transitive consumers.
    for (const id of ["us025--l-02", "us027--b-03", "us028--a-02"]) {
      await p.goto(`${server.url}/iframe.html?id=${id}`);
      const badges = p.locator(
        '[data-ui="LifecycleBadge"][data-status="Accepted"]',
      );
      await badges.first().waitFor();
      await p.addStyleTag({
        content:
          "[data-cu-theme] { --status-info-fill: rgb(18, 52, 86) !important; }",
      });
      for (const badge of await badges.all())
        expect(
          await badge.evaluate((e) => getComputedStyle(e).backgroundColor),
        ).toBe("rgb(18, 52, 86)");
    }
    const badge = p.locator('[data-ui="LifecycleBadge"]').first();
    const beforeDrift = await badge.evaluate(
      (e, properties) =>
        Object.fromEntries(properties.map((k) => [k, getComputedStyle(e)[k]])),
      visualProperties,
    );
    await badge.evaluate((e) => (e.style.fontWeight = "400"));
    const afterDrift = await badge.evaluate(
      (e, properties) =>
        Object.fromEntries(properties.map((k) => [k, getComputedStyle(e)[k]])),
      visualProperties,
    );
    expect(compareEquivalent(beforeDrift, afterDrift)).toContain("fontWeight");
    // A local feature gap leaves sibling paint and another feature's geometry untouched.
    await p.goto(`${server.url}/iframe.html?id=us026--a-01`);
    const original = await p
      .locator('[data-ui="LifecycleBadge"]')
      .evaluate((e) => getComputedStyle(e).padding);
    await p
      .locator('[data-ui="PageHeading"]')
      .evaluate((e) => (e.style.marginBottom = "40px"));
    expect(
      await p
        .locator('[data-ui="LifecycleBadge"]')
        .evaluate((e) => getComputedStyle(e).padding),
    ).toBe(original);
    await p.goto(`${server.url}/iframe.html?id=us028--a-02`);
    const heading = p.locator('[data-ui="PageHeading"]');
    await heading.waitFor();
    expect(
      await heading.evaluate((e) => getComputedStyle(e).marginBottom),
    ).not.toBe("40px");
    writeJSON(path.join(current, "rendered.json"), {
      records,
      failures,
      browser: browser.version(),
      groups: groups.size,
      checkedStories: [...new Set(records.map((r) => r.story))],
      inspection: "captured-only",
      interactionChecks: [
        "pagination navigation",
        "stable hover geometry",
        "keyboard focus",
        "mobile menu escape and focus return",
        "sticky header geometry",
        "pending dialog escape preserves progress",
        "12-second deadline exposes uncertainty without duplicate write",
        "canonical token propagates through three direct/transitive feature consumers",
        "rendered invariant detects injected pre-existing drift independently of baseline",
        "local spacing leaves protected sibling paint and other feature geometry unchanged",
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
