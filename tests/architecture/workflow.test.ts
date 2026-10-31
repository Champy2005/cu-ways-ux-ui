import { test, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import fs from "node:fs";
import path from "node:path";
import { sourceScope, digest } from "../../scripts/ui/runtime.mjs";
import { unpack, verifyReference } from "../../scripts/ui/baseline.mjs";
import {
  compareEquivalent,
  compareProtected,
} from "../../scripts/ui/visual-contracts.mjs";
test("local global-token edits fail scope and still broaden verification", () => {
  const s = sourceScope(["src/design-system/tokens/theme.css"], {
    intent: "local",
  });
  expect(s.full).toBe(true);
  expect(s.violations).toHaveLength(1);
});
test("local changes cannot repaint shared compositions", () =>
  expect(
    sourceScope(["src/features/shared/features.module.css"], {
      intent: "local",
    }).violations,
  ).toHaveLength(1));
test("local feature edits select their complete scenarios", () => {
  const s = sourceScope(["src/features/us026/ProofDelivery.tsx"], {
    intent: "local",
  });
  expect(s.features).toEqual(["026"]);
  expect(s.full).toBe(false);
});
test("unknown or clean source scope expands rather than silently passing", () =>
  expect(sourceScope([]).full).toBe(true));
test("cross-instance style invariants detect pre-existing drift without a baseline", () => {
  expect(compareEquivalent({ color: "blue" }, { color: "pink" })).toEqual([
    "color",
  ]);
  expect(compareEquivalent({ color: "blue" }, { color: "blue" })).toEqual([]);
});
test("protected sibling paint and disappearance are detected", () => {
  const original = [{ key: "badge", values: { color: "blue" } }];
  expect(
    compareProtected(original, [{ key: "badge", values: { color: "pink" } }]),
  ).toHaveLength(1);
  expect(compareProtected(original, [])).toHaveLength(1);
});
test("wrong environment and reference identity are inconclusive", () => {
  expect(
    verifyReference(
      { classification: "provisional", environment: "linux", id: "a" },
      { environment: "linux", id: "a" },
      "windows",
    ),
  ).toBe("environment-mismatch");
  expect(
    verifyReference(
      { environment: "linux", id: "a" },
      { environment: "linux", id: "b" },
      "linux",
    ),
  ).toBe("identity-mismatch");
});
test("baseline extraction rejects unsafe paths and wrong checksums", () => {
  const dir = path.resolve(".artifacts/ui/fixtures");
  expect(() =>
    unpack(
      zipSync({
        "../escape.png": strToU8("x"),
        "manifest.json": strToU8("{}"),
      }),
      dir,
    ),
  ).toThrow("Unsafe");
  expect(() =>
    unpack(
      zipSync({
        "images/a.png": strToU8("x"),
        "manifest.json": strToU8(
          JSON.stringify({
            images: [{ file: "images/a.png", sha256: "wrong" }],
          }),
        ),
      }),
      dir,
    ),
  ).toThrow("checksum");
});
test("verified reference extracts into owned cache", () => {
  const bytes = strToU8("fixture image");
  fs.mkdirSync(path.resolve(".artifacts/ui/current/fixtures"), {
    recursive: true,
  });
  const dir = fs.mkdtempSync(
    path.resolve(".artifacts/ui/current/fixtures/reference-"),
  );
  const manifest = {
    id: "fixture",
    images: [{ file: "images/a.png", sha256: digest(bytes) }],
  };
  expect(
    unpack(
      zipSync({
        "images/a.png": bytes,
        "manifest.json": strToU8(JSON.stringify(manifest)),
      }),
      dir,
    ).id,
  ).toBe("fixture");
  expect(fs.readFileSync(path.join(dir, "images/a.png"))).toEqual(
    Buffer.from(bytes),
  );
});
