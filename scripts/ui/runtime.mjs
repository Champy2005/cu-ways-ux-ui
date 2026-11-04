import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
export const root = process.cwd();
export const artifacts = path.join(root, ".artifacts/ui");
// One current complete receipt and one current diagnostic receipt. Focused
// investigation must not replace the full-scope evidence or its image files.
export const fidelityArtifacts = (diagnostic = false) =>
  path.join(artifacts, "fidelity", diagnostic ? "diagnostic" : "");
export let current = process.env.UI_RUN_DIR ?? path.join(artifacts, "current");
export function ownedArtifact(file) {
  const resolved = path.resolve(file);
  const base = path.resolve(artifacts) + path.sep;
  if (!resolved.startsWith(base))
    throw Error("Artifact path escapes the owned directory");
  if (fs.existsSync(resolved) && !fs.realpathSync(resolved).startsWith(base))
    throw Error("Artifact symlink escapes ownership");
  return resolved;
}
export function stageRun() {
  const destination = ownedArtifact(path.join(artifacts, "current"));
  const staging = ownedArtifact(path.join(artifacts, "staging"));
  const previous = ownedArtifact(path.join(artifacts, "previous"));
  if (!fs.existsSync(destination) && fs.existsSync(previous))
    fs.renameSync(previous, destination);
  if (fs.existsSync(staging)) {
    const failed = ownedArtifact(path.join(artifacts, "failed"));
    if (fs.existsSync(failed))
      fs.rmSync(failed, { recursive: true, force: true });
    fs.renameSync(staging, failed);
  }
  fs.mkdirSync(staging, { recursive: true });
  current = staging;
  process.env.UI_RUN_DIR = staging;
  let committed = false;
  return {
    commit() {
      if (!fs.existsSync(path.join(staging, "report.json")))
        throw Error("Incomplete staged report");
      if (fs.existsSync(previous))
        fs.rmSync(previous, { recursive: true, force: true });
      if (fs.existsSync(destination)) fs.renameSync(destination, previous);
      try {
        fs.renameSync(staging, destination);
      } catch (error) {
        if (fs.existsSync(previous)) fs.renameSync(previous, destination);
        throw error;
      }
      if (fs.existsSync(previous))
        fs.rmSync(previous, { recursive: true, force: true });
      committed = true;
      current = destination;
      delete process.env.UI_RUN_DIR;
    },
    finish() {
      if (!committed && fs.existsSync(staging)) {
        const failed = ownedArtifact(path.join(artifacts, "failed"));
        if (fs.existsSync(failed))
          fs.rmSync(failed, { recursive: true, force: true });
        fs.renameSync(staging, failed);
      }
      current = destination;
      delete process.env.UI_RUN_DIR;
    },
  };
}
export const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export function targetMatcher(target) {
  const prefs = readJSON(path.join(root, "preferences/current.json"));
  const component = prefs.components.find(
    (c) =>
      c.id.toLowerCase() === target.toLowerCase() ||
      c.aliases.some((a) => a.toLowerCase() === target.toLowerCase()),
  );
  return (record) =>
    target === "all" ||
    record.story === target ||
    record.story.startsWith(target + "--") ||
    (!!component && record.observations?.some((n) => n.ui === component.id));
}
export function writeJSON(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
}
export const digest = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");
export function files(dir = root) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) =>
        ![
          "node_modules",
          ".git",
          ".artifacts",
          "storybook-static",
          "coverage",
          "test-results",
          "playwright-report",
        ].includes(e.name),
    )
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );
}
export function fingerprint() {
  return digest(
    files()
      .filter((p) => !p.endsWith(path.join("baseline", "reference.json")))
      .sort()
      .map(
        (p) =>
          path.relative(root, p).replaceAll("\\", "/") +
          "\0" +
          digest(fs.readFileSync(p)),
      )
      .join("\n"),
  );
}
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: options.timeout ?? 300000,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (options.log) {
    fs.mkdirSync(path.dirname(options.log), { recursive: true });
    fs.writeFileSync(
      options.log,
      (result.stdout ?? "") +
        (result.stderr ?? "") +
        (result.error?.message ?? ""),
    );
  }
  return result;
}
export function packageCommand(name, args, options = {}) {
  const pkg = readJSON(path.join(root, "node_modules", name, "package.json"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : Object.values(pkg.bin)[0];
  return run(
    process.execPath,
    [path.join(root, "node_modules", name, bin), ...args],
    options,
  );
}
export function git(args) {
  const r = run("git", args, { timeout: 10000 });
  return r.status === 0 ? r.stdout.trim() : null;
}
export function acquire() {
  fs.mkdirSync(artifacts, { recursive: true });
  const lock = path.join(artifacts, "run.lock");
  try {
    fs.writeFileSync(
      lock,
      JSON.stringify({ pid: process.pid, started: Date.now() }),
      { flag: "wx" },
    );
  } catch {
    const owner = readJSON(lock);
    try {
      process.kill(owner.pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") {
        fs.unlinkSync(lock);
        return acquire();
      }
    }
    throw Error(`A UI run owns current artifacts (PID ${owner.pid}).`);
  }
  return () => {
    if (fs.existsSync(lock) && readJSON(lock).pid === process.pid)
      fs.unlinkSync(lock);
  };
}
export function changedFiles() {
  const base = git(["merge-base", "HEAD", "main"]);
  if (!base)
    return { files: [], full: true, reason: "bootstrap: no merge base" };
  const diff = git(["diff", "--name-only", base]) ?? "";
  const untracked = git(["ls-files", "--others", "--exclude-standard"]) ?? "";
  return {
    files: [...new Set((diff + "\n" + untracked).split("\n").filter(Boolean))],
    full: false,
    reason: "git merge base with main",
  };
}
export function sourceHygiene() {
  const tracked = (git(["ls-files", "-z"]) ?? "").split("\0").filter(Boolean);
  const generated = tracked.filter((p) =>
    /(^|\/)(node_modules|storybook-static|\.artifacts|playwright-report|test-results|coverage|evidence)(\/|$)|\.zip$/.test(
      p,
    ),
  );
  if (generated.length)
    throw Error(
      "Generated evidence/build output is tracked: " + generated.join(", "),
    );
  return {
    files: tracked.length,
    bytes: tracked.reduce(
      (sum, p) => sum + (fs.existsSync(p) ? fs.statSync(p).size : 0),
      0,
    ),
  };
}
export function sourceScope(changes, declaration = {}) {
  const targetFeature =
    declaration.target?.match(/(?:us)?(025|026|027|028|034)/)?.[1] ??
    (declaration.target === "proof-delivery" ? "026" : null);
  const forbidden =
    declaration.intent === "local"
      ? changes.filter(
          (p) =>
            p.startsWith("src/design-system/") ||
            p.startsWith("src/features/shared/") ||
            p.startsWith(".storybook/") ||
            Boolean(
              targetFeature &&
              p.match(/^src\/features\/us(\d{3})\//)?.[1] &&
              !p.startsWith(`src/features/us${targetFeature}/`),
            ),
        )
      : [];
  const global = changes.some((p) =>
    /^(package\.json|pnpm-lock|\.storybook\/|src\/design-system\/tokens\/|src\/design-system\/base|src\/design-system\/compositions\/layout|src\/features\/shared\/operations|vitest|playwright|scripts\/|tests\/)/.test(
      p,
    ),
  );
  const ids = [
    ...new Set(
      changes
        .map((p) => p.match(/^src\/features\/us(\d{3})\//)?.[1])
        .filter(Boolean),
    ),
  ];
  const shared = changes.some(
    (p) =>
      p.startsWith("src/design-system/") ||
      p.startsWith("src/features/shared/"),
  );
  return {
    full: global || shared || !ids.length,
    features: ids,
    violations: forbidden,
    reason: global
      ? "global source changed"
      : shared
        ? "shared reach needs conservative full verification"
        : ids.length
          ? "feature ownership"
          : "uncertain or clean scope; full drift audit",
  };
}
