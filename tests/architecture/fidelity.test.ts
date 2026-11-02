import { test, expect } from "vitest";
import { compareMeasured } from "../../scripts/ui/fidelity-contracts.mjs";
import reference from "../../reference/original.json";
import { requireMigrationAcceptance } from "../../scripts/ui/baseline.mjs";
test("provisional publication cannot override a rejected migration", () => {
  expect(() =>
    requireMigrationAcceptance({ migration: { baselinePromotion: "blocked" } }),
  ).toThrow("human rejection");
});
test("reference inventory preserves all 94 unique original identities", () => {
  expect(reference.scenarios).toHaveLength(94);
  expect(new Set(reference.scenarios.map((s) => s.story)).size).toBe(94);
  expect(
    reference.files.every(
      (f) =>
        f.sha256.length === 64 &&
        !f.file.startsWith("/") &&
        !f.file.split("/").includes(".."),
    ),
  ).toBe(true);
});
test("original comparison catches the rejected scale, heading and action-width defects", () => {
  const original = {
    rootFont: "17px",
    heading: { text: "Job #41", x: 57.6 },
    actions: [{ text: "Start job", width: 332, height: 51 }],
  };
  const candidate = {
    rootFont: "16px",
    heading: { text: "Job details", x: 24 },
    actions: [{ text: "Start job", width: 105, height: 48 }],
  };
  const result = compareMeasured(original, candidate);
  expect(result.map((r) => r.owner)).toEqual(
    expect.arrayContaining([
      "root-scale",
      "heading",
      "heading-content",
      "action",
    ]),
  );
});
test("a missing original composition cannot pass by sharing the same root scale", () => {
  expect(
    compareMeasured(
      { rootFont: "17px", contract: { width: 374 } },
      { rootFont: "17px" },
    ),
  ).toContainEqual({ owner: "contract", reason: "missing counterpart" });
  expect(compareMeasured({ rootFont: "17px" }, { rootFont: "17px" })).toEqual(
    [],
  );
});
