import type { OperationAdapter } from "../features/shared/operationAdapter";
export function createManualOperationAdapter() {
  const pending = new Set<{ resolve: () => void; timeout: () => void }>();
  const settle = (kind: "resolve" | "timeout") => {
    const results = [...pending];
    pending.clear();
    for (const result of results) result[kind]();
  };
  return {
    subscribe(result) {
      pending.add(result);
      return () => {
        pending.delete(result);
      };
    },
    resolve: () => settle("resolve"),
    timeout: () => settle("timeout"),
  } satisfies OperationAdapter & { resolve: () => void; timeout: () => void };
}
const stories = new Map<
  string,
  ReturnType<typeof createManualOperationAdapter>
>();
/** One fixture adapter per Storybook story; no test control appears in product UI. */
export function storyOperations(id: string) {
  let adapter = stories.get(id);
  if (!adapter) {
    adapter = createManualOperationAdapter();
    stories.set(id, adapter);
  }
  return adapter;
}
