import fs from "node:fs";
import { expect, test } from "vitest";
import {
  fidelityTimeout,
  runOwnedRenderer,
} from "../../scripts/ui/renderer.mjs";

test("full fidelity receives a bounded budget sized for paired captures", () => {
  expect(fidelityTimeout(376)).toBeGreaterThan(900000);
  expect(fidelityTimeout(1316)).toBeGreaterThan(fidelityTimeout(376));
  expect(fidelityTimeout(10000)).toBeLessThanOrEqual(21600000);
  for (const value of [0, -1, 1.5, NaN, 10001])
    expect(() => fidelityTimeout(value)).toThrow();
});

for (const ownership of ["owned", "foreign"] as const)
  test(`timeout cleanup ${ownership === "owned" ? "stops its renderer" : "refuses an unrelated container"}`, () => {
    let owner = "",
      cidFile = "";
    const stopped: string[] = [];
    const base = { pid: 0, output: [], stdout: "", stderr: "", signal: null };
    const timedOut = {
      ...base,
      status: null,
      error: Object.assign(new Error("deadline"), { code: "ETIMEDOUT" }),
    };
    const execute = (_command: string, args: string[]) => {
      if (args[0] === "run") {
        cidFile = args[args.indexOf("--cidfile") + 1];
        owner = args[args.indexOf("--label") + 1].split("=")[1];
        fs.writeFileSync(cidFile, "a".repeat(64));
        return timedOut;
      }
      if (args[0] === "inspect")
        return {
          ...base,
          status: 0,
          stdout: JSON.stringify({
            "cuways.ui.run": ownership === "owned" ? owner : "another-run",
          }),
        };
      stopped.push(args.at(-1)!);
      return { ...base, status: 0 };
    };
    if (ownership === "owned")
      expect(
        runOwnedRenderer(["--rm", "fixture-image"], { timeout: 10 }, execute),
      ).toBe(timedOut);
    else
      expect(() =>
        runOwnedRenderer(["--rm", "fixture-image"], { timeout: 10 }, execute),
      ).toThrow("ownership mismatch");
    expect(stopped).toEqual(ownership === "owned" ? ["a".repeat(64)] : []);
    expect(fs.existsSync(cidFile)).toBe(false);
  });
