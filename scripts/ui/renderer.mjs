import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { artifacts, ownedArtifact, run } from "./runtime.mjs";

/** Both implementations and their close/context captures count toward the budget. */
export function fidelityTimeout(records) {
  if (!Number.isSafeInteger(records) || records < 1 || records > 10000)
    throw Error("Invalid fidelity record count");
  return Math.min(6 * 60 * 60 * 1000, 120000 + records * 6000);
}

/** A timed-out Docker client must not leave its renderer writing current evidence. */
export function runOwnedRenderer(args, options, execute = run) {
  const owner = randomUUID();
  const cidFile = ownedArtifact(path.join(artifacts, `renderer-${owner}.cid`));
  fs.mkdirSync(artifacts, { recursive: true });
  try {
    return execute(
      "docker",
      [
        "run",
        "--cidfile",
        cidFile,
        "--label",
        `cuways.ui.run=${owner}`,
        ...args,
      ],
      options,
    );
  } finally {
    releaseRenderer(cidFile, owner, execute);
  }
}

function releaseRenderer(cidFile, owner, execute) {
  if (fs.existsSync(cidFile)) {
    const id = fs.readFileSync(cidFile, "utf8").trim();
    try {
      if (!/^[a-f0-9]{64}$/.test(id))
        throw Error("Invalid renderer container identity");
      const inspected = execute(
        "docker",
        ["inspect", "--format", "{{json .Config.Labels}}", id],
        { timeout: 10000 },
      );
      if (inspected.status === 0) {
        const labels = JSON.parse(inspected.stdout);
        if (labels["cuways.ui.run"] !== owner)
          throw Error(
            "Renderer ownership mismatch; refusing to stop container",
          );
        const stopped = execute("docker", ["stop", "--time", "5", id], {
          timeout: 15000,
        });
        if (stopped.status !== 0)
          throw Error("Owned renderer could not be stopped");
      } else if (!/no such (object|container)/i.test(inspected.stderr ?? ""))
        throw Error(
          "Cannot verify renderer cleanup; inspect Docker connectivity",
        );
    } finally {
      fs.unlinkSync(cidFile);
    }
  }
}
