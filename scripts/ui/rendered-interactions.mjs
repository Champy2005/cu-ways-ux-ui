import { expect } from "@playwright/test";
import { visualProperties, compareEquivalent } from "./visual-contracts.mjs";

export async function verifyRenderedInteractions(browser, serverUrl) {
  const interactionContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    await interactionContext.addInitScript(() => {
      window.__UI_CAPTURE__ = true;
    });
    const p = await interactionContext.newPage();
    await p.goto(`${serverUrl}/iframe.html?id=us034--a-01&globals=theme:dark`);
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
    await p.goto(`${serverUrl}/iframe.html?id=us025--l-02`);
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
    await p.goto(`${serverUrl}/iframe.html?id=us026--a-03&args=timing:stalled`);
    await expect(p.getByRole("dialog")).toBeVisible();
    await p.keyboard.press("Escape");
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(
      p.getByRole("button", { name: "View progress" }),
    ).toBeVisible();
    await p.clock.fastForward(12001);
    await expect(
      p.getByRole("heading", { name: "We couldn’t confirm the save" }),
    ).toBeVisible();
    await expect(
      p.getByRole("button", { name: "Check saved proof" }),
    ).toBeVisible();
    await expect(p.getByRole("button", { name: "Save proof" })).toHaveCount(0);
    await p.goto(`${serverUrl}/iframe.html?id=us025--l-01&args=timing:stalled`);
    await expect(
      p.getByRole("status").filter({ hasText: /Loading jobs/ }),
    ).toBeVisible();
    await p.clock.fastForward(12001);
    await expect(
      p.getByRole("status").filter({ hasText: /Loading jobs/ }),
    ).toHaveCount(0);
    await expect(p.getByRole("button", { name: "Try again" })).toBeEnabled();
    await p.getByRole("button", { name: "Try again" }).click();
    await expect(
      p.getByRole("button", { name: "View job" }).first(),
    ).toBeVisible();
    // Objective fault injection: a canonical token reaches direct and transitive consumers.
    for (const id of ["us025--l-02", "us027--b-03", "us028--a-02"]) {
      await p.goto(`${serverUrl}/iframe.html?id=${id}`);
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
    await p.goto(`${serverUrl}/iframe.html?id=us026--a-01`);
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
    await p.goto(`${serverUrl}/iframe.html?id=us028--a-02`);
    const heading = p.locator('[data-ui="PageHeading"]');
    await heading.waitFor();
    expect(
      await heading.evaluate((e) => getComputedStyle(e).marginBottom),
    ).not.toBe("40px");
    await p.goto(
      `${serverUrl}/iframe.html?id=us027--a-04&globals=theme:dark;textScale:200`,
    );
    const commit = p.getByRole("button", {
      name: "Confirm completion",
      exact: true,
    });
    await commit.waitFor();
    await commit.focus();
    await expect(commit).toBeInViewport({ ratio: 1 });
    await p.keyboard.press("Escape");
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(
      p.locator('[data-ui="LifecycleBadge"][data-status="In Progress"]'),
    ).toBeVisible();
    return [
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
      "enlarged dialog footer remains keyboard reachable and Escape preserves job status",
    ];
  } finally {
    await interactionContext.close();
  }
}
