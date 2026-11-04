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
export function verifyFidelityEvidence(report, directory) {
  for (const record of report.records)
    for (const state of record.states) {
      const images = { [state.image]: state.imageSha256, ...state.cropHashes };
      if (
        !Array.isArray(state.crops) ||
        state.crops.some((file) => !state.cropHashes?.[file])
      )
        throw Error("Fidelity crop integrity metadata is incomplete");
      for (const [name, checksum] of Object.entries(images)) {
        if (
          !/^[a-z0-9][a-z0-9.-]*\.png$/i.test(name) ||
          typeof checksum !== "string" ||
          !/^[a-f0-9]{64}$/.test(checksum)
        )
          throw Error("Fidelity image integrity metadata is invalid");
        const file = path.join(directory, name);
        if (!fs.existsSync(file) || digest(fs.readFileSync(file)) !== checksum)
          throw Error(`Fidelity evidence image missing or changed: ${name}`);
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
    !["initial", "dismissed", "reopened", "reconciled"].includes(
      interactionState,
    )
  )
    throw Error(
      "Invalid fidelity state: initial, dismissed, reopened or reconciled",
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
