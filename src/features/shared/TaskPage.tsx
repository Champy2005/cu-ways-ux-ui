import { useReducer } from "react";
import {
  Action,
  ActionLink,
  AttachmentTag,
  ContentDialog,
  EmptyState,
  Feedback,
  Icon,
  Loading,
  ProofLink,
  type JobStatus,
} from "../../design-system/components/primitives";
import {
  AppFrame,
  Card,
  Columns,
  ConfirmationActions,
  Metadata,
  OperationProgress,
  StatusHeading,
} from "../../design-system/compositions/layout";
import * as completion from "../us027/model.mjs";
import * as cancellation from "../us028/model.mjs";
import { useOperation, type Timing } from "./operations";
import s from "./features.module.css";

type TaskState = {
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
};
type TaskEvent = {
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
/** Typed adapters preserve the proven reducers while replacing only presentation. */
export function TaskPage({
  feature,
  scenario = "A01",
  timing = "hold",
  outcome = "success",
}: {
  feature: "027" | "028";
  scenario?: string;
  timing?: Timing;
  outcome?: string;
}) {
  const cancel = feature === "028";
  const model = cancel ? cancellation : completion;
  const [state, send] = useReducer(
    (state: TaskState, event: TaskEvent) =>
      model.reduce(state, event) as TaskState,
    scenario,
    (id) => model.seed(id) as TaskState,
  );
  const resolve = () => send({ type: "resolve", outcome, read: "success" });
  useOperation(!!state.pending, timing, resolve, () =>
    send({ type: "timeout" }),
  );
  const requirements = cancel
    ? []
    : [
        { ok: state.status === "In Progress", label: "Job is In Progress" },
        { ok: !!state.proof, label: "Proof of delivery" },
        { ok: !!state.offer, label: "Accepted offer" },
        { ok: state.paid, label: "Payment is Paid" },
      ];
  const eligible = cancel
    ? cancellation.eligible(state)
    : completion.blockers(state).length === 0;
  const uncertain = !!state.message?.startsWith("unknown");
  const readFailed = ["failed", "read-failed", "unknown-read-failed"].includes(
    state.message ?? "",
  );
  const title = cancel ? "Job cancellation" : "Job completion";
  const messages: Record<string, string> = {
    success: cancel ? "Job cancelled" : "Job completed",
    unknown: cancel
      ? "Cancellation outcome unknown"
      : "Completion outcome unknown",
    "unknown-read-failed": "Outcome could not be checked",
    failed: cancel ? "Cancellation failed" : "Completion failed",
    "read-failed": "Job could not load",
    paid: "Payment is now Paid",
    completed: "This job is completed",
    unchanged: "Job status confirmed",
    "requirements-changed": "Requirements have changed",
  };
  return (
    <AppFrame title={title} feature={feature}>
      {!state.access ? (
        <Feedback title="Job unavailable">
          Your access has changed. Private details have been removed.
        </Feedback>
      ) : (
        <>
          {state.pending === "read" ? (
            <Loading
              title={
                cancel ? "Loading contract" : "Checking completion requirements"
              }
              onStop={() => send({ type: "timeout" })}
            />
          ) : (
            <>
              {state.message && (
                <Feedback
                  title={messages[state.message] ?? "Job status changed"}
                  tone={
                    state.message === "success"
                      ? "success"
                      : uncertain
                        ? "warning"
                        : readFailed
                          ? "error"
                          : "info"
                  }
                  action={
                    uncertain || readFailed ? (
                      <Action
                        role="utility"
                        onClick={() => send({ type: "check" })}
                      >
                        Check job status
                      </Action>
                    ) : undefined
                  }
                >
                  {uncertain
                    ? "Check the current status before another attempt."
                    : state.message === "success" && cancel
                      ? "Requests closed. Pending offers rejected."
                      : undefined}
                </Feedback>
              )}
              {!["read-failed"].includes(state.message ?? "") && (
                <>
                  <Card>
                    <StatusHeading
                      title="Campus dining survey"
                      context="Job #41"
                      status={state.status}
                    />
                    <Metadata
                      items={[
                        { label: "Creator", value: "Narin C." },
                        { label: "Marketer", value: "Mali S." },
                        { label: "Agreed price", value: "THB 2,500.00" },
                      ]}
                    />
                  </Card>
                  <Columns>
                    <Card
                      title={
                        cancel
                          ? "Cancellation effects"
                          : "Completion requirements"
                      }
                    >
                      {cancel ? (
                        <ul className={s.blockers}>
                          <li>Close active job requests.</li>
                          <li>Reject remaining Pending offers.</li>
                          <li>
                            Retain the accepted offer and previous records.
                          </li>
                        </ul>
                      ) : (
                        <>
                          <p className={s.muted}>
                            {requirements.filter((r) => r.ok).length} of 4
                            requirements met
                          </p>
                          <ul className={s.criteria}>
                            {requirements.map((r) => (
                              <li key={r.label} data-missing={!r.ok}>
                                <Icon name={r.ok ? "check" : "warning"} />
                                <strong>{r.label}</strong>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <div className={s.actions}>
                        {(!cancel || eligible) &&
                          !uncertain &&
                          state.status !== "Completed" &&
                          state.status !== "Cancelled" && (
                            <Action
                              role={cancel ? "destructive" : "primary"}
                              disabled={!!state.pending}
                              onClick={() =>
                                send({
                                  type: cancel ? "cancel-job" : "complete",
                                })
                              }
                            >
                              {cancel ? "Cancel job" : "Run completion check"}
                            </Action>
                          )}
                        {!cancel && (
                          <ActionLink
                            href="?id=us026--a-06&viewMode=story"
                            role="utility"
                          >
                            View proof of delivery
                          </ActionLink>
                        )}
                      </div>
                    </Card>
                    <Card
                      title={cancel ? "Contract summary" : "Delivery evidence"}
                    >
                      {cancel ? (
                        <Metadata
                          items={[
                            {
                              label: "Payment",
                              value: state.paid ? "Paid" : "Not paid",
                            },
                            { label: "Active requests", value: state.requests },
                            { label: "Pending offers", value: state.offers },
                          ]}
                        />
                      ) : state.proof ? (
                        <div className={s.proofRecord} data-ui="ProofRecord">
                          <AttachmentTag />
                          <ProofLink url="https://example.com/proof/campus-dining" />
                          <p className={s.muted}>
                            Saved 28 Oct 2026, 14:20 ICT
                          </p>
                        </div>
                      ) : (
                        <EmptyState title="No proof added yet">
                          Briefs and other attachments cannot replace delivery
                          proof.
                        </EmptyState>
                      )}
                    </Card>
                  </Columns>
                </>
              )}
            </>
          )}
          {state.pending && state.pending !== "read" && !state.modal && (
            <OperationProgress
              onReopen={() => send({ type: "reopen" })}
              onCheck={resolve}
            />
          )}
          <ContentDialog
            open={!!state.modal}
            title={
              state.modal === "blocked"
                ? "Requirements incomplete"
                : state.pending
                  ? cancel
                    ? "Cancelling job"
                    : "Completing job"
                  : cancel
                    ? "Cancel job"
                    : "Complete job"
            }
            onClose={() => send({ type: "dismiss" })}
          >
            <div className={s.dialogCopy}>
              <p className={s.muted}>Job #41 · Campus dining survey</p>
              {state.modal === "blocked" ? (
                <ul className={s.blockers}>
                  {completion.blockers(state).map((text) => (
                    <li key={String(text)}>{text}</li>
                  ))}
                </ul>
              ) : !state.pending ? (
                <p>
                  {cancel
                    ? "Cancellation closes active requests and rejects Pending offers."
                    : "Completion finalizes this job’s execution status."}
                </p>
              ) : (
                <p role="status">Submitting…</p>
              )}
            </div>
            {state.modal === "blocked" ? (
              <ConfirmationActions
                safe={
                  <Action
                    role="quiet"
                    onClick={() => send({ type: "dismiss" })}
                  >
                    Got it
                  </Action>
                }
                commit={
                  <ActionLink
                    href="?id=us026--a-01&viewMode=story"
                    role="supporting"
                  >
                    Add delivery proof
                  </ActionLink>
                }
              />
            ) : state.pending ? (
              <ConfirmationActions
                safe={null}
                commit={
                  <Action role="safe" onClick={resolve}>
                    Check status
                  </Action>
                }
              />
            ) : (
              <ConfirmationActions
                safe={
                  <Action role="safe" onClick={() => send({ type: "dismiss" })}>
                    {cancel ? "Keep job" : "Keep In Progress"}
                  </Action>
                }
                commit={
                  <Action
                    role={cancel ? "destructive" : "primary"}
                    onClick={() => send({ type: "confirm" })}
                  >
                    {cancel ? "Confirm cancellation" : "Confirm completion"}
                  </Action>
                }
              />
            )}
          </ContentDialog>
        </>
      )}
    </AppFrame>
  );
}
