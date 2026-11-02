import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  root,
  artifacts,
  digest,
  readJSON,
  writeJSON,
  ownedArtifact,
} from "./runtime.mjs";
export const originalDirectory = path.join(artifacts, "original/source");
const descriptor = path.join(root, "reference/original.json");
const features = ["025", "026", "027", "028", "034"];
export function prepareOriginal(source) {
  const base = fs.realpathSync(path.resolve(source));
  const entries = [],
    visited = new Set();
  const visit = (relative) => {
    const absolute = path.resolve(base, relative);
    if (!absolute.startsWith(base + path.sep))
      throw Error("Original dependency escapes selected root");
    const file = path.relative(base, absolute).replaceAll("\\", "/");
    if (visited.has(file)) return;
    visited.add(file);
    if (fs.realpathSync(absolute) !== absolute)
      throw Error("Original symlink dependency requires review");
    const bytes = fs.readFileSync(absolute),
      text = bytes.toString("utf8");
    entries.push({ file, sha256: digest(bytes), bytes: bytes.length });
    const dependency = (specifier) => {
      if (
        !specifier ||
        specifier.startsWith("#") ||
        /^(?:data:|https?:|\/\/)/.test(specifier)
      )
        return;
      if (!specifier.startsWith("."))
        throw Error(`Unresolved original runtime dependency: ${specifier}`);
      visit(path.join(path.dirname(file), specifier.split(/[?#]/)[0]));
    };
    if (/\.(mjs|js)$/.test(file)) {
      const tree = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      const walk = (node) => {
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          dependency(node.moduleSpecifier.text);
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          if (!ts.isStringLiteral(node.arguments[0]))
            throw Error(`Unknown dynamic original import in ${file}`);
          dependency(node.arguments[0].text);
        }
        ts.forEachChild(node, walk);
      };
      walk(tree);
    }
    if (file.endsWith(".css"))
      for (const match of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g))
        dependency(match[1]);
    if (file.endsWith(".html"))
      for (const tag of text.matchAll(/<(?:script|link|img)\b[^>]*>/g))
        for (const match of tag[0].matchAll(/(?:src|href)=["']([^"']+)["']/g))
          dependency(match[1]);
  };
  for (const id of features) {
    visit(`US-${id}/demo/screen.html`);
    visit(`US-${id}/model/scenarios.json`);
  }
  visit("theme/theme.json");
  for (const asset of ["logo-light", "logo-dark", "birds-light", "birds-dark"])
    visit(`theme/assets/${asset}.svg`);
  const unique = [...new Map(entries.map((e) => [e.file, e])).values()].sort(
    (a, b) => a.file.localeCompare(b.file),
  );
  const scenarios = features.flatMap((id) =>
    readJSON(path.join(root, `src/features/us${id}/scenarios.json`)).map(
      (s) => ({
        feature: id,
        legacy: s.id,
        story: `us${id}--${s.id[0].toLowerCase()}-${s.id.slice(1)}`,
        source: `US-${id}/demo/screen.html`,
        fixture: "standard",
        setup:
          id === "025"
            ? "cuways-demo-settings"
            : id === "026"
              ? "us026-demo:configure/select-scenario"
              : "cu-story-v1:configure",
        timing: "controlled browser clock; hold writes and reads",
      }),
    ),
  );
  if (scenarios.length !== 94)
    throw Error("Original mapping requires all 94 identities");
  const identity = digest(JSON.stringify(unique));
  const staging = ownedArtifact(path.join(artifacts, "original/prepared"));
  const previous = ownedArtifact(path.join(artifacts, "original/previous"));
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true });
  for (const entry of unique) {
    const target = path.join(staging, entry.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(base, entry.file), target);
  }
  const value = {
    schemaVersion: 1,
    selectedAt: "2026-11-01",
    designRevision: "1.9.1",
    environment:
      "Dockerfile.visual pinned Playwright Linux renderer; identical contexts for both implementations",
    id: identity,
    classification: "selected-original; human overrides apply",
    files: unique,
    scenarios,
    overrides: [
      {
        owner: "product-navigation",
        responsiveSource: "US-025/demo/screen.css",
        labels: ["Overview", "Services", "My Jobs", "Invitations", "Profile"],
        reason:
          "Latest explicit human decision supersedes feature shortcuts in legacy shared story runtime. Corrected navigation inherits US025 original enlarged-reading chrome rules; original files remain unchanged.",
      },
    ],
  };
  if (fs.existsSync(previous)) fs.rmSync(previous, { recursive: true });
  ownedArtifact(originalDirectory);
  if (fs.existsSync(originalDirectory))
    fs.renameSync(originalDirectory, previous);
  try {
    fs.renameSync(staging, originalDirectory);
    writeJSON(descriptor, value);
  } catch (error) {
    if (fs.existsSync(originalDirectory))
      fs.renameSync(originalDirectory, staging);
    if (fs.existsSync(previous)) fs.renameSync(previous, originalDirectory);
    throw error;
  }
  return {
    id: identity,
    files: unique.length,
    bytes: unique.reduce((n, e) => n + e.bytes, 0),
    scenarios: 94,
  };
}
export function verifyOriginal() {
  const value = readJSON(descriptor);
  for (const entry of value.files) {
    const file = path.resolve(originalDirectory, entry.file);
    if (
      !file.startsWith(originalDirectory + path.sep) ||
      !fs.existsSync(file) ||
      digest(fs.readFileSync(file)) !== entry.sha256
    )
      throw Error(`Original reference missing or changed: ${entry.file}`);
  }
  if (digest(JSON.stringify(value.files)) !== value.id)
    throw Error("Original reference descriptor identity mismatch");
  return value;
}
