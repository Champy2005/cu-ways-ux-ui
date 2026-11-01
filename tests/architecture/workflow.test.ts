import { test, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import fs from "node:fs";
import path from "node:path";
import {
  componentPreviews,
  context as uiContext,
} from "../../scripts/ui/context.mjs";
test("generic status lookup surfaces distinct semantic owners instead of guessing", () => {
  const packet = uiContext("status");
  expect(packet.ambiguous).toBe(true);
  expect(packet.components.map((c: { id: string }) => c.id)).toEqual(
    expect.arrayContaining([
      "LifecycleBadge",
      "RecoveryPanel",
      "StatusHeading",
    ]),
  );
});
test("native preview identities outrank unrelated exports in one source module", () => {
  const entries = [
    {
      id: "action--default",
      componentPath: "src/design-system/components/primitives.tsx",
    },
    { id: "system--contracts" },
  ];
  expect(
    componentPreviews(
      entries,
      { stories: [{ id: "system--contracts" }] },
      "src/design-system/components/primitives.tsx",
    ),
  ).toEqual([entries[1]]);
  expect(
    componentPreviews(
      entries,
      null,
      "src/design-system/components/primitives.tsx",
    ),
  ).toEqual([entries[1]]);
});
import {
  sourceScope,
  digest,
  ownedArtifact,
} from "../../scripts/ui/runtime.mjs";
import {
  unpack,
  verifyReference,
  validatePromotion,
  canonicalEnvironment,
  approvalFor,
} from "../../scripts/ui/baseline.mjs";
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
test("local target rejects another feature even when its own change is valid", () => {
  expect(
    sourceScope(
      [
        "src/features/us026/ProofDelivery.tsx",
        "src/features/us034/Reviews.tsx",
      ],
      { intent: "local", target: "us026" },
    ).violations,
  ).toEqual(["src/features/us034/Reviews.tsx"]);
});
test("scope inputs cannot read arbitrary files", () => {
  expect(() => ownedArtifact("package.json")).toThrow("escapes");
  expect(ownedArtifact(".artifacts/ui/scope.json")).toContain("scope.json");
});
test("protected geometry movement and added controls are detected", () => {
  const item = {
    key: "LifecycleBadge/Accepted/0",
    values: { color: "blue" },
    bounds: { x: 10, y: 10, width: 100, height: 25 },
  };
  expect(
    compareProtected([item], [{ ...item, bounds: { ...item.bounds, x: 30 } }], {
      geometry: true,
    }),
  ).toHaveLength(1);
  expect(compareProtected([], [item])).toHaveLength(1);
});
test("review does not grant promotion to exploratory or incomplete evidence", () => {
  const report = {
    environment: canonicalEnvironment,
    coverage: { canonical: true, fullRequested: false },
    gates: [
      "format",
      "types",
      "eslint",
      "styles",
      "unit",
      "stories",
      "build",
    ].map((name) => ({ name, passed: true })),
    failures: [],
  };
  const rendered = { failures: [], records: [] };
  expect(() =>
    validatePromotion(
      { ...report, environment: "native-win32-x64" },
      rendered,
      { classification: "missing" },
      { provisional: true },
    ),
  ).toThrow("canonical");
  expect(() =>
    validatePromotion(
      { ...report, coverage: { ...report.coverage, diagnosticSubset: true } },
      rendered,
      { classification: "missing" },
      { provisional: true },
    ),
  ).toThrow("Diagnostic");
  expect(() =>
    validatePromotion(
      report,
      rendered,
      { classification: "missing" },
      { provisional: true },
    ),
  ).toThrow("94");
  expect(() =>
    validatePromotion(report, rendered, { classification: "missing" }),
  ).toThrow("provisional");
});
test("local feature edits select their complete scenarios", () => {
  const s = sourceScope(["src/features/us026/ProofDelivery.tsx"], {
    intent: "local",
  });
  expect(s.features).toEqual(["026"]);
  expect(s.full).toBe(false);
});
test("unknown or clean source scope expands rather than silently passing", () =>
  expect(sourceScope([]).full).toBe(true));
test("scoped geometry approval preserves pending palette", () => {
  const approval = approvalFor(
    {
      approval: {
        source: "user",
        scope: "us026",
        authorization: "Explicit geometry review",
        geometry: "accepted",
        palette: "pending",
      },
    },
    "us026",
    false,
  );
  expect(approval.palette).toBe("pending");
  expect(() => approvalFor({}, "all", false)).toThrow("receipt");
  expect(() =>
    approvalFor({ approval: { ...approval, scope: "us034" } }, "us026", false),
  ).toThrow("receipt");
});
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
