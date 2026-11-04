import fs from "node:fs";
import path from "node:path";
import { zipSync, unzipSync } from "fflate";
import { digest, ownedArtifact } from "./runtime.mjs";

const limit = 8 * 1024 * 1024;
function entriesFor(reference) {
  if (digest(JSON.stringify(reference.files)) !== reference.id)
    throw Error("Original descriptor identity mismatch");
  const entries = new Map();
  for (const entry of reference.files) {
    if (
      !/^[A-Za-z0-9_./-]+\.(?:html|mjs|js|css|json|svg|woff2?)$/.test(
        entry.file,
      ) ||
      entry.file.startsWith("/") ||
      entry.file.split("/").includes("..") ||
      entries.has(entry.file) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      entry.bytes > limit
    )
      throw Error("Invalid original packet entry");
    entries.set(entry.file, entry);
  }
  return entries;
}
export function decodeOriginalPacket(bytes, reference) {
  if (bytes.length > limit) throw Error("Original archive exceeds size limit");
  if (reference.archive && digest(bytes) !== reference.archive.sha256)
    throw Error("Original archive checksum mismatch");
  const expected = entriesFor(reference),
    seen = new Set();
  let total = 0;
  const files = unzipSync(bytes, {
    filter(file) {
      const entry = expected.get(file.name);
      total += file.originalSize;
      if (
        !entry ||
        seen.has(file.name) ||
        file.originalSize !== entry.bytes ||
        total > limit
      )
        throw Error(
          "Unexpected, duplicate or oversized original archive entry",
        );
      seen.add(file.name);
      return true;
    },
  });
  if (seen.size !== expected.size)
    throw Error("Original archive is incomplete");
  for (const [name, bytes] of Object.entries(files))
    if (digest(bytes) !== expected.get(name).sha256)
      throw Error(`Original file checksum mismatch: ${name}`);
  return files;
}
export function exportOriginalPacket(reference, source, destination) {
  const entries = entriesFor(reference),
    files = {};
  for (const entry of entries.values()) {
    const bytes = fs.readFileSync(path.join(source, entry.file));
    if (digest(bytes) !== entry.sha256)
      throw Error(`Original file changed: ${entry.file}`);
    // ZIP stores local calendar fields, not an instant. Keep those fields fixed
    // across native Windows and the canonical Linux renderer.
    files[entry.file] = [bytes, { mtime: new Date(2000, 0, 1) }];
  }
  const archive = zipSync(files, { level: 6 });
  decodeOriginalPacket(archive, { ...reference, archive: undefined });
  const target = ownedArtifact(destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, archive);
  return {
    reference: reference.id,
    file: target,
    sha256: digest(archive),
    bytes: archive.length,
    files: entries.size,
  };
}
export function restoreOriginalPacket(reference, archive, destination) {
  if (fs.statSync(archive).size > limit)
    throw Error("Original archive exceeds size limit");
  const files = decodeOriginalPacket(fs.readFileSync(archive), reference);
  const target = ownedArtifact(destination),
    staging = ownedArtifact(target + "-restoring"),
    previous = ownedArtifact(target + "-previous");
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) {
    const file = path.join(staging, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
  if (fs.existsSync(previous)) fs.rmSync(previous, { recursive: true });
  if (fs.existsSync(target)) fs.renameSync(target, previous);
  try {
    fs.renameSync(staging, target);
  } catch (error) {
    if (fs.existsSync(previous)) fs.renameSync(previous, target);
    throw error;
  }
  return { reference: reference.id, files: Object.keys(files).length };
}
