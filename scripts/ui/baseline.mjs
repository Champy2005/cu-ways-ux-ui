import fs from "node:fs";
import path from "node:path";
import { unzipSync, zipSync, strToU8 } from "fflate";
import {
  root,
  artifacts,
  current,
  readJSON,
  writeJSON,
  digest,
  fingerprint,
  run,
  acquire,
  ownedArtifact,
  targetMatcher,
} from "./runtime.mjs";
export const renderConfiguration = {
  playwright: "1.64.1",
  image:
    "sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea",
  platform: "linux/amd64",
  locale: "en-GB",
  timezone: "Asia/Bangkok",
  deviceScaleFactor: 1,
  animations: "disabled",
  caret: "hide",
  maxDiffPixelRatio: 0.0001,
  fonts: fs
    .readdirSync(path.join(root, "public/assets"))
    .filter((n) => n.endsWith(".woff2"))
    .sort()
    .map((name) => ({
      name,
      sha256: digest(fs.readFileSync(path.join(root, "public/assets", name))),
    })),
};
export const canonicalEnvironment =
  "pw-linux-" + digest(JSON.stringify(renderConfiguration)).slice(0, 20);
export function approvalFor(inspection, target, provisional) {
  if (provisional)
    return {
      geometry: "pending",
      palette: "pending",
      source: "agent-reviewed provisional",
    };
  const approval = inspection.approval;
  if (
    approval?.source !== "user" ||
    approval.scope !== target ||
    !["accepted", "pending"].includes(approval.geometry) ||
    !["accepted", "pending"].includes(approval.palette) ||
    !approval.authorization
  )
    throw Error(
      "Human approval receipt must name scope, authorization, geometry and palette separately",
    );
  return approval;
}
export function validatePromotion(
  report,
  rendered,
  parent,
  { provisional = false } = {},
) {
  if (
    report.environment !== canonicalEnvironment ||
    !report.coverage?.canonical
  )
    throw Error("Only the pinned canonical environment may publish references");
  if (report.coverage?.diagnosticSubset)
    throw Error("Diagnostic subsets cannot publish references");
  for (const name of [
    "format",
    "types",
    "eslint",
    "styles",
    "unit",
    "stories",
    "build",
  ])
    if (!report.gates.some((g) => g.name === name && g.passed))
      throw Error(`Required gate ${name} is incomplete`);
  if (report.failures.length || rendered.failures.length)
    throw Error("Failed checks cannot publish references");
  if (
    rendered.records.some(
      (r) =>
        r.errors?.length ||
        r.invariants?.length ||
        ["component", "context", "page"].some(
          (level) => !r.images.some((image) => image.level === level),
        ),
    )
  )
    throw Error("Incomplete or failed capture records");
  if (parent.classification === "missing") {
    if (!provisional)
      throw Error("Initial reference must be explicitly provisional");
    const legacy = new Set(
      rendered.records.map((r) => r.story).filter((s) => s.startsWith("us")),
    );
    if (!report.coverage.fullRequested || legacy.size !== 94)
      throw Error("Bootstrap requires full 94-scenario coverage");
    for (const id of legacy)
      for (const theme of ["light", "dark"])
        for (const width of [390, 1440])
          if (
            !rendered.records.some(
              (r) =>
                r.story === id &&
                r.theme === theme &&
                r.viewport.width === width,
            )
          )
            throw Error("Bootstrap core matrix is incomplete");
  } else {
    if (provisional)
      throw Error("Provisional publication is reserved for initial bootstrap");
    if (
      report.reference !== "valid" ||
      parent.environment !== report.environment
    )
      throw Error("Active reference is unavailable or incompatible");
    if (provisional && parent.classification !== "provisional")
      throw Error("Provisional promotion cannot downgrade approved references");
  }
  return true;
}

export function unpack(bytes, directory) {
  const names = new Set();
  let total = 0,
    count = 0;
  const entries = unzipSync(bytes, {
    filter(entry) {
      const name = entry.name.replaceAll("\\", "/");
      const key = name.toLowerCase();
      if (
        name.startsWith("/") ||
        name.includes(":") ||
        name.split("/").includes("..") ||
        names.has(key) ||
        (!name.endsWith(".png") && name !== "manifest.json")
      )
        throw Error("Unsafe or duplicate reference entry");
      names.add(key);
      total += entry.originalSize;
      if (
        ++count > 5000 ||
        entry.originalSize > 32 * 1024 * 1024 ||
        total > 1024 * 1024 * 1024
      )
        throw Error("Reference archive exceeds limits");
      return true;
    },
  });
  if (!entries["manifest.json"]) throw Error("Reference manifest missing");
  const manifest = JSON.parse(
    new TextDecoder().decode(entries["manifest.json"]),
  );
  for (const image of manifest.images) {
    const bytes = entries[image.file];
    if (!bytes || digest(bytes) !== image.sha256)
      throw Error("Reference image checksum mismatch");
  }
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, bytes] of Object.entries(entries)) {
    const target = path.resolve(directory, name);
    if (!target.startsWith(path.resolve(directory) + path.sep))
      throw Error("Reference escaped owned directory");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  return manifest;
}
export function verifyReference(descriptor, manifest, environment) {
  if (descriptor.classification === "missing") return "missing";
  if (
    descriptor.environment !== environment ||
    manifest.environment !== environment
  )
    return "environment-mismatch";
  if (descriptor.id !== manifest.id) return "identity-mismatch";
  return "valid";
}
export function retrieve(environment) {
  const descriptor = readJSON(path.join(root, "baseline/reference.json"));
  if (descriptor.classification === "missing")
    return { status: "missing", descriptor };
  const dir = path.join(artifacts, "reference");
  const zip = path.join(artifacts, "reference.zip");
  if (
    !fs.existsSync(zip) ||
    digest(fs.readFileSync(zip)) !== descriptor.sha256
  ) {
    const download = path.join(artifacts, "download");
    fs.mkdirSync(download, { recursive: true });
    const r = run(
      "gh",
      [
        "release",
        "download",
        descriptor.tag,
        "--repo",
        descriptor.repository,
        "--pattern",
        "reference.zip",
        "--dir",
        download,
        "--clobber",
      ],
      { timeout: 120000 },
    );
    if (r.status !== 0) return { status: "unavailable", descriptor };
    const bytes = fs.readFileSync(path.join(download, "reference.zip"));
    if (digest(bytes) !== descriptor.sha256)
      return { status: "checksum-mismatch", descriptor };
    fs.writeFileSync(zip, bytes);
  }
  const manifest = unpack(fs.readFileSync(zip), dir);
  return {
    status: verifyReference(descriptor, manifest, environment),
    descriptor,
    manifest,
  };
}
function promoteOwned({
  target,
  reportId,
  authorization,
  provisional = false,
  inspectionFile,
}) {
  const report = readJSON(path.join(current, "report.json"));
  if (!reportId || report.id !== reportId)
    throw Error("Select the exact current report with --report <id>.");
  if (report.sourceFingerprint !== fingerprint())
    throw Error("Source changed since capture; rerun checking.");
  if (report.failures.length)
    throw Error("Required gates or rendered contracts failed.");
  if (!authorization)
    throw Error(
      "Explicit user authorization is required for baseline publication.",
    );
  if (!inspectionFile)
    throw Error(
      "Provide a scoped inspection receipt; capturing is not inspection.",
    );
  const inspection = readJSON(ownedArtifact(path.resolve(inspectionFile)));
  if (
    inspection.reportId !== report.id ||
    !inspection.reviewer ||
    !inspection.inspected?.length
  )
    throw Error("Inspection receipt does not match report.");
  const rendered = readJSON(path.join(current, "rendered.json"));
  if (
    report.renderedDigest !==
    digest(fs.readFileSync(path.join(current, "rendered.json")))
  )
    throw Error("Rendered evidence changed since checking");
  const entries = rendered.records.filter(targetMatcher(target));
  if (!entries.length || entries.some((r) => r.status === "failed"))
    throw Error("Target is missing or failed.");
  const required = entries.flatMap((r) => r.images.map((i) => i.file));
  if (required.some((f) => !inspection.inspected.includes(f)))
    throw Error(
      "Target images have not all been inspected in the scoped receipt.",
    );
  const acceptance = approvalFor(inspection, target, provisional);
  const entryClassification = provisional
    ? "provisional"
    : acceptance.geometry === "accepted" && acceptance.palette === "accepted"
      ? "human-approved"
      : "human-reviewed";
  const pointer = path.join(root, "baseline/reference.json");
  const parent = readJSON(pointer);
  validatePromotion(report, rendered, parent, { provisional });
  if (
    report.referenceId !== parent.id &&
    !(parent.classification === "missing" && !report.referenceId)
  )
    throw Error("Reference parent changed; rerun checking.");
  const retained =
    parent.classification !== "missing" &&
    fs.existsSync(path.join(artifacts, "reference/manifest.json"))
      ? readJSON(path.join(artifacts, "reference/manifest.json"))
      : { images: [], records: [] };
  if (
    parent.classification !== "missing" &&
    verifyReference(parent, retained, report.environment) !== "valid"
  )
    throw Error("Retained reference identity is invalid");
  const images = new Map(retained.images.map((i) => [i.file, i]));
  const files = {};
  for (const image of retained.images) {
    files[image.file] = fs.readFileSync(
      path.join(artifacts, "reference", image.file),
    );
    if (digest(files[image.file]) !== image.sha256)
      throw Error("Retained reference checksum mismatch");
  }
  for (const record of entries)
    for (const image of record.images) {
      files[image.file] = fs.readFileSync(path.join(current, image.file));
      if (digest(files[image.file]) !== image.sha256)
        throw Error("Candidate image changed after checking");
      images.set(image.file, {
        ...image,
        sourceFingerprint: report.sourceFingerprint,
        classification: entryClassification,
        acceptance,
        inspectionMethod: inspection.methods?.[image.file] ?? "individual",
      });
    }
  const id = digest(
    JSON.stringify({
      source: report.sourceFingerprint,
      parent: parent.id,
      keys: [...images.keys()].sort(),
    }),
  ).slice(0, 20);
  const tag = `visual-${id}`;
  const manifest = {
    schemaVersion: 1,
    id,
    environment: report.environment,
    renderConfiguration,
    browser: report.browser,
    classification:
      new Set([...images.values()].map((i) => i.classification)).size === 1
        ? [...images.values()][0].classification
        : "mixed",
    images: [...images.values()],
    records: [
      ...new Map([
        ...(retained.records ?? []).map((r) => [r.key, r]),
        ...entries.map((r) => [
          r.key,
          { ...r, sourceFingerprint: report.sourceFingerprint },
        ]),
      ]).values(),
    ],
    inspection: { reviewer: inspection.reviewer, authorization, provisional },
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  const bytes = zipSync(files, { level: 6 });
  const archive = path.join(artifacts, "candidate/reference.zip");
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  fs.writeFileSync(archive, bytes);
  const repo = "Champy2005/cu-ways-ux-ui";
  const create = run(
    "gh",
    [
      "release",
      "create",
      tag,
      "--repo",
      repo,
      "--draft",
      "--title",
      provisional
        ? "Provisional visual reference"
        : "Approved visual reference",
      "--notes",
      `Source ${report.sourceFingerprint}; environment ${report.environment}.`,
      archive,
    ],
    { timeout: 180000 },
  );
  if (create.status !== 0)
    throw Error("Draft reference upload failed; previous pointer unchanged.");
  const verify = path.join(artifacts, "candidate/verify");
  fs.mkdirSync(verify, { recursive: true });
  const download = run(
    "gh",
    [
      "release",
      "download",
      tag,
      "--repo",
      repo,
      "--pattern",
      "reference.zip",
      "--dir",
      verify,
      "--clobber",
    ],
    { timeout: 120000 },
  );
  if (
    download.status !== 0 ||
    digest(fs.readFileSync(path.join(verify, "reference.zip"))) !==
      digest(bytes)
  )
    throw Error(
      "Remote reference verification failed; previous pointer unchanged.",
    );
  if (JSON.stringify(readJSON(pointer)) !== JSON.stringify(parent))
    throw Error("Concurrent reference promotion; previous pointer retained.");
  if (report.sourceFingerprint !== fingerprint())
    throw Error("Source changed during publication; previous pointer retained");
  const publish = run("gh", [
    "release",
    "edit",
    tag,
    "--repo",
    repo,
    "--draft=false",
  ]);
  if (publish.status !== 0)
    throw Error("Release publication failed; previous pointer unchanged.");
  writeJSON(pointer, {
    schemaVersion: 1,
    repository: repo,
    tag,
    id,
    sha256: digest(bytes),
    environment: report.environment,
    classification: manifest.classification,
    previous: parent.id ? { tag: parent.tag, id: parent.id } : null,
    humanAcceptance: {
      palette: manifest.images.every(
        (i) => i.acceptance?.palette === "accepted",
      )
        ? "accepted"
        : "pending",
      geometry: manifest.images.every(
        (i) => i.acceptance?.geometry === "accepted",
      )
        ? "accepted"
        : "pending",
    },
  });
  return {
    id,
    tag,
    sha256: digest(bytes),
    next: "Review and commit the descriptor separately. Previous release remains available; no automatic merge or deletion.",
  };
}
export function promote(options) {
  const release = acquire();
  try {
    return promoteOwned(options);
  } finally {
    release();
  }
}
