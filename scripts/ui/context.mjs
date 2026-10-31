import fs from "node:fs";
import path from "node:path";
import { root, readJSON } from "./runtime.mjs";
export function context(query) {
  const prefs = readJSON(path.join(root, "preferences/current.json"));
  const term = query.toLowerCase();
  const matches = prefs.components.filter(
    (c) =>
      c.id.toLowerCase() === term ||
      c.aliases.some((a) => a.toLowerCase() === term),
  );
  const candidates = matches.length
    ? matches
    : prefs.components.filter((c) =>
        (c.id + " " + c.aliases.join(" ")).toLowerCase().includes(term),
      );
  const indexPath = path.join(root, "storybook-static/index.json");
  const entries = fs.existsSync(indexPath)
    ? Object.values(readJSON(indexPath).entries)
    : [];
  const manifestPath = path.join(
    root,
    "storybook-static/manifests/components.json",
  );
  const manifest = fs.existsSync(manifestPath) ? readJSON(manifestPath) : null;
  return {
    query,
    ambiguous: candidates.length > 1,
    global: prefs.global,
    humanAcceptance: prefs.humanAcceptance,
    components: candidates.map((c) => ({
      ...c,
      exception: prefs.exceptions.filter((e) => e.target === c.id),
      previews: entries
        .filter(
          (e) =>
            e.componentPath?.endsWith(c.source.replace(/^src\//, "")) ||
            e.id === "system--contracts",
        )
        .slice(0, 3)
        .map((e) => ({
          id: e.id,
          url: `http://127.0.0.1:4190/?path=/story/${e.id}`,
        })),
    })),
    capabilities: {
      manifest: !!manifest,
      index: entries.length,
      nativeConsumers:
        "Available through optional Storybook MCP live reverse graph; static lookup is not exhaustive.",
    },
    manifestLocation: manifest
      ? "storybook-static/manifests/components.json"
      : null,
    unknowns: candidates.length
      ? [
          "Static component consumers are potential scope. Missing live tracking expands checks.",
        ]
      : ["No exact component match; inspect aliases or a stable scenario ID."],
  };
}
