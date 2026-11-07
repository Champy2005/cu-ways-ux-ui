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
      p.getByRole("link", { name: "View job" }).first(),
    ).toBeVisible();
    // A terminal job must never be reinterpreted as Accepted by list navigation.
    await p.getByRole("combobox", { name: "Status" }).selectOption("Cancelled");
    const jobLink = p.getByRole("link", { name: "View job" }).first();
    const detailUrl = new URL(await jobLink.getAttribute("href"), p.url()).href;
    // A real modifier click keeps the list open and performs a fresh mock read.
    const [detailPage] = await Promise.all([
      interactionContext.waitForEvent("page"),
      jobLink.click({ modifiers: ["ControlOrMeta"] }),
    ]);
    try {
      await expect(detailPage).toHaveURL(detailUrl);
      await expect(
        detailPage.locator(
          '[data-ui="LifecycleBadge"][data-status="Cancelled"]',
        ),
      ).toBeVisible();
      await expect(
        detailPage.getByRole("button", { name: "Start job", exact: true }),
      ).toHaveCount(0);
    } finally {
      await detailPage.close();
    }
    await expect(jobLink).toBeVisible();
    await jobLink.click();
    await expect(
      p.locator('[data-ui="LifecycleBadge"][data-status="Cancelled"]'),
    ).toBeVisible();
    await expect(
      p.getByRole("button", { name: "Start job", exact: true }),
    ).toHaveCount(0);
    await p.goto(`${serverUrl}/iframe.html?id=us025--c-01&args=timing:auto`);
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Start job", exact: true })
      .click();
    await expect(p.getByRole("dialog")).toContainText("Submitting");
    await p.clock.fastForward(801);
    await expect(
      p.locator('[data-ui="LifecycleBadge"][data-status="In Progress"]'),
    ).toBeVisible();
    await p.getByRole("link", { name: "Back to My Jobs" }).click();
    const startedRow = p
      .locator('[data-ui="JobSummary"]')
      .filter({ has: p.getByText("Job #41", { exact: true }) });
    await expect(
      startedRow.getByText("In Progress", { exact: true }),
    ).toBeVisible();
    const [startedTab] = await Promise.all([
      interactionContext.waitForEvent("page"),
      startedRow
        .getByRole("link", { name: "View job" })
        .click({ modifiers: ["ControlOrMeta"] }),
    ]);
    try {
      await expect(
        startedTab.locator(
          '[data-ui="LifecycleBadge"][data-status="In Progress"]',
        ),
      ).toBeVisible();
      await expect(
        startedTab.getByRole("button", { name: "Start job", exact: true }),
      ).toHaveCount(0);
    } finally {
      await startedTab.close();
    }
    await p.goto(`${serverUrl}/iframe.html?id=us025--c-03&args=timing:auto`);
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await p
      .locator('[data-ui="BottomNavigation"]')
      .getByRole("link", { name: "Jobs", exact: true })
      .click();
    await expect(
      p.getByRole("button", { name: "View progress", exact: true }),
    ).toBeVisible();
    await p.clock.fastForward(801);
    await expect(
      p.getByRole("heading", { name: "Job #41 started", exact: true }),
    ).toBeVisible();
    await expect(
      p
        .locator('[data-ui="JobSummary"]')
        .filter({ has: p.getByText("Job #41", { exact: true }) })
        .getByText("In Progress", { exact: true }),
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
    await p.setViewportSize({ width: 390, height: 568 });
    await p.goto(
      `${serverUrl}/iframe.html?id=us026--a-03&args=timing:hold&globals=theme:dark;material:opaque;textScale:200`,
    );
    await expect(
      p.getByRole("heading", { name: "Saving proof", exact: true }),
    ).toBeFocused();
    await p.keyboard.press("Escape");
    await p.clock.runFor(250);
    const progress = p.getByRole("button", {
      name: "View progress",
      exact: true,
    });
    await expect(progress).toBeFocused();
    await expect(progress).toBeInViewport({ ratio: 1 });
    const returnScroll = await p.evaluate(() => scrollY);
    expect(returnScroll).toBeGreaterThan(0);
    await p.keyboard.press("Enter");
    await p.clock.runFor(100);
    const retainedUrl = p.getByRole("textbox", {
      name: "Delivery link",
      exact: true,
    });
    await expect(retainedUrl).toBeFocused();
    await expect(retainedUrl).toHaveAttribute("readonly", "");
    await expect(retainedUrl).toHaveValue(
      "https://example.com/proof/campus-dining",
    );
    expect(
      Math.abs((await p.evaluate(() => scrollY)) - returnScroll),
    ).toBeLessThanOrEqual(1);
    await p.keyboard.press("Escape");
    await p.clock.runFor(250);
    await expect(progress).toBeFocused();
    await expect(progress).toBeInViewport({ ratio: 1 });
    await p.goto(
      `${serverUrl}/iframe.html?id=us026--a-01&globals=theme:dark;textScale:200`,
    );
    const proofEmpty = p.locator(
      '[data-ui="EmptyState"][data-variant="proof"]',
    );
    expect(
      await proofEmpty
        .locator("svg")
        .evaluate((e) => getComputedStyle(e).color),
    ).toBe(
      await proofEmpty.locator("p").evaluate((e) => getComputedStyle(e).color),
    );
    await p.getByRole("link", { name: "Back to My Jobs", exact: true }).focus();
    await p.keyboard.press("Enter");
    await expect(
      p.getByRole("heading", { name: "My Jobs", exact: true }),
    ).toBeFocused();
    const entry = p.locator('[data-ui="JobEntry"]');
    const statusRow = entry.locator('[data-ui="StatusHeading"]');
    await expect(statusRow).toHaveCount(1);
    const entryBadge = statusRow.locator('[data-ui="LifecycleBadge"]');
    const reference = statusRow.getByText("Job #41", { exact: true });
    const badgeBox = await entryBadge.boundingBox();
    const referenceBox = await reference.boundingBox();
    expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(referenceBox.y);
    expect(
      await entryBadge.evaluate((e) => {
        const style = getComputedStyle(e);
        return Math.abs(
          e.clientHeight -
            parseFloat(style.lineHeight) -
            parseFloat(style.paddingTop) -
            parseFloat(style.paddingBottom),
        );
      }),
    ).toBeLessThanOrEqual(1);
    await p
      .getByRole("button", { name: "Open delivery evidence", exact: true })
      .focus();
    await p.keyboard.press("Enter");
    await expect(p.locator('[data-ui="Page"]')).toBeFocused();
    expect(
      await p
        .locator('[data-ui="Page"]')
        .evaluate((e) => getComputedStyle(e).outlineStyle),
    ).toBe("auto");
    await expect(p.locator('[data-ui="ProofWorkspace"]')).toBeVisible();
    await p.getByRole("link", { name: "Back to My Jobs", exact: true }).click();
    await p.getByRole("link", { name: "Story library", exact: true }).click();
    await expect(p).toHaveURL(/id=us025--l-02/);
    await p.goto(`${serverUrl}/iframe.html?id=us026--a-03&args=timing:hold`);
    await expect(p.getByRole("dialog")).toBeVisible();
    await p.keyboard.press("Escape");
    await p.getByRole("link", { name: "Back to My Jobs", exact: true }).click();
    await expect(
      p.getByRole("heading", { name: "My Jobs", exact: true }),
    ).toBeFocused();
    await expect(p.getByText("Saving proof", { exact: true })).toBeVisible();
    await p.getByRole("button", { name: "View progress", exact: true }).focus();
    await p.keyboard.press("Enter");
    await expect(
      p.getByRole("textbox", { name: "Delivery link", exact: true }),
    ).toBeFocused();
    await expect(
      p.getByRole("button", { name: "Saving proof…", exact: true }),
    ).toBeDisabled();
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 844 });
      await p.goto(
        `${serverUrl}/iframe.html?id=us026--a-03&args=timing:hold&globals=theme:dark`,
      );
      await expect(p.getByRole("dialog")).toBeVisible();
      await p.keyboard.press("Escape");
      await p.clock.runFor(250);
      const jobs = p
        .getByRole("link", { name: /^(My Jobs|Jobs)$/ })
        .filter({ visible: true })
        .first();
      await jobs.focus();
      await p.keyboard.press("Enter");
      await expect(p).toHaveURL(/id=us026--a-03/);
      await expect(p.locator("html")).toHaveAttribute("data-cu-theme", "dark");
      await expect(
        p.getByRole("heading", { name: "My Jobs", exact: true }),
      ).toBeFocused();
      await jobs.focus();
      await p.keyboard.press("Enter");
      await expect(
        p.getByRole("heading", { name: "My Jobs", exact: true }),
      ).toBeFocused();
      await p
        .getByRole("button", { name: "View progress", exact: true })
        .click();
      await expect(
        p.getByRole("textbox", { name: "Delivery link", exact: true }),
      ).toHaveAttribute("readonly", "");
    }
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 844 });
      for (const destination of ["back", "product"]) {
        await p.goto(
          `${serverUrl}/iframe.html?id=us026--c-03&globals=theme:dark`,
        );
        await expect(
          p.getByRole("heading", { name: "Job unavailable", exact: true }),
        ).toBeVisible();
        const link =
          destination === "back"
            ? p.getByRole("link", { name: "Back to My Jobs", exact: true })
            : p
                .getByRole("link", { name: /^(My Jobs|Jobs)$/ })
                .filter({ visible: true })
                .first();
        await link.focus();
        await p.keyboard.press("Enter");
        await expect(p).toHaveURL(/id=us026--c-03/);
        await expect(
          p.getByRole("heading", { name: "My Jobs", exact: true }),
        ).toBeFocused();
        await expect(
          p.getByRole("heading", { name: "No job selected", exact: true }),
        ).toBeVisible();
        await expect(
          p.getByRole("heading", { name: "Job unavailable", exact: true }),
        ).toHaveCount(0);
        await expect(
          p.getByRole("button", {
            name: "Open delivery evidence",
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(
          p.getByRole("textbox", { name: "Delivery link", exact: true }),
        ).toHaveCount(0);
        await expect(p.locator('[data-ui="Page"]')).not.toContainText(
          "Campus Dining",
        );
        await expect(p.locator('[data-ui="Page"]')).not.toContainText(
          "example.com",
        );
        await p
          .getByRole("link", { name: "Story library", exact: true })
          .click();
        await expect(p).toHaveURL(/id=us025--l-02/);
      }
    }
    await p.goto(`${serverUrl}/iframe.html?id=us026--a-03&args=timing:auto`);
    await expect(p.getByRole("dialog")).toBeVisible();
    await p.keyboard.press("Escape");
    await p.getByRole("link", { name: "Back to My Jobs", exact: true }).click();
    await p.clock.runFor(1000);
    await expect(
      p.getByRole("heading", { name: "Proof saved", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("button", { name: "View progress", exact: true }),
    ).toHaveCount(0);
    await p
      .getByRole("button", { name: "Open delivery evidence", exact: true })
      .click();
    await expect(p.locator('[data-ui="ProofRecord"]')).toHaveCount(1);
    return [
      "pagination navigation",
      "native job links preserve terminal lifecycle in in-place and fresh-page reads",
      "confirmed start survives list return and a native modified-click detail tab",
      "product navigation retains a dispatched start until background completion",
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
      "short enlarged proof dismissal exposes focus and keyboard reopening preserves document scroll and draft",
      "proof job entry uses canonical enlarged status placement, heading/content focus and a real library exit",
      "pending proof remains reachable from job entry and its background result survives navigation",
      "desktop/mobile product Jobs preserves proof operation, appearance and repeated-selection focus",
      "revoked proof access returns through back/product Jobs without restoring private details",
    ];
  } finally {
    await interactionContext.close();
  }
}
