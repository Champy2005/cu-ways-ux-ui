import { expect, test } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { digest } from "../../scripts/ui/runtime.mjs";
import { decodeOriginalPacket } from "../../scripts/ui/original-packet.mjs";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { artifacts, ownedArtifact } from "../../scripts/ui/runtime.mjs";

const text = strToU8("selected original source"),
  files = [
    {
      file: "US-026/demo/screen.html",
      bytes: text.length,
      sha256: digest(text),
    },
  ];
const reference = { files, id: digest(JSON.stringify(files)) };
test("original runtime archives require exact pinned contents and archive checksum", () => {
  const bytes = zipSync({ [files[0].file]: text });
  expect(decodeOriginalPacket(bytes, reference)[files[0].file]).toEqual(text);
  expect(() =>
    decodeOriginalPacket(bytes, { ...reference, archive: { sha256: "bad" } }),
  ).toThrow("archive checksum");
  expect(() => decodeOriginalPacket(zipSync({}), reference)).toThrow(
    "incomplete",
  );
  expect(() =>
    decodeOriginalPacket(
      zipSync({ [files[0].file]: strToU8("x".repeat(text.length)) }),
      reference,
    ),
  ).toThrow("file checksum");
});
test("runtime packet handling rejects traversal, extra scripts, oversized entries and invalid descriptors", () => {
  for (const name of ["../outside.js", "/outside.js", "unexpected.js"])
    expect(() =>
      decodeOriginalPacket(zipSync({ [name]: text }), reference),
    ).toThrow("archive entry");
  expect(() =>
    decodeOriginalPacket(
      zipSync({ [files[0].file]: new Uint8Array(9 * 1024 * 1024) }),
      reference,
    ),
  ).toThrow("archive entry");
  expect(() =>
    decodeOriginalPacket(zipSync({}), { ...reference, id: "bad" }),
  ).toThrow("descriptor identity");
});
test("packet export is byte-identical across local and canonical timezones", () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const scratch = ownedArtifact(
    fs.mkdtempSync(path.join(artifacts, "packet-test-")),
  );
  try {
    const source = path.join(scratch, "source");
    const file = path.join(source, files[0].file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    const moduleUrl = pathToFileURL(
      path.resolve("scripts/ui/original-packet.mjs"),
    ).href;
    const script = `import { exportOriginalPacket } from ${JSON.stringify(moduleUrl)}; console.log(exportOriginalPacket(JSON.parse(process.argv[3]),process.argv[1],process.argv[2]).sha256);`;
    const hashes = ["UTC", "Asia/Bangkok"].map((TZ, index) => {
      const result = spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          script,
          source,
          path.join(scratch, `${index}.zip`),
          JSON.stringify(reference),
        ],
        {
          env: { ...process.env, TZ },
          encoding: "utf8",
          windowsHide: true,
          timeout: 10000,
        },
      );
      expect(result.status, result.stderr).toBe(0);
      return result.stdout.trim();
    });
    expect(hashes[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(hashes[1]).toBe(hashes[0]);
  } finally {
    fs.rmSync(ownedArtifact(scratch), { recursive: true });
  }
});
