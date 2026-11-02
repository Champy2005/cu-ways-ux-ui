import { useEffect, useRef, useContext } from "react";
import { OperationAdapterContext } from "./operationAdapter";
export type Timing = "hold" | "auto" | "stalled";
export type OperationState =
  | { phase: "idle" }
  | { phase: "pending"; id: number }
  | { phase: "unknown"; id: number }
  | { phase: "success" | "failure"; id: number };
/** Presentation dismissal never owns or cancels the dispatched operation. */
export function useOperation(
  pending: boolean | string | null,
  timing: Timing,
  resolve: () => void,
  timeout: () => void,
) {
  const callbacks = useRef({ resolve, timeout });
  const adapter = useContext(OperationAdapterContext);
  const generation = useRef(0);
  callbacks.current = { resolve, timeout };
  useEffect(
    () =>
      pending && adapter
        ? adapter.subscribe({
            resolve: () => callbacks.current.resolve(),
            timeout: () => callbacks.current.timeout(),
          })
        : undefined,
    [pending, adapter],
  );
  useEffect(() => {
    if (!pending || timing === "hold") return;
    const id = ++generation.current;
    const started = Date.now();
    let settled = false;
    const settle = (kind: "resolve" | "timeout") => {
      if (generation.current !== id || settled) return;
      settled = true;
      callbacks.current[kind]();
    };
    const finish =
      timing === "auto" ? setTimeout(() => settle("resolve"), 800) : undefined;
    const fallback = setTimeout(() => settle("timeout"), 12000);
    const returned = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - started >= 12000
      )
        settle("timeout");
    };
    document.addEventListener("visibilitychange", returned);
    return () => {
      generation.current++;
      clearTimeout(finish);
      clearTimeout(fallback);
      document.removeEventListener("visibilitychange", returned);
    };
  }, [pending, timing]);
}
export const money = (value: number | string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "THB" }).format(
    Number(value),
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
