import fs from "node:fs";
import path from "node:path";
import {
  root,
  current,
  readJSON,
  writeJSON,
  digest,
  fingerprint,
  files,
  git,
  acquire,
  ownedArtifact,
  stageRun,
  changedFiles,
  sourceScope,
  sourceHygiene,
  packageCommand,
  run,
} from "./runtime.mjs";
import { retrieve, canonicalEnvironment } from "./baseline.mjs";
import { nativeCall } from "./native.mjs";
export function verifyRegistry(preferences, index) {
  const ids = new Set();
  for (const rule of [
    ...preferences.global,
    ...preferences.components,
    ...preferences.exceptions,
  ]) {
    if (ids.has(rule.id)) throw Error(`Duplicate rule ${rule.id}`);
    ids.add(rule.id);
  }
  for (const component of preferences.components)
    for (const source of [
      component.source,
      component.style,
      ...component.checks,
    ])
      if (!fs.existsSync(path.join(root, source)))
        throw Error(`Missing source/check ${source}`);
  for (const exception of preferences.exceptions) {
    if (
      !exception.reason ||
      !ids.has(exception.target) ||
      !index.entries[exception.story]
    )
      throw Error(`Invalid scoped exception ${exception.id}`);
  }
  const scenarioFiles = files(path.join(root, "src/features")).filter((p) =>
    p.endsWith("scenarios.json"),
  );
  const scenarios = scenarioFiles.flatMap((p) =>
    readJSON(p).map((s) => ({ feature: p.match(/us(\d+)/)[1], ...s })),
  );
  if (scenarios.length !== 94)
    throw Error("Legacy scenario inventory must contain 94 cases");
  for (const s of scenarios) {
    const id = `us${s.feature}--${s.id[0].toLowerCase()}-${s.id.slice(1)}`;
    if (
      !s.expected ||
      !index.entries[id] ||
      !index.entries[id].tags.includes("play-fn")
    )
      throw Error(`Missing executable scenario ${id}`);
  }
  return { scenarios: 94, components: preferences.components.length };
}
export async function check(options) {
  const release = acquire();
  let transaction;
  const source = fingerprint();
  const failures = [];
  const gates = [];
  let footprint;
  let expectedStories = [];
  let requiredStories = [];
  const started = Date.now();
  const gate = (name, pkg, args) => {
    const at = Date.now();
    const result = packageCommand(pkg, args, {
      log: path.join(current, name + ".log"),
    });
    const value = {
      name,
      passed: result.status === 0,
      milliseconds: Date.now() - at,
      log: name + ".log",
    };
    gates.push(value);
    if (!value.passed) failures.push({ gate: name, log: value.log });
    return value.passed;
  };
  try {
    const changes = changedFiles();
    const declaration = options.scope
      ? readJSON(ownedArtifact(path.resolve(options.scope)))
      : { intent: options.intent ?? "shared", target: options.target ?? "all" };
    if (!["local", "shared", "global"].includes(declaration.intent))
      throw Error("Intent must be local, shared or global");
    const prefs = readJSON(path.join(root, "preferences/current.json"));
    const known = prefs.components.find(
      (c) =>
        c.id.toLowerCase() === declaration.target?.toLowerCase() ||
        c.aliases.some(
          (a) => a.toLowerCase() === declaration.target?.toLowerCase(),
        ),
    );
    const featureMatch = declaration.target?.match(
      /(?:us)?(025|026|027|028|034)/,
    );
    const feature =
      featureMatch?.[1] ??
      (declaration.target === "proof-delivery" ? "026" : undefined);
    if (declaration.target !== "all" && !known && !feature)
      throw Error("Unknown target. Use ui context first.");
    if (declaration.intent === "local" && !feature)
      throw Error("Local intent requires a named feature owner");
    if (
      (declaration.allowedProperties ?? []).some(
        (p) => !["external-spacing"].includes(p),
      )
    )
      throw Error(
        "Unsupported allowed property; component internals remain protected",
      );
    if (
      declaration.region &&
      !prefs.components.some((c) => c.id === declaration.region)
    )
      throw Error("Unknown region; use a canonical data-ui component ID.");
    const scope = sourceScope(changes.files, declaration);
    transaction = stageRun();
    try {
      footprint = sourceHygiene();
      gates.push({ name: "source-hygiene", passed: true });
    } catch (error) {
      failures.push({ gate: "source-hygiene", message: error.message });
    }
    let nativeTracking;
    try {
      nativeTracking = await nativeCall("stories-changed");
      writeJSON(path.join(current, "native-tracking.json"), nativeTracking);
    } catch {
      nativeTracking = null;
    }
    if (scope.violations.length)
      failures.push({
        gate: "scope",
        files: scope.violations,
        reason: "Local task modified shared ownership",
      });
    console.log(
      `Scope: ${options.full || scope.full ? "full" : scope.features.join(", ")} (${scope.reason})`,
    );
    gate("format", "prettier", [".", "--check"]);
    gate("types", "typescript", []);
    gate("eslint", "eslint", ["."]);
    gate("styles", "stylelint", ["src/**/*.css"]);
    gate("unit", "vitest", ["run", "--project", "unit"]);
    gate("stories", "vitest", ["run", "--project", "stories"]);
    const built =
      !failures.length &&
      gate("build", "storybook", ["build", "--disable-telemetry"]);
    let reference = { status: "not-checked", descriptor: {} };
    let environment = canonicalEnvironment;
    let rendered = null;
    if (built) {
      const index = readJSON(path.join(root, "storybook-static/index.json"));
      try {
        verifyRegistry(prefs, index);
      } catch (error) {
        failures.push({ gate: "registry", message: error.message });
      }
      const selected = Object.values(index.entries)
        .filter((e) => e.type === "story")
        .filter(
          (e) =>
            options.full ||
            scope.full ||
            e.id.startsWith("system--") ||
            scope.features.some((id) => e.id.startsWith(`us${id}--`)) ||
            ["us027--a-03", "us028--a-03", "us034--a-01"].includes(e.id),
        );
      if (options.native)
        environment = `native-${process.platform}-${process.arch}`;
      try {
        reference = retrieve(environment);
      } catch (error) {
        reference = {
          status: "invalid",
          descriptor: {},
          message: error.message,
        };
      }
      const input = {
        stories: selected,
        target: known?.id,
        owner: known?.id,
        feature,
        intent: declaration.intent,
        region: declaration.region,
        allowedProperties: declaration.allowedProperties ?? [],
        stress: !!options.stress || (!!options.full && !options.smoke),
        viewports: [
          { width: 390, height: 844 },
          { width: 1440, height: 900 },
        ],
        referenceUsable: reference.status === "valid",
      };
      if (options.smoke)
        input.stories = selected.filter((e) =>
          [
            "system--contracts",
            "us025--l-02",
            "us025--d-02",
            "us026--a-01",
            "us026--a-03",
            "us027--a-02",
            "us027--a-05",
            "us028--a-04",
            "us034--a-01",
            "us034--a-04",
          ].includes(e.id),
        );
      requiredStories = selected.map((s) => s.id);
      expectedStories = input.stories.map((s) => s.id);
      writeJSON(path.join(current, "capture-input.json"), input);
      let capture;
      if (options.native)
        capture = packageCommand(
          "@playwright/test",
          ["test", "--config", "playwright.config.ts"],
          { log: path.join(current, "capture.log"), timeout: 900000 },
        );
      else {
        const docker = run("docker", ["version", "--format", "{{.Server.Os}}"]);
        if (docker.status !== 0 || !docker.stdout.includes("linux"))
          capture = {
            status: null,
            stdout: "",
            stderr: "Canonical Docker engine unavailable",
          };
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
            { log: path.join(current, "renderer-build.log"), timeout: 300000 },
          );
          capture =
            build.status === 0
              ? run(
                  "docker",
                  [
                    "run",
                    "--rm",
                    "--init",
                    "--ipc=host",
                    "--platform=linux/amd64",
                    "-e",
                    "UI_RUN_DIR=/runner/.artifacts/ui/staging",
                    "-v",
                    `${path.join(root, "storybook-static")}:/runner/storybook-static:ro`,
                    "-v",
                    `${path.join(root, ".artifacts")}:/runner/.artifacts`,
                    "cuways-uxui-renderer:1.64.1",
                  ],
                  { log: path.join(current, "capture.log"), timeout: 900000 },
                )
              : build;
        }
      }
      if (fs.existsSync(path.join(current, "rendered.json"))) {
        rendered = readJSON(path.join(current, "rendered.json"));
        if (capture.status !== 0 || rendered.failures.length)
          failures.push({
            gate: "rendered",
            count: rendered.failures.length,
            log: "capture.log",
          });
      } else if (capture.status === null)
        gates.push({
          name: "canonical-rendering",
          passed: false,
          inconclusive: true,
        });
      else failures.push({ gate: "capture", log: "capture.log" });
    }
    if (source !== fingerprint())
      failures.push({
        gate: "stale-source",
        message: "Source changed during checking",
      });
    const statuses = rendered?.records.map((r) => r.status) ?? [];
    const visualPending =
      !!options.smoke ||
      reference.status !== "valid" ||
      statuses.some((s) => ["inconclusive", "intended-pending"].includes(s)) ||
      !rendered;
    const report = {
      schemaVersion: 1,
      id: digest(source + String(started)).slice(0, 16),
      sourceFingerprint: source,
      coverage: {
        fullRequested: !!options.full,
        diagnosticSubset: !!options.smoke,
        canonical: !options.native,
        expectedLegacy: 94,
      },
      revision: git(["rev-parse", "HEAD"]),
      footprint,
      dirty: !!git(["status", "--porcelain"]),
      environment,
      browser: rendered?.browser,
      referenceId: reference.descriptor?.id,
      reference: reference.status,
      referenceClass: reference.descriptor?.classification ?? "missing",
      renderedDigest: fs.existsSync(path.join(current, "rendered.json"))
        ? digest(fs.readFileSync(path.join(current, "rendered.json")))
        : null,
      declaration,
      scope: {
        ...scope,
        changedFiles: changes.files,
        checkedStories: rendered?.checkedStories ?? [],
        canonicalOwner:
          known?.source ??
          (feature ? `src/features/us${feature}` : "global owners"),
        expectedStories,
        requiredStories,
        unvisitedStories: requiredStories.filter(
          (s) => !rendered?.checkedStories.includes(s),
        ),
        observedConsumers: rendered
          ? Object.fromEntries(
              [
                ...new Set(
                  rendered.records.flatMap((r) =>
                    (r.observations ?? []).map((n) => n.ui),
                  ),
                ),
              ].map((ui) => [
                ui,
                {
                  stories: [
                    ...new Set(
                      rendered.records
                        .filter((r) =>
                          (r.observations ?? []).some((n) => n.ui === ui),
                        )
                        .map((r) => r.story),
                    ),
                  ],
                  instances: rendered.records.reduce(
                    (n, r) =>
                      n +
                      (r.observations ?? []).filter((o) => o.ui === ui).length,
                    0,
                  ),
                },
              ]),
            )
          : {},
        unknowns: [
          nativeTracking
            ? "Native development tracking available; current orchestration retains conservative ownership scope."
            : "Native graph unavailable; conservative ownership scope used.",
        ],
      },
      gates,
      failures,
      visual: {
        counts: Object.fromEntries(
          [
            "unchanged",
            "intended-pending",
            "unexpected",
            "failed",
            "inconclusive",
          ].map((k) => [k, statuses.filter((s) => s === k).length]),
        ),
        inspection:
          statuses.length && statuses.every((s) => s === "unchanged")
            ? "unchanged-reference"
            : "required",
        humanPalette: "pending",
      },
      milliseconds: Date.now() - started,
      result: failures.length
        ? "failure"
        : visualPending
          ? "inconclusive"
          : "success",
    };
    writeJSON(path.join(current, "report.json"), report);
    transaction.commit();
    console.log(
      JSON.stringify(
        {
          reportId: report.id,
          result: report.result,
          failures,
          visual: report.visual,
          scope: report.scope.checkedStories.length,
          evidence: ".artifacts/ui/current/report.json",
        },
        null,
        2,
      ),
    );
    return failures.length ? 1 : visualPending ? 2 : 0;
  } finally {
    transaction?.finish();
    release();
  }
}
