import path from "node:path";
import { root } from "./runtime.mjs";
/** Optional adapter for the pinned official addon. Core checks never depend on it. */
export async function nativeCall(name, args = {}) {
  const endpoint = new URL(
    process.env.UI_STORYBOOK_URL ?? "http://127.0.0.1:4191",
  );
  if (endpoint.hostname !== "127.0.0.1" || endpoint.protocol !== "http:")
    throw Error("Native integration must stay on loopback");
  const identity = await fetch(new URL("/__ui/identity", endpoint), {
    signal: AbortSignal.timeout(2000),
  }).then((r) => r.json());
  if (path.resolve(identity.root) !== path.resolve(root))
    throw Error("Native server belongs to another workspace");
  const index = await fetch(new URL("/index.json", endpoint), {
    signal: AbortSignal.timeout(2000),
  }).then((r) => r.json());
  if (!index.entries?.["us026--a-01"])
    throw Error("Unexpected workbench index");
  const result = await fetch(new URL("/mcp", endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw Error(`Native addon unavailable (${result.status})`);
  const body = await result.text();
  const data =
    body
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => JSON.parse(l.slice(6)))
      .find((m) => m.id === 1) ?? JSON.parse(body);
  if (data.error || data.result?.isError)
    throw Error(
      "Native addon returned an error; conservative fallback required",
    );
  return data.result;
}
export async function nativeConsumers(source, expanded = false) {
  const result = await nativeCall("stories-find-by-component", {
    componentPaths: [path.resolve(root, source)],
    maxDistance: 20,
  });
  if (!result.structuredContent?.results)
    return {
      status: "inconclusive",
      reason: "Native addon returned an unfamiliar result schema",
    };
  return {
    status: "available",
    components: result.structuredContent.results.map((r) => ({
      source: r.componentPath,
      count: r.matches.length,
      clipped: r.clipped ?? null,
      pathNotFound: r.pathNotFound ?? false,
      stories: r.matches
        .slice(0, expanded ? undefined : 8)
        .map((m) => ({ id: m.storyId, distance: m.distance })),
    })),
  };
}
