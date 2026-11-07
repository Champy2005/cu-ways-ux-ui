import fs from "node:fs";
import path from "node:path";
import {
  root,
  artifacts,
  run,
  packageCommand,
  writeJSON,
  fingerprint,
  acquire,
  changedFiles,
  sourceScope,
  fidelityArtifacts,
  digest,
} from "./runtime.mjs";
import {
  prepareOriginal,
  verifyOriginal,
  exportOriginal,
  restoreOriginal,
} from "./original-reference.mjs";
import { fidelityTimeout, runOwnedRenderer } from "./renderer.mjs";
import { sceneCropBounds } from "./fidelity-contracts.mjs";
export function verifyFidelityEvidence(report, directory) {
  const verifyImage = (name, checksum) => {
    if (
      !/^[a-z0-9][a-z0-9.-]*\.png$/i.test(name) ||
      typeof checksum !== "string" ||
      !/^[a-f0-9]{64}$/.test(checksum)
    )
      throw Error("Fidelity image integrity metadata is invalid");
    const file = path.join(directory, name);
    if (!fs.existsSync(file) || digest(fs.readFileSync(file)) !== checksum)
      throw Error(`Fidelity evidence image missing or changed: ${name}`);
  };
  if (!Array.isArray(report.records))
    throw Error("Fidelity report records are incomplete; recapture evidence");
  for (const record of report.records) {
    if (
      !Array.isArray(record.states) ||
      record.states.length !== 2 ||
      record.states[0]?.kind !== "original" ||
      record.states[1]?.kind !== "react"
    )
      throw Error(
        "Fidelity original/react states are incomplete; recapture evidence",
      );
    for (const state of record.states) {
      if (
        !Array.isArray(state.crops) ||
        new Set(state.crops).size !== state.crops.length ||
        !state.cropRegions ||
        typeof state.cropRegions !== "object" ||
        Array.isArray(state.cropRegions) ||
        !state.cropHashes ||
        typeof state.cropHashes !== "object" ||
        Array.isArray(state.cropHashes) ||
        state.crops.some((file) => !Object.hasOwn(state.cropHashes, file)) ||
        Object.keys(state.cropHashes).some(
          (file) => !state.crops.includes(file),
        )
      )
        throw Error(
          "Fidelity crop integrity metadata is incomplete; recapture evidence",
        );
      verifyImage(state.image, state.imageSha256);
      for (const [name, checksum] of Object.entries(state.cropHashes))
        verifyImage(name, checksum);
      if (state.scene) {
        const scene = state.scene;
        if (
          !scene.origin ||
          !scene.scroll ||
          !scene.viewport ||
          ![
            scene.origin.x,
            scene.origin.y,
            scene.scroll.x,
            scene.scroll.y,
            scene.viewport.width,
            scene.viewport.height,
          ].every(Number.isFinite) ||
          !Number.isInteger(scene.width) ||
          !Number.isInteger(scene.height) ||
          scene.width <= 0 ||
          scene.height <= 0 ||
          !["viewport", "full page"].includes(scene.captureLevel)
        )
          throw Error("Fidelity scene bounds are invalid");
        const expectedOrigin =
          scene.captureLevel === "viewport"
            ? { x: 0, y: 0 }
            : { x: -scene.scroll.x, y: -scene.scroll.y };
        if (
          scene.origin.x !== expectedOrigin.x ||
          scene.origin.y !== expectedOrigin.y ||
          (scene.captureLevel === "viewport" &&
            (scene.width !== scene.viewport.width ||
              scene.height !== scene.viewport.height))
        )
          throw Error("Fidelity scene origin or viewport is invalid");
        verifyImage(scene.image, scene.imageSha256);
        const png = fs.readFileSync(path.join(directory, scene.image));
        if (
          png.length < 24 ||
          !png
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
          png.readUInt32BE(16) !== scene.width ||
          png.readUInt32BE(20) !== scene.height
        )
          throw Error("Fidelity scene dimensions do not match its image");
      }
      const regionImages = [];
      for (const [owner, region] of Object.entries(state.cropRegions)) {
        if (!/^[a-z][a-z0-9]*$/i.test(owner) || !region)
          throw Error(`Fidelity named crop reference is invalid: ${owner}`);
        if (
          !["component", "context"].includes(region.level) ||
          !["unobscured", "modal-obscured"].includes(region.visibility)
        )
          throw Error(`Fidelity crop level/visibility is invalid: ${owner}`);
        if (
          !["captured", "clipped", "offscreen"].includes(region.availability) ||
          !["scene", "isolated-header"].includes(region.method)
        )
          throw Error(
            `Fidelity named crop capture metadata is invalid: ${owner}`,
          );
        if (region.method === "isolated-header") {
          if (
            owner !== "header" ||
            region.availability !== "captured" ||
            region.clip !== null
          )
            throw Error(
              `Fidelity isolated header metadata is invalid: ${owner}`,
            );
        } else {
          if (!state.scene || !state.measures?.[owner])
            throw Error(`Fidelity scene crop coverage is incomplete: ${owner}`);
          const expected = sceneCropBounds(state.measures[owner], state.scene);
          if (
            region.availability !== expected.availability ||
            JSON.stringify(region.clip) !== JSON.stringify(expected.clip)
          )
            throw Error(
              `Fidelity scene crop bounds or availability are invalid: ${owner}`,
            );
        }
        if (region.availability === "offscreen") {
          if (region.image !== null || region.clip !== null)
            throw Error(
              `Fidelity offscreen crop must not claim an image: ${owner}`,
            );
          continue;
        }
        if (
          !state.crops.includes(region.image) ||
          !Object.hasOwn(state.cropHashes, region.image)
        )
          throw Error(`Fidelity named crop reference is invalid: ${owner}`);
        regionImages.push(region.image);
      }
      if (
        regionImages.length !== state.crops.length ||
        new Set(regionImages).size !== regionImages.length
      )
        throw Error(
          "Fidelity named crop coverage is incomplete; recapture evidence",
        );
    }
    verifyImage(record.diff, record.diffSha256);
    const [original, react] = record.states;
    const owners = new Set([
      ...Object.keys(original.cropRegions),
      ...Object.keys(react.cropRegions),
    ]);
    if (
      !Array.isArray(record.regionComparisons) ||
      record.regionComparisons.length !== owners.size ||
      new Set(record.regionComparisons.map((entry) => entry.owner)).size !==
        owners.size
    )
      throw Error(
        "Fidelity regional comparisons are incomplete; recapture evidence",
      );
    for (const comparison of record.regionComparisons) {
      const owner = comparison.owner;
      if (!owners.has(owner))
        throw Error(`Fidelity regional comparison owner is invalid: ${owner}`);
      const left = original.cropRegions[owner],
        right = react.cropRegions[owner];
      if (!left || !right) {
        const matches = (actual, expected) =>
          expected
            ? actual?.image === expected.image &&
              actual?.level === expected.level &&
              actual?.visibility === expected.visibility &&
              actual?.method === expected.method &&
              actual?.availability === expected.availability &&
              JSON.stringify(actual?.clip) === JSON.stringify(expected.clip)
            : actual === null;
        if (
          comparison.reason !== "missing named crop counterpart" ||
          !matches(comparison.original, left) ||
          !matches(comparison.react, right)
        )
          throw Error(
            `Fidelity missing crop counterpart metadata is invalid: ${owner}`,
          );
        continue;
      }
      if (
        comparison.original !== left.image ||
        comparison.react !== right.image ||
        comparison.level !== left.level ||
        comparison.level !== right.level ||
        comparison.visibility?.original !== left.visibility ||
        comparison.visibility?.react !== right.visibility ||
        comparison.availability?.original !== left.availability ||
        comparison.availability?.react !== right.availability
      )
        throw Error(
          `Fidelity regional comparison references are invalid: ${owner}`,
        );
      if (
        left.availability === "offscreen" ||
        right.availability === "offscreen"
      ) {
        if (
          comparison.status !==
            (left.availability === right.availability
              ? "uncaptured-offscreen"
              : "different-availability") ||
          comparison.diff !== undefined ||
          comparison.diffSha256 !== undefined
        )
          throw Error(
            `Fidelity offscreen comparison must remain uncaptured: ${owner}`,
          );
        continue;
      }
      verifyImage(comparison.diff, comparison.diffSha256);
    }
  }
  return true;
}
export function fidelity(options) {
  const release = acquire();
  try {
    return runFidelity(options);
  } catch (error) {
    if (
      !options.prepare &&
      !options.exportReference &&
      !options.restoreReference
    )
      writeJSON(path.join(fidelityArtifacts(options.diagnostic), "run.json"), {
        status: "failed",
        sourceFingerprint: fingerprint(),
        reason: String(error),
        report: "Previous report is not evidence for this failed attempt",
      });
    throw error;
  } finally {
    release();
  }
}
export function selectFidelityScenarios(reference, options, scope) {
  const requested = options.target
    ? reference.scenarios.filter((s) =>
        options.target
          .split(",")
          .some(
            (target) =>
              target === s.story || s.feature === target.replace(/^us/i, ""),
          ),
      )
    : reference.scenarios;
  if (!requested.length) throw Error("Unknown fidelity scenario/feature");
  const scenarios = options.diagnostic
    ? requested
    : scope.full
      ? reference.scenarios
      : reference.scenarios.filter(
          (s) => requested.includes(s) || scope.features.includes(s.feature),
        );
  return {
    scenarios,
    diagnostic: !!options.diagnostic,
    reason: options.diagnostic
      ? "explicit diagnostic subset; cannot establish affected-scope completion"
      : scope.reason,
    requested: requested.map((s) => s.story),
  };
}
export function fidelitySettings(options) {
  const interactionState = options.state ?? "initial";
  if (
    ![
      "initial",
      "dismissed",
      "reopened",
      "reconciled",
      "jobs",
      "job-return",
      "product-jobs",
    ].includes(interactionState)
  )
    throw Error(
      "Invalid fidelity state: initial, dismissed, reopened, reconciled, jobs, job-return or product-jobs",
    );
  const widths =
    options.widths === undefined
      ? options.full
        ? [320, 390, 768, 1024, 1440, 1920, 2560]
        : [390, 1440]
      : String(options.widths).split(",").map(Number);
  if (
    !widths.length ||
    widths.length > 24 ||
    widths.some(
      (width) => !Number.isSafeInteger(width) || width < 280 || width > 3840,
    ) ||
    new Set(widths).size !== widths.length
  )
    throw Error(
      "Invalid fidelity widths: 1–24 unique integer widths between 280 and 3840",
    );
  const height = Number(options.height ?? 900),
    textScale = Number(options.textScale ?? 100),
    material = options.material ?? "opaque",
    fixture = options.fixture ?? "standard";
  if (
    !Number.isInteger(height) ||
    height < 320 ||
    height > 2160 ||
    ![100, 150, 200].includes(textScale) ||
    !["opaque", "glass"].includes(material) ||
    !["standard", "long"].includes(fixture)
  )
    throw Error(
      "Invalid fidelity settings: height 320–2160, text scale 100/150/200, material opaque/glass, fixture standard/long",
    );
  return {
    interactionState,
    widths,
    height,
    textScale,
    material,
    fixture,
    reducedMotion: !!options.reducedMotion,
    reducedTransparency: !!options.reducedTransparency,
  };
}
function runFidelity(options) {
  if (options.prepare) return prepareOriginal(options.prepare);
  if (options.exportReference) return exportOriginal(options.exportReference);
  if (options.restoreReference)
    return restoreOriginal(options.restoreReference);
  const settings = fidelitySettings(options);
  const reference = verifyOriginal();
  const selection = selectFidelityScenarios(
    reference,
    options,
    sourceScope(changedFiles().files),
  );
  const before = fingerprint();
  const output = fidelityArtifacts(options.diagnostic);
  const log = (name) => path.join(output, name);
  const runnerArgs = options.diagnostic ? ["--diagnostic"] : [];
  writeJSON(path.join(output, "run.json"), {
    status: "running",
    sourceFingerprint: before,
    settings,
    selection,
  });
  const types = packageCommand("typescript", ["--noEmit"], {
    log: log("types.log"),
  });
  if (types.status !== 0)
    throw Error(`Fidelity preflight failed: ${log("types.log")}`);
  const models = run(
    process.execPath,
    ["scripts/ui/model-correspondence.mjs"],
    {
      log: log("models.log"),
      timeout: 30000,
    },
  );
  if (models.status !== 0)
    throw Error(
      `Original model correspondence failed; inspect ${log("models.log")}`,
    );
  const built = packageCommand("storybook", ["build", "--disable-telemetry"], {
    log: log("build.log"),
  });
  if (built.status !== 0) throw Error("Fidelity preview build failed");
  const input = {
    reference: reference.id,
    sourceFingerprint: before,
    scenarios: selection.scenarios,
    navigationOverride: reference.overrides.find(
      (override) => override.owner === "product-navigation",
    ),
    selection,
    themes: ["light", "dark"],
    ...settings,
    environment: options.native
      ? `native-${process.platform}-${process.arch}-${process.version}`
      : "playwright-1.64.1-linux-amd64-47b510dd9230bf0b",
    scope: "source fidelity; not human palette approval",
  };
  writeJSON(path.join(output, "input.json"), input);
  const timeout = fidelityTimeout(
    input.scenarios.length * input.widths.length * input.themes.length,
  );
  let result;
  if (options.native)
    result = run(
      process.execPath,
      ["scripts/ui/fidelity-runner.mjs", ...runnerArgs],
      {
        log: log("capture.log"),
        timeout,
      },
    );
  else {
    const build = run(
      "docker",
      [
        "build",
        "-f",
        "Dockerfile.visual",
        "-t",
        "cuways-uxui-renderer:1.64.1",
        ".",
      ],
      {
        log: log("renderer-build.log"),
        timeout: 300000,
      },
    );
    if (build.status !== 0)
      throw Error("Canonical fidelity renderer unavailable");
    result = runOwnedRenderer(
      [
        "--rm",
        "--init",
        "--ipc=host",
        "--platform=linux/amd64",
        "-v",
        `${path.join(root, "storybook-static")}:/runner/storybook-static:ro`,
        "-v",
        `${artifacts}:/runner/.artifacts/ui`,
        "cuways-uxui-renderer:1.64.1",
        "node",
        "scripts/ui/fidelity-runner.mjs",
        ...runnerArgs,
      ],
      { log: log("capture.log"), timeout },
    );
  }
  if (fingerprint() !== before)
    throw Error("Fidelity evidence stale: source changed");
  if (result.status !== 0)
    throw Error(`Fidelity capture failed; inspect ${log("capture.log")}`);
  const report = JSON.parse(
    fs.readFileSync(path.join(output, "report.json"), "utf8"),
  );
  verifyFidelityEvidence(report, output);
  writeJSON(path.join(output, "run.json"), {
    status: "completed",
    sourceFingerprint: before,
    settings,
    records: report.records.length,
  });
  return report;
}
