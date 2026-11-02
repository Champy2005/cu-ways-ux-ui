import { useReducer } from "react";
import type { JobStatus } from "../../design-system/components/primitives";
import * as completion from "../us027/model.mjs";
import * as cancellation from "../us028/model.mjs";
import { useOperation, type Timing } from "./operations";
import { TaskPageView } from "./TaskPageView";
export { TaskPageView } from "./TaskPageView";
export type TaskState = {
  status: JobStatus;
  proof?: number;
  paid: boolean;
  offer?: boolean;
  access: boolean;
  modal: "blocked" | "confirm" | null;
  pending: "read" | "complete" | "cancel" | null;
  message: string | null;
  requests?: number;
  offers?: number;
  long?: boolean;
};
export type TaskEvent = {
  type:
    | "dismiss"
    | "reopen"
    | "timeout"
    | "check"
    | "complete"
    | "cancel-job"
    | "confirm"
    | "resolve";
  outcome?: string;
  read?: string;
};
/** Scenario adapter; reusable view receives domain state and ordinary handlers. */
export function TaskPage({
  feature,
  scenario = "A01",
  timing = "hold",
  outcome = "success",
  fixture = "standard",
}: {
  feature: "027" | "028";
  scenario?: string;
  timing?: Timing;
  outcome?: string;
  fixture?: "standard" | "long";
}) {
  const model = feature === "028" ? cancellation : completion;
  const [state, send] = useReducer(
    (state: TaskState, event: TaskEvent) =>
      model.reduce(state, event) as TaskState,
    scenario,
    (id) => model.seed(id) as TaskState,
  );
  const resolve = () => send({ type: "resolve", outcome, read: "success" });
  useOperation(state.pending, timing, resolve, () => send({ type: "timeout" }));
  return (
    <TaskPageView
      feature={feature}
      state={{ ...state, long: fixture === "long" }}
      send={send}
    />
  );
}
