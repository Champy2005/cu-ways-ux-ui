import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { root, readJSON, files } from "./runtime.mjs";
export function componentPreviews(entries, native, source) {
  const declared = new Set((native?.stories ?? []).map((story) => story.id));
  const exact = entries.filter((entry) => declared.has(entry.id));
  if (exact.length) return exact;
  // A shared module is not evidence that every export appears in each story.
  return entries.filter((entry) =>
    source.startsWith("src/features/")
      ? entry.componentPath?.endsWith(source.replace(/^src\//, ""))
      : entry.id === "system--contracts",
  );
}
function definition(source, name) {
  const text = fs.readFileSync(path.join(root, source), "utf8");
  const tree = ts.createSourceFile(
    source,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found;
  tree.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name)
      found = {
        source,
        line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        symbol: name,
        signature: node.parameters.map((p) => p.getText(tree)).join(", "),
      };
  });
  return found ?? { source, symbol: name };
}
export function context(query) {
  const prefs = readJSON(path.join(root, "preferences/current.json"));
  const term = query.trim().toLowerCase();
  const indexPath = path.join(root, "storybook-static/index.json");
  const entries = fs.existsSync(indexPath)
    ? Object.values(readJSON(indexPath).entries)
    : [];
  const manifestPath = path.join(
    root,
    "storybook-static/manifests/components.json",
  );
  const manifest = fs.existsSync(manifestPath) ? readJSON(manifestPath) : null;
  const scenarios = files(path.join(root, "src/features"))
    .filter((p) => p.endsWith("scenarios.json"))
    .flatMap((p) =>
      readJSON(p).map((s) => ({ ...s, feature: p.match(/us(\d+)/)[1] })),
    );
  const scenarioMatches = scenarios.filter(
    (s) =>
      term === `us${s.feature}--${s.id[0].toLowerCase()}-${s.id.slice(1)}` ||
      term === `us${s.feature}:${s.id.toLowerCase()}` ||
      term === s.id.toLowerCase(),
  );
  const exact = prefs.components.filter(
    (c) =>
      c.id.toLowerCase() === term ||
      c.aliases.some((a) => a.toLowerCase() === term),
  );
  const candidates = exact.length
    ? exact
    : prefs.components.filter((c) =>
        (c.id + " " + c.aliases.join(" ")).toLowerCase().includes(term),
      );
  const ambiguous = candidates.length + scenarioMatches.length > 1;
  return {
    query,
    ambiguous,
    global: ambiguous ? [] : prefs.global,
    humanAcceptance: prefs.humanAcceptance,
    scenarios: scenarioMatches.map((s) => ({
      feature: s.feature,
      legacyId: s.id,
      expected: s.expected,
      url: `http://127.0.0.1:4191/?path=/story/us${s.feature}--${s.id[0].toLowerCase()}-${s.id.slice(1)}`,
    })),
    components: candidates.map((c) => {
      if (ambiguous) return { id: c.id, source: c.source, aliases: c.aliases };
      const symbol =
        {
          ProofWorkspace: "ProofDelivery",
          CompletionRequirements: "TaskPageView",
          CancellationEffects: "TaskPageView",
          ContractSummary: "TaskPageView",
          DeliveryEvidence: "TaskPageView",
          ReviewHistory: "ReviewsView",
          Select: "SelectControl",
          RecoveryPanel: "Feedback",
          ApplicationFrame: "AppFrame",
          ReviewCard: "Reviews",
        }[c.id] ?? c.id;
      const native = Object.values(manifest?.components ?? {}).find(
        (m) => m.name === symbol,
      );
      const props =
        native?.reactDocgenTypescript?.props ??
        native?.reactDocgen?.props ??
        {};
      return {
        ...c,
        definition: definition(c.source, symbol),
        api: Object.fromEntries(
          Object.entries(props).map(([name, p]) => [
            name,
            {
              required: p.required,
              type: p.type ?? p.tsType,
              description: p.description,
              default: p.defaultValue,
            },
          ]),
        ),
        docs:
          native?.description ??
          native?.reactDocgenTypescript?.description ??
          "",
        exceptions: prefs.exceptions.filter((e) => e.target === c.id),
        previews: componentPreviews(entries, native, c.source)
          .slice(0, 3)
          .map((e) => ({
            id: e.id,
            url: `http://127.0.0.1:4191/?path=/story/${e.id}`,
          })),
      };
    }),
    capabilities: {
      manifest: !!manifest,
      index: entries.length,
      liveConsumerLookup:
        "Optional native MCP stories-find-by-component; unavailable live reach expands checks.",
    },
    unknowns: [
      "Static source definitions and native manifest props are authoritative for lookup; static preview candidates are not an exhaustive consumer proof.",
    ],
  };
}
