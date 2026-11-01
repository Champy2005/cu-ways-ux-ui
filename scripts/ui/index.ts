import fs from "node:fs";
import path from "node:path";
import { context } from "./context.mjs";
import { nativeCall, nativeConsumers } from "./native.mjs";
import { check } from "./check.mjs";
import { promote } from "./baseline.mjs";
import {
  current,
  readJSON,
  fingerprint,
  packageCommand,
  targetMatcher,
} from "./runtime.mjs";

const [command, ...args] = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf("--" + name);
  return at >= 0 ? args[at + 1] : undefined;
};
try {
  if (command === "dev") {
    if (args.includes("--mcp")) process.env.UI_MCP = "1";
    process.exitCode =
      packageCommand(
        "storybook",
        [
          "dev",
          "--host",
          "127.0.0.1",
          "--port",
          flag("port") ?? "4191",
          "--exact-port",
          "--no-open",
          "--disable-telemetry",
        ],
        { stdio: "inherit", timeout: 2147483647 },
      ).status ?? 1;
  } else if (command === "context") {
    const result = context(args.find((a) => !a.startsWith("--")) ?? "");
    if (args.includes("--live")) {
      for (const component of result.components) {
        try {
          Object.assign(component, {
            nativeConsumers: await nativeConsumers(
              component.source,
              args.includes("--expanded"),
            ),
          });
        } catch (error) {
          Object.assign(component, {
            nativeConsumers: { status: "unavailable", reason: String(error) },
          });
        }
      }
    }
    console.log(JSON.stringify(result, null, args.includes("--json") ? 0 : 2));
  } else if (command === "check") {
    process.exitCode = await check({
      target: flag("target"),
      intent: flag("intent"),
      scope: flag("scope"),
      full: args.includes("--full"),
      native: args.includes("--native"),
      smoke: args.includes("--smoke"),
    });
  } else if (command === "review") {
    const report = readJSON(path.join(current, "report.json"));
    if (report.sourceFingerprint !== fingerprint())
      throw Error("Review is stale; rerun checking.");
    const rendered: {
      records: {
        story: string;
        key: string;
        images: { level: string; comparison: string; file: string }[];
        observations?: { ui: string }[];
      }[];
    } = readJSON(path.join(current, "rendered.json"));
    const target = args[0] ?? "all";
    const records = rendered.records.filter(targetMatcher(target));
    if (!records.length)
      throw Error("No captured target found; run context and check first");
    const escape = (v: string) =>
      v.replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]!,
      );
    const board =
      '<html><meta charset="utf-8"><title>Current UI evidence</title><style>body{font:14px system-ui;background:#eee;padding:20px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0;background:white;padding:10px}img{width:100%}</style><h1>Captured evidence — inspection required</h1><p>Review does not approve a baseline. Report ' +
      escape(report.id) +
      "</p><main>" +
      records
        .flatMap((r) =>
          r.images.map(
            (i) =>
              `<figure><figcaption>${escape(r.key + " " + i.level + " " + i.comparison)}</figcaption><a href="${escape(i.file)}"><img loading="lazy" src="${escape(i.file)}"></a></figure>`,
          ),
        )
        .join("") +
      "</main></html>";
    fs.writeFileSync(path.join(current, "review.html"), board);
    let nativeReview;
    if (args.includes("--native")) {
      try {
        nativeReview = await nativeCall("review-create", {
          title: "Current UX UI review",
          description: `Report ${report.id}. Provisional design evidence; palette acceptance remains pending.`,
          collections: [
            {
              title: "Selected scenarios",
              rationale:
                "Inspect the component and its page context in both themes.",
              storyIds: [...new Set(records.map((r) => r.story))],
            },
          ],
          changedFiles: report.scope.changedFiles,
        });
      } catch (error) {
        nativeReview = {
          status: "unavailable",
          reason: String(error),
          fallback: "Local evidence board",
        };
      }
    }
    console.log(
      JSON.stringify({
        reportId: report.id,
        board: path.join(current, "review.html"),
        referenceClass: report.referenceClass,
        previews: records
          .slice(0, 8)
          .map((r) => `http://127.0.0.1:4191/?path=/story/${r.story}`),
        approval: "unchanged",
        nativeReview,
      }),
    );
  } else if (command === "approve-baseline")
    console.log(
      JSON.stringify(
        promote({
          target: args[0] ?? "all",
          reportId: flag("report"),
          authorization: flag("authorization"),
          inspectionFile: flag("inspection"),
          provisional: args.includes("--provisional"),
        }),
        null,
        2,
      ),
    );
  else {
    console.log(
      'pnpm ui dev | context "query" | check [--target name] [--intent local|shared|global] [--full] | review target | approve-baseline target --report id --inspection file --authorization reason',
    );
    process.exitCode = command && command !== "--help" ? 3 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 3;
}
