import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const hash = (value) => createHash("sha256").update(value).digest("hex");
export const captureKey = (parameters) => hash(JSON.stringify(parameters));
const safeName = (name) =>
  typeof name === "string" && /^[a-z0-9][a-z0-9.-]*\.png$/i.test(name);

/** Only verified original captures are reused. Candidates always render anew. */
export function restoreCapture(directory, key, output) {
  try {
    const folder = path.join(directory, key);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(folder, "capture.json")),
    );
    if (
      manifest.key !== key ||
      !Array.isArray(manifest.files) ||
      !manifest.files.length
    )
      return null;
    for (const file of manifest.files) {
      if (!safeName(file.name)) return null;
      if (hash(fs.readFileSync(path.join(folder, file.name))) !== file.sha256)
        return null;
    }
    if (!manifest.files.some((file) => file.name === manifest.state?.image))
      return null;
    for (const file of manifest.files)
      fs.copyFileSync(
        path.join(folder, file.name),
        path.join(output, file.name),
      );
    return manifest.state;
  } catch {
    return null;
  }
}

export function storeCapture(directory, key, output, names, state) {
  if (
    state.failures.length ||
    !names.length ||
    names.some((name) => !safeName(name))
  )
    return;
  const folder = path.join(directory, key);
  fs.mkdirSync(folder, { recursive: true });
  const files = names.map((name) => {
    const data = fs.readFileSync(path.join(output, name));
    fs.writeFileSync(path.join(folder, name), data);
    return { name, sha256: hash(data) };
  });
  // Manifest last: an interrupted write cannot validate as a complete entry.
  fs.writeFileSync(
    path.join(folder, "capture.json"),
    JSON.stringify({ key, files, state }),
  );
}
