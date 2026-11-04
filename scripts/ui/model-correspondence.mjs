import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { root, artifacts, readJSON, writeJSON } from "./runtime.mjs";
import { verifyOriginal, originalDirectory } from "./original-reference.mjs";

const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );

/** Bounded model correspondence is separate from controller/browser evidence. */
export function compareStateModels({
  original,
  candidate,
  scenarios,
  events,
  maxDepth = 4,
  maxStates = 5000,
}) {
  const queue = scenarios.map((id) => ({
    original: original.seed(id),
    candidate: candidate.seed(id),
    trace: [id],
    depth: 0,
  }));
  const seen = new Set(),
    mismatches = [];
  for (let index = 0; index < queue.length; index++) {
    const state = queue[index];
    const left = canonical(state.original),
      right = canonical(state.candidate);
    const identity = left + "|" + right;
    if (seen.has(identity)) continue;
    if (seen.size >= maxStates)
      throw Error(
        "Model correspondence state budget exhausted; coverage incomplete",
      );
    seen.add(identity);
    if (left !== right) {
      mismatches.push(state);
      if (mismatches.length >= 10) break;
    }
    if (state.depth >= maxDepth) continue;
    for (const event of events) {
      const nextOriginal = original.reduce(state.original, event);
      const nextCandidate = candidate.reduce(state.candidate, event);
      if (
        canonical(nextOriginal) !== left ||
        canonical(nextCandidate) !== right
      )
        queue.push({
          original: nextOriginal,
          candidate: nextCandidate,
          trace: [...state.trace, event],
          depth: state.depth + 1,
        });
    }
  }
  return {
    statesCompared: seen.size,
    maxDepth,
    eventVariants: events.length,
    mismatches,
  };
}

function eventsFor(feature) {
  if (feature === "026")
    return [
      { type: "draft", value: "https://example.com/proof" },
      { type: "draft", value: "bad" },
      ...[
        "submit",
        "timeout",
        "add-another",
        "reopen-form",
        "check-saved",
        "retry-list",
        "refresh-status",
        "open-job",
        "close-form",
      ].map((type) => ({ type })),
      ...[
        "confirmed",
        "type-rejected",
        "unknown-saved",
        "unknown-miss",
        "job-completed",
        "access-revoked",
      ].map((outcome) => ({ type: "resolve-save", outcome })),
      ...["available", "unavailable"].map((outcome) => ({
        type: "resolve-check",
        outcome,
      })),
      ...["loaded", "failed", "access-revoked"].map((outcome) => ({
        type: "resolve-list",
        outcome,
      })),
      { type: "resolve-status" },
    ];
  return [
    ...[
      "dismiss",
      "reopen",
      "timeout",
      "check",
      "complete",
      "cancel-job",
      "confirm",
      "next",
      "previous",
      "clear-filter",
    ].map((type) => ({ type })),
    ...["1", "5", "all"].map((filter) => ({ type: "filter", filter })),
    ...[
      "success",
      "failed",
      "access",
      "unknown",
      "proof-missing",
      "paid",
      "completed",
    ].flatMap((outcome) =>
      ["success", "failed", "access", "missing", "unchanged"].map((read) => ({
        type: "resolve",
        outcome,
        read,
      })),
    ),
  ];
}

export async function verifyModelCorrespondence() {
  const reference = verifyOriginal(),
    results = [];
  for (const feature of ["026", "027", "028", "034"]) {
    const original = await import(
      pathToFileURL(
        path.join(originalDirectory, `US-${feature}/demo/state-machine.mjs`),
      )
    );
    const candidate = await import(
      pathToFileURL(path.join(root, `src/features/us${feature}/model.mjs`))
    );
    let scenarios = readJSON(
      path.join(originalDirectory, `US-${feature}/model/scenarios.json`),
    );
    if (!Array.isArray(scenarios)) scenarios = scenarios.scenarios;
    const seed = feature === "026" ? "createDemoState" : "seed";
    const reduce = feature === "026" ? "reduceDemoState" : "reduce";
    results.push({
      feature,
      ...compareStateModels({
        original: { seed: original[seed], reduce: original[reduce] },
        candidate: { seed: candidate[seed], reduce: candidate[reduce] },
        scenarios: scenarios.map((scenario) => scenario.id),
        events: eventsFor(feature),
      }),
    });
  }
  const report = {
    reference: reference.id,
    method:
      "Bounded pure-model correspondence; does not prove controller, browser or application API behavior",
    results,
  };
  writeJSON(path.join(artifacts, "model-correspondence.json"), report);
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href
) {
  const report = await verifyModelCorrespondence();
  console.log(
    JSON.stringify(
      report.results.map(({ mismatches, ...result }) => ({
        ...result,
        mismatches: mismatches.length,
      })),
    ),
  );
  if (report.results.some((result) => result.mismatches.length))
    process.exitCode = 1;
}
