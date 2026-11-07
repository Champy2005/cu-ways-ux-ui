import { test, expect } from "vitest";
import {
  compareMeasured,
  pixelRegionDifference,
  captureStablePaint,
  sceneCropBounds,
  fidelityRecordStatus,
} from "../../scripts/ui/fidelity-contracts.mjs";
test("capture readiness rejects two equal transient frames and bounds unstable paint", async () => {
  const page = { clock: { runFor: async () => {} } };
  const frames = ["a", "a", "b", "b", "b"];
  let count = 0;
  const settled = await captureStablePaint(page, async () =>
    Buffer.from(frames[count++]),
  );
  expect(settled).toMatchObject({ stable: true, frames: 5 });
  expect(settled.png.toString()).toBe("b");
  count = 0;
  expect(
    await captureStablePaint(page, async () =>
      Buffer.from(String(count++ % 2)),
    ),
  ).toMatchObject({ stable: false, frames: 8 });
});
import reference from "../../reference/original.json";
import { requireMigrationAcceptance } from "../../scripts/ui/baseline.mjs";
import { fidelityArtifacts, digest } from "../../scripts/ui/runtime.mjs";
import {
  selectFidelityScenarios,
  fidelitySettings,
  verifyFidelityEvidence,
} from "../../scripts/ui/fidelity.mjs";
test("fidelity settings preserve distinct stress captures and reject unsupported values", () => {
  expect(fidelityArtifacts(true)).toBe(
    path.join(fidelityArtifacts(), "diagnostic"),
  );
  expect(fidelitySettings({ state: "dismissed" }).interactionState).toBe(
    "dismissed",
  );
  for (const state of [
    "reopened",
    "reconciled",
    "jobs",
    "job-return",
    "product-jobs",
  ])
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
  expect(fidelitySettings({ full: true, widths: "390,1440" }).widths).toEqual([
    390, 1440,
  ]);
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
test("proof job-entry geometry is an explicit original correspondence boundary", () => {
  expect(
    compareMeasured(
      { proofJobEntry: { width: 612, padding: "21.25px" } },
      { proofJobEntry: { width: 714, padding: "21.25px" } },
    ),
  ).toContainEqual({
    owner: "proofJobEntry",
    property: "width",
    original: 612,
    react: 714,
  });
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
test("cached scenes cannot omit or swap promised scene/crop bytes", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "cuways-cache-scenes-"),
  );
  const cache = path.join(directory, "cache"),
    output = path.join(directory, "output");
  fs.mkdirSync(output);
  const page = Buffer.from("page"),
    scene = Buffer.from("scene"),
    crop = Buffer.from("crop");
  for (const [name, bytes] of [
    ["page.png", page],
    ["scene.png", scene],
    ["crop.png", crop],
  ] as const)
    fs.writeFileSync(path.join(output, name), bytes);
  const key = captureKey({ scene: true });
  const state = {
    image: "page.png",
    imageSha256: digest(page),
    failures: [],
    scene: { image: "scene.png", imageSha256: digest(scene) },
    crops: ["crop.png"],
    cropHashes: { "crop.png": digest(crop) },
    cropRegions: {},
  };
  const save = () =>
    storeCapture(
      cache,
      key,
      output,
      ["page.png", "scene.png", "crop.png"],
      state,
    );
  const manifestFile = path.join(cache, key, "capture.json");
  try {
    save();
    expect(restoreCapture(cache, key, output)).toEqual(state);
    for (const omitted of ["scene.png", "crop.png"]) {
      save();
      const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
      manifest.files = manifest.files.filter(
        (file: { name: string }) => file.name !== omitted,
      );
      fs.writeFileSync(manifestFile, JSON.stringify(manifest));
      expect(restoreCapture(cache, key, output)).toBeNull();
    }
    save();
    const swapped = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    swapped.state.scene.image = "crop.png";
    fs.writeFileSync(manifestFile, JSON.stringify(swapped));
    expect(restoreCapture(cache, key, output)).toBeNull();
    save();
    const noScene = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    delete noScene.state.scene;
    fs.writeFileSync(manifestFile, JSON.stringify(noScene));
    expect(restoreCapture(cache, key, output)).toBeNull();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("fidelity review rejects replaced, missing and unsafe image evidence", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "cuways-fidelity-integrity-"),
  );
  try {
    const bytes = Buffer.from("captured evidence"),
      file = path.join(directory, "page.png");
    fs.writeFileSync(file, bytes);
    const state = {
      kind: "original",
      image: "page.png",
      imageSha256: digest(bytes),
      crops: [],
      cropHashes: {},
      cropRegions: {},
    };
    const report = {
      records: [
        {
          states: [state, { ...state, kind: "react" }],
          diff: "page.png",
          diffSha256: digest(bytes),
          regionComparisons: [],
        },
      ],
    };
    expect(verifyFidelityEvidence(report, directory)).toBe(true);
    fs.writeFileSync(file, "changed");
    expect(() => verifyFidelityEvidence(report, directory)).toThrow(
      "missing or changed",
    );
    fs.unlinkSync(file);
    expect(() => verifyFidelityEvidence(report, directory)).toThrow(
      "missing or changed",
    );
    state.image = "../page.png";
    expect(() => verifyFidelityEvidence(report, directory)).toThrow(
      "metadata is invalid",
    );
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("named crop and comparison receipts cannot refer to unverified or mislabeled evidence", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "cuways-region-integrity-"),
  );
  const bytes = Buffer.from("captured evidence");
  const checksum = digest(bytes);
  for (const name of [
    "page.png",
    "header.png",
    "page-diff.png",
    "header-diff.png",
  ])
    fs.writeFileSync(path.join(directory, name), bytes);
  const state = (kind: string) => ({
    kind,
    image: "page.png",
    imageSha256: checksum,
    crops: ["header.png"],
    cropHashes: { "header.png": checksum },
    cropRegions: {
      header: {
        image: "header.png",
        level: "component",
        visibility: "modal-obscured",
        method: "isolated-header",
        availability: "captured",
        clip: null,
      },
    },
  });
  const original = {
    records: [
      {
        states: [state("original"), state("react")],
        diff: "page-diff.png",
        diffSha256: checksum,
        regionComparisons: [
          {
            owner: "header",
            original: "header.png",
            react: "header.png",
            level: "component",
            visibility: { original: "modal-obscured", react: "modal-obscured" },
            availability: { original: "captured", react: "captured" },
            diff: "header-diff.png",
            diffSha256: checksum,
          },
        ],
      },
    ],
  };
  const fresh = () => JSON.parse(JSON.stringify(original));
  try {
    expect(verifyFidelityEvidence(original, directory)).toBe(true);
    for (const image of ["../header.png", "unhashed.png"]) {
      const bad = fresh();
      bad.records[0].states[0].cropRegions.header.image = image;
      expect(() => verifyFidelityEvidence(bad, directory)).toThrow(
        "named crop reference is invalid",
      );
    }
    for (const [property, value] of [
      ["level", "page"],
      ["visibility", "accepted"],
    ]) {
      const bad = fresh();
      bad.records[0].states[0].cropRegions.header[property] = value;
      expect(() => verifyFidelityEvidence(bad, directory)).toThrow(
        "level/visibility is invalid",
      );
    }
    const wrongReference = fresh();
    wrongReference.records[0].regionComparisons[0].original = "page.png";
    expect(() => verifyFidelityEvidence(wrongReference, directory)).toThrow(
      "comparison references are invalid",
    );
    const missingRegion = fresh();
    delete missingRegion.records[0].states[0].cropRegions;
    expect(() => verifyFidelityEvidence(missingRegion, directory)).toThrow(
      "crop integrity metadata is incomplete",
    );
    const missingComparison = fresh();
    missingComparison.records[0].regionComparisons = [];
    expect(() => verifyFidelityEvidence(missingComparison, directory)).toThrow(
      "regional comparisons are incomplete",
    );
    const missingCounterpart = fresh();
    missingCounterpart.records[0].states[1].crops = [];
    missingCounterpart.records[0].states[1].cropHashes = {};
    missingCounterpart.records[0].states[1].cropRegions = {};
    missingCounterpart.records[0].regionComparisons = [
      {
        owner: "header",
        reason: "missing named crop counterpart",
        original: missingCounterpart.records[0].states[0].cropRegions.header,
        react: null,
      },
    ];
    expect(verifyFidelityEvidence(missingCounterpart, directory)).toBe(true);
    delete missingCounterpart.records[0].regionComparisons[0].react;
    expect(() => verifyFidelityEvidence(missingCounterpart, directory)).toThrow(
      "missing crop counterpart metadata is invalid",
    );
    const wrongStates = fresh();
    wrongStates.records[0].states[0].kind = "react";
    expect(() => verifyFidelityEvidence(wrongStates, directory)).toThrow(
      "original/react states are incomplete",
    );
    const wrongVisibility = fresh();
    wrongVisibility.records[0].regionComparisons[0].visibility.original =
      "unobscured";
    expect(() => verifyFidelityEvidence(wrongVisibility, directory)).toThrow(
      "comparison references are invalid",
    );
    const missingHash = fresh();
    delete missingHash.records[0].regionComparisons[0].diffSha256;
    expect(() => verifyFidelityEvidence(missingHash, directory)).toThrow(
      "metadata is invalid",
    );
    fs.unlinkSync(path.join(directory, "header-diff.png"));
    expect(() => verifyFidelityEvidence(original, directory)).toThrow(
      "missing or changed: header-diff.png",
    );
    fs.writeFileSync(path.join(directory, "header-diff.png"), "changed");
    expect(() => verifyFidelityEvidence(original, directory)).toThrow(
      "missing or changed: header-diff.png",
    );
    fs.writeFileSync(path.join(directory, "header-diff.png"), bytes);
    fs.writeFileSync(path.join(directory, "page-diff.png"), "changed");
    expect(() => verifyFidelityEvidence(original, directory)).toThrow(
      "missing or changed: page-diff.png",
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test("scene crops round outward, account for scroll and expose clipped/offscreen coverage", () => {
  const scene = { width: 100, height: 200, origin: { x: 0, y: -60 } };
  expect(
    sceneCropBounds({ x: 1.2, y: -20.4, width: 5.1, height: 8.8 }, scene),
  ).toEqual({
    availability: "captured",
    clip: { x: 1, y: 39, width: 6, height: 10 },
  });
  expect(
    sceneCropBounds({ x: -4.2, y: 120.4, width: 20, height: 30 }, scene),
  ).toEqual({
    availability: "clipped",
    clip: { x: 0, y: 180, width: 16, height: 20 },
  });
  expect(
    sceneCropBounds({ x: 0, y: 160, width: 20, height: 30 }, scene),
  ).toEqual({ availability: "offscreen", clip: null });
  for (const bounds of [
    { x: NaN, y: 0, width: 5, height: 5 },
    { x: 0, y: 0, width: 0, height: 5 },
  ])
    expect(() => sceneCropBounds(bounds, scene)).toThrow(
      "Invalid measured crop",
    );
});

test("unavailable coverage cannot conceal a demonstrated asymmetric crop defect", () => {
  const coverage = { type: "coverage", reason: "offscreen region uncaptured" };
  expect(fidelityRecordStatus([coverage])).toBe("inconclusive");
  expect(
    fidelityRecordStatus([
      coverage,
      { type: "correspondence", reason: "crop availability differs" },
    ]),
  ).toBe("different");
  expect(
    fidelityRecordStatus([
      coverage,
      { owner: "proofLink", reason: "crop availability differs" },
    ]),
  ).toBe("different");
  expect(
    fidelityRecordStatus([{ type: "setup" }, { type: "correspondence" }]),
  ).toBe("inconclusive");
  expect(fidelityRecordStatus([])).toBe(
    "measurement-match; image inspection required",
  );
});

test("scene integrity distinguishes visible, clipped and unavailable crops without placeholders", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "cuways-scene-integrity-"),
  );
  const bytes = Buffer.from("verified page/crop fixture"),
    checksum = digest(bytes);
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(100, 16);
  png.writeUInt32BE(100, 20);
  fs.writeFileSync(path.join(directory, "scene.png"), png);
  for (const name of [
    "page.png",
    "page-diff.png",
    "context.png",
    "context-diff.png",
  ])
    fs.writeFileSync(path.join(directory, name), bytes);
  const create = (offscreen = true) => {
    const bounds = offscreen
      ? { x: 0, y: 120, width: 50, height: 20 }
      : { x: -4.2, y: 90.4, width: 20, height: 30 };
    const scene = {
      image: "scene.png",
      imageSha256: digest(png),
      width: 100,
      height: 100,
      origin: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      viewport: { width: 100, height: 100 },
      captureLevel: "viewport",
    };
    const availability = offscreen ? "offscreen" : "clipped";
    const state = (kind: string) => ({
      kind,
      image: "page.png",
      imageSha256: checksum,
      scene,
      measures: { context: bounds },
      crops: offscreen ? [] : ["context.png"],
      cropHashes: offscreen ? {} : { "context.png": checksum },
      cropRegions: {
        context: {
          image: offscreen ? null : "context.png",
          level: "context",
          visibility: "modal-obscured",
          method: "scene",
          ...sceneCropBounds(bounds, scene),
        },
      },
    });
    return {
      records: [
        {
          states: [state("original"), state("react")],
          diff: "page-diff.png",
          diffSha256: checksum,
          regionComparisons: [
            {
              owner: "context",
              level: "context",
              original: offscreen ? null : "context.png",
              react: offscreen ? null : "context.png",
              visibility: {
                original: "modal-obscured",
                react: "modal-obscured",
              },
              availability: { original: availability, react: availability },
              ...(offscreen
                ? { status: "uncaptured-offscreen" }
                : { diff: "context-diff.png", diffSha256: checksum }),
            },
          ],
        },
      ],
    };
  };
  const clone = (value: unknown) => JSON.parse(JSON.stringify(value));
  try {
    const unavailable = create();
    expect(verifyFidelityEvidence(unavailable, directory)).toBe(true);
    const placeholder = clone(unavailable);
    placeholder.records[0].states[0].cropRegions.context.image = "context.png";
    expect(() => verifyFidelityEvidence(placeholder, directory)).toThrow(
      "offscreen crop must not claim an image",
    );
    const falseMatch = clone(unavailable);
    falseMatch.records[0].regionComparisons[0].status =
      "pixel-match; inspection required";
    expect(() => verifyFidelityEvidence(falseMatch, directory)).toThrow(
      "offscreen comparison must remain uncaptured",
    );
    const clipped = create(false);
    expect(verifyFidelityEvidence(clipped, directory)).toBe(true);
    const asymmetric = clone(unavailable);
    asymmetric.records[0].states[1] = clone(clipped.records[0].states[1]);
    asymmetric.records[0].regionComparisons[0].react = "context.png";
    asymmetric.records[0].regionComparisons[0].availability.react = "clipped";
    asymmetric.records[0].regionComparisons[0].status =
      "different-availability";
    expect(verifyFidelityEvidence(asymmetric, directory)).toBe(true);
    asymmetric.records[0].regionComparisons[0].status = "uncaptured-offscreen";
    expect(() => verifyFidelityEvidence(asymmetric, directory)).toThrow(
      "offscreen comparison must remain uncaptured",
    );
    const swapped = clone(clipped);
    swapped.records[0].regionComparisons[0].availability.original = "captured";
    expect(() => verifyFidelityEvidence(swapped, directory)).toThrow(
      "comparison references are invalid",
    );
    const wrongClip = clone(clipped);
    wrongClip.records[0].states[0].cropRegions.context.clip.y = 0;
    expect(() => verifyFidelityEvidence(wrongClip, directory)).toThrow(
      "bounds or availability are invalid",
    );
    const missing = clone(clipped);
    missing.records[0].states[0].crops = [];
    missing.records[0].states[0].cropHashes = {};
    expect(() => verifyFidelityEvidence(missing, directory)).toThrow(
      "named crop reference is invalid",
    );
    const origin = clone(clipped);
    origin.records[0].states[0].scene.origin.y = -10;
    expect(() => verifyFidelityEvidence(origin, directory)).toThrow(
      "scene origin or viewport is invalid",
    );
    const size = clone(clipped);
    size.records[0].states[0].scene.width = 110;
    size.records[0].states[0].scene.viewport.width = 110;
    expect(() => verifyFidelityEvidence(size, directory)).toThrow(
      "scene dimensions do not match",
    );
    const unknown = clone(clipped);
    delete unknown.records[0].states[0].scene;
    expect(() => verifyFidelityEvidence(unknown, directory)).toThrow(
      "scene crop coverage is incomplete",
    );
    const replaced = clone(clipped);
    replaced.records[0].states[0].scene.image = "page.png";
    replaced.records[0].states[0].scene.imageSha256 = checksum;
    expect(() => verifyFidelityEvidence(replaced, directory)).toThrow(
      "scene dimensions do not match",
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
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

test("a small component defect cannot disappear into a large blank page", () => {
  const pixels = 30; // A small wrong border/icon area: all channels already exceed the canvas threshold.
  const page = {
    pixels,
    width: 2560,
    height: 3000,
    ratio: pixels / (2560 * 3000),
    original: [2560, 3000],
    candidate: [2560, 3000],
  };
  const badge = {
    pixels,
    width: 180,
    height: 40,
    ratio: pixels / (180 * 40),
    original: [180, 40],
    candidate: [180, 40],
  };
  expect(pixelRegionDifference(page)).toBeNull();
  expect(
    pixelRegionDifference(badge, { owner: "lifecycle", level: "component" }),
  ).toMatchObject({ owner: "lifecycle-pixels", changedPixels: 30 });
  expect(
    pixelRegionDifference(
      { ...badge, pixels: 1, ratio: 1 / (180 * 40) },
      { owner: "lifecycle", level: "component" },
    ),
  ).toMatchObject({
    owner: "lifecycle-pixels",
    changedPixels: 1,
    allowedPixels: 0,
  });
  expect(
    pixelRegionDifference(
      { ...badge, pixels: 0, ratio: 0 },
      { owner: "lifecycle", level: "component" },
    ),
  ).toBeNull();
  expect(
    pixelRegionDifference(
      { ...badge, pixels: 0, ratio: 0, candidate: [181, 40] },
      { owner: "lifecycle", level: "component" },
    ),
  ).toMatchObject({ dimensions: { original: [180, 40], react: [181, 40] } });
});
test("isolated header capture cannot replace the real page focus paint contract", () => {
  expect(
    compareMeasured(
      { focusPaint: { color: "rgb(16, 16, 16)" } },
      { focusPaint: { color: "rgb(238, 238, 238)" } },
    ),
  ).toContainEqual({
    owner: "page-focus-paint",
    property: "color",
    original: "rgb(16, 16, 16)",
    react: "rgb(238, 238, 238)",
  });
  expect(compareMeasured({ focusPaint: {} }, {})).toContainEqual({
    owner: "page-focus-paint",
    reason: "missing counterpart",
  });
});
