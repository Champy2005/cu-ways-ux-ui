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
} from "./runtime.mjs";
import { prepareOriginal, verifyOriginal } from "./original-reference.mjs";
export function fidelity(options) {
  const release = acquire();
  try {
    return runFidelity(options);
  } finally {
    release();
  }
}
function runFidelity(options) {
  if (options.prepare) return prepareOriginal(options.prepare);
  const reference = verifyOriginal();
  const selected = options.target
    ? reference.scenarios.filter(
        (s) =>
          options.target.split(",").includes(s.story) ||
          options.target
            .split(",")
            .some((target) => s.feature === target.replace(/^us/i, "")),
      )
    : reference.scenarios;
  if (!selected.length) throw Error("Unknown fidelity scenario/feature");
  const before = fingerprint();
  const types = packageCommand("typescript", ["--noEmit"], {
    log: path.join(artifacts, "fidelity-types.log"),
  });
  if (types.status !== 0)
    throw Error("Fidelity preflight failed: .artifacts/ui/fidelity-types.log");
  const built = packageCommand("storybook", ["build", "--disable-telemetry"], {
    log: path.join(artifacts, "fidelity-build.log"),
  });
  if (built.status !== 0) throw Error("Fidelity preview build failed");
  const input = {
    reference: reference.id,
    sourceFingerprint: before,
    scenarios: selected,
    widths: options.full
      ? [320, 390, 768, 1024, 1440, 1920, 2560]
      : [390, 1440],
    themes: ["light", "dark"],
    height: 900,
    material: "opaque",
    textScale: 100,
    scope: "source fidelity; not human palette approval",
  };
  writeJSON(path.join(artifacts, "fidelity-input.json"), input);
  let result;
  if (options.native)
    result = run(process.execPath, ["scripts/ui/fidelity-runner.mjs"], {
      log: path.join(artifacts, "fidelity.log"),
      timeout: 900000,
    });
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
        log: path.join(artifacts, "fidelity-renderer-build.log"),
        timeout: 300000,
      },
    );
    if (build.status !== 0)
      throw Error("Canonical fidelity renderer unavailable");
    result = run(
      "docker",
      [
        "run",
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
      ],
      { log: path.join(artifacts, "fidelity.log"), timeout: 900000 },
    );
  }
  if (fingerprint() !== before)
    throw Error("Fidelity evidence stale: source changed");
  if (result.status !== 0)
    throw Error("Fidelity capture failed; inspect .artifacts/ui/fidelity.log");
  return JSON.parse(
    fs.readFileSync(path.join(artifacts, "fidelity/report.json"), "utf8"),
  );
}
