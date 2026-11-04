import { test, expect } from "vitest";
import { compareMeasured } from "../../scripts/ui/fidelity-contracts.mjs";
import reference from "../../reference/original.json";
import { requireMigrationAcceptance } from "../../scripts/ui/baseline.mjs";
import {
  selectFidelityScenarios,
  fidelitySettings,
} from "../../scripts/ui/fidelity.mjs";
test("fidelity settings preserve distinct stress captures and reject unsupported values", () => {
  expect(fidelitySettings({ state: "dismissed" }).interactionState).toBe(
    "dismissed",
  );
  for (const state of ["reopened", "reconciled"])
    expect(fidelitySettings({ state }).interactionState).toBe(state);
  expect(() => fidelitySettings({ state: "unknown" })).toThrow(
    "Invalid fidelity state",
  );
  expect(
    fidelitySettings({ widths: "1023,1024,1025,1279,1280,1281" }).widths,
  ).toEqual([1023, 1024, 1025, 1279, 1280, 1281]);
  for (const widths of [
    "",
    "0",
    "390,390",
    "390.5",
    "3841",
    "NaN",
    Array.from({ length: 25 }, (_, i) => 300 + i).join(","),
  ])
    expect(() => fidelitySettings({ widths })).toThrow(
      "Invalid fidelity widths",
    );
  expect(fidelitySettings({})).toMatchObject({
    height: 900,
    textScale: 100,
    fixture: "standard",
    material: "opaque",
  });
  expect(
    fidelitySettings({
      textScale: "200",
      height: "640",
      fixture: "long",
      material: "glass",
      reducedTransparency: true,
    }),
  ).toMatchObject({ textScale: 200, height: 640, reducedTransparency: true });
  for (const options of [
    { height: 0 },
    { height: "NaN" },
    { textScale: 120 },
    { fixture: "missing" },
    { material: "missing" },
  ])
    expect(() => fidelitySettings(options)).toThrow(
      "Invalid fidelity settings",
    );
});
test("fidelity target focus cannot suppress shared or uncertain impact", () => {
  const options = { target: "us026--a-01" };
  expect(
    selectFidelityScenarios(reference, options, {
      full: true,
      features: [],
      reason: "shared source changed",
    }).scenarios,
  ).toHaveLength(94);
  const diagnostic = selectFidelityScenarios(
    reference,
    { ...options, diagnostic: true },
    { full: true },
  );
  expect(diagnostic.scenarios).toHaveLength(1);
  expect(diagnostic.reason).toContain("cannot establish");
  const union = selectFidelityScenarios(reference, options, {
    full: false,
    features: ["034"],
    reason: "feature ownership",
  });
  expect(union.scenarios).toHaveLength(11);
  expect(() =>
    selectFidelityScenarios(reference, { target: "missing" }, { full: true }),
  ).toThrow("Unknown fidelity");
});
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  captureKey,
  restoreCapture,
  storeCapture,
} from "../../scripts/ui/fidelity-cache.mjs";

test("original capture reuse rejects corruption, missing artifacts and traversal", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cuways-fidelity-"));
  try {
    const cache = path.join(root, "cache"),
      output = path.join(root, "output");
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "original.png"), "fixture image bytes");
    const key = captureKey({
      reference: "frozen",
      browser: "pinned",
      width: 390,
    });
    const state = { image: "original.png", failures: [] };
    storeCapture(cache, key, output, ["original.png"], state);
    expect(restoreCapture(cache, key, output)).toEqual(state);
    expect(
      restoreCapture(cache, captureKey({ width: 1440 }), output),
    ).toBeNull();
    fs.writeFileSync(path.join(cache, key, "original.png"), "corrupted");
    expect(restoreCapture(cache, key, output)).toBeNull();
    storeCapture(cache, key, output, ["original.png"], state);
    const manifest = path.join(cache, key, "capture.json");
    const invalid = JSON.parse(fs.readFileSync(manifest, "utf8"));
    invalid.files[0].name = "../original.png";
    fs.writeFileSync(manifest, JSON.stringify(invalid));
    expect(restoreCapture(cache, key, output)).toBeNull();
    storeCapture(cache, key, output, ["original.png"], state);
    fs.unlinkSync(path.join(cache, key, "original.png"));
    expect(restoreCapture(cache, key, output)).toBeNull();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
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

test("subtle backdrop paint drift cannot hide within the page pixel tolerance", () => {
  expect(
    compareMeasured(
      { rootFont: "17px", backdrop: { fill: "8,11,18,179", filter: "none" } },
      { rootFont: "17px", backdrop: { fill: "15,22,35,179", filter: "none" } },
    ),
  ).toContainEqual({
    owner: "backdrop",
    property: "fill",
    original: "8,11,18,179",
    react: "15,22,35,179",
  });
});
