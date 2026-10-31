import { useEffect, useRef } from "react";
export type Timing = "hold" | "auto";
export type OperationState =
  | { phase: "idle" }
  | { phase: "pending"; id: number }
  | { phase: "unknown"; id: number }
  | { phase: "success" | "failure"; id: number };
/** Presentation dismissal never owns or cancels the dispatched operation. */
export function useOperation(
  pending: boolean,
  timing: Timing,
  resolve: () => void,
  timeout: () => void,
) {
  const callbacks = useRef({ resolve, timeout });
  callbacks.current = { resolve, timeout };
  useEffect(() => {
    if (!pending || timing === "hold") return;
    const finish = setTimeout(() => callbacks.current.resolve(), 800);
    const fallback = setTimeout(() => callbacks.current.timeout(), 8000);
    return () => {
      clearTimeout(finish);
      clearTimeout(fallback);
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
