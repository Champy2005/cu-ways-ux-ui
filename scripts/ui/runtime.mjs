import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
export const root = process.cwd();
export const artifacts = path.join(root, ".artifacts/ui");
export const current = path.join(artifacts, "current");
export const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
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
export function sourceScope(changes, declaration = {}) {
  const forbidden =
    declaration.intent === "local"
      ? changes.filter(
          (p) =>
            p.startsWith("src/design-system/") ||
            p.startsWith("src/features/shared/") ||
            p.startsWith(".storybook/"),
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
