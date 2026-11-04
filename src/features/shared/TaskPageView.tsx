import { WorkbenchFrame } from "./WorkbenchFrame";
import {
  Action,
  ActionLink,
  ContentDialog,
  EmptyState,
  Feedback,
  Icon,
  Loading,
} from "../../design-system/components/primitives";
import {
  Card,
  Columns,
  ConfirmationActions,
  Metadata,
  OperationProgress,
  ProofRecord,
  Requirement,
  StatusHeading,
} from "../../design-system/compositions/layout";
import * as cancellation from "../us028/model.mjs";
import type { TaskState, TaskEvent } from "./TaskPage";
import s from "./task.module.css";

export function TaskPageView({
  feature,
  state,
  send,
}: {
  feature: "027" | "028";
  state: TaskState;
  send: (event: TaskEvent) => void;
}) {
  const cancel = feature === "028",
    unknown = !!state.message?.startsWith("unknown");
  const readFailed = state.message === "read-failed";
  const reason = !cancel
    ? null
    : state.status === "Completed"
      ? "Completed jobs cannot be cancelled. Their payment and review history is preserved."
      : state.paid
        ? "Payment is Paid. This job can no longer be cancelled."
        : state.status === "Cancelled"
          ? "This job has already been cancelled."
          : state.status === "Unverified"
            ? "The current job state could not be verified. Refresh before taking action."
            : null;
  const requirements = [
    {
      label:
        state.status === "Completed"
          ? "Completed status"
          : "In Progress status",
      met: ["In Progress", "Completed"].includes(state.status),
    },
    {
      label: "Proof of delivery",
      met: !!state.proof,
      description: state.proof ? "" : "No delivery proof saved.",
    },
    {
      label: "Accepted offer",
      met: !!state.offer,
      description: state.offer
        ? ""
        : "The selected offer must belong to this job.",
    },
    {
      label: "Payment is Paid",
      met: state.paid,
      description: state.paid ? "" : "Payment is not Paid.",
    },
  ];
  const feedback = unknown
    ? {
        title:
          state.message === "unknown-read-failed"
            ? "Status check failed"
            : cancel
              ? "Cancellation outcome unknown"
              : "Completion outcome unknown",
        body:
          state.message === "unknown-read-failed"
            ? `The ${cancel ? "cancellation" : "completion"} result is still unknown.`
            : "Check the job before trying again.",
        tone: "warning" as const,
        action: "Check job status",
      }
    : state.message === "read-failed"
      ? {
          title: "Job could not load",
          body: cancel
            ? "Try again to check the contract."
            : "Try again to check the requirements.",
          tone: "error" as const,
          action: "Try again",
        }
      : state.message === "failed"
        ? {
            title: cancel ? "Job was not cancelled" : "Completion was rejected",
            tone: "error" as const,
            action: cancel ? "Refresh job" : "Refresh requirements",
          }
        : state.message === "success"
          ? {
              title: cancel ? "Job cancelled" : "Job completed",
              body: cancel
                ? "Requests closed; pending offers rejected."
                : undefined,
              tone: "success" as const,
            }
          : state.message === "unchanged"
            ? {
                title: cancel ? "Job is unchanged" : "Job is still In Progress",
                body: cancel
                  ? "The read confirmed that cancellation did not occur. You can choose to cancel again."
                  : "The check confirmed no completion. You can make a new explicit attempt.",
                tone: "info" as const,
              }
            : state.message === "requirements-changed"
              ? {
                  title: "Delivery proof is missing",
                  body: "Add proof before completing this job.",
                  tone: "warning" as const,
                }
              : null;
  const reasons = [
    state.status !== "In Progress" && "The job must be In Progress.",
    !state.proof && "Add delivery proof. Brief files do not qualify.",
    !state.offer && "The selected offer must be Accepted.",
    !state.paid && "Payment must be Paid.",
  ].filter(Boolean) as string[];
  return (
    <WorkbenchFrame
      title={cancel ? "Cancel job" : "Job completion"}
      feature={feature}
    >
      {!state.access ? (
        <Card title="Job unavailable">
          <p className={s.consequence}>
            You no longer have access to this job.
          </p>
        </Card>
      ) : state.pending === "read" ? (
        <Loading
          kind={cancel ? "cancellation" : "completion"}
          title="Loading job information"
          onStop={() => send({ type: "timeout" })}
        />
      ) : (
        <>
          {state.pending && !state.modal && (
            <OperationProgress
              title={cancel ? "Cancelling job" : "Completing job"}
              onReopen={() => send({ type: "reopen" })}
            />
          )}
          {feedback && (
            <div className={s.notice}>
              <Feedback
                title={feedback.title}
                tone={feedback.tone}
                action={
                  feedback.action ? (
                    <Action onClick={() => send({ type: "check" })}>
                      <Icon name="refresh" />
                      {feedback.action}
                    </Action>
                  ) : undefined
                }
              >
                {feedback.body}
              </Feedback>
            </div>
          )}
          {reason && !readFailed && state.message !== "success" && (
            <div className={s.notice}>
              <Feedback
                title="Cancellation unavailable"
                tone="warning"
                action={
                  state.status === "Unverified" ? (
                    <Action onClick={() => send({ type: "check" })}>
                      <Icon name="refresh" />
                      Refresh job
                    </Action>
                  ) : undefined
                }
              >
                {reason}
              </Feedback>
            </div>
          )}
          {!readFailed && (
            <>
              <Card boundary="EntitySummary">
                <StatusHeading
                  title={
                    state.long
                      ? "Campus dining, accessibility and student wellbeing — แบบสำรวจประสบการณ์นิสิตและพื้นที่การเรียนรู้"
                      : "Campus dining survey"
                  }
                  context="Job #41"
                  status={state.status}
                />
                <Metadata
                  items={[
                    {
                      label: "Creator",
                      value: state.long
                        ? "Narin Chulalongkorn · Student Experience Research Group"
                        : "Narin C.",
                    },
                    { label: "Marketer", value: "Mali S." },
                    { label: "Agreed price", value: "THB 2,500.00" },
                  ]}
                />
              </Card>
              <Columns variant={cancel && reason ? "single" : "task"}>
                {(!cancel || !reason) && (
                  <Card
                    boundary={
                      cancel ? "CancellationEffects" : "CompletionRequirements"
                    }
                    title={
                      cancel
                        ? "Cancellation effects"
                        : "Completion requirements"
                    }
                  >
                    {cancel ? (
                      <>
                        <ul className={s.effects}>
                          <li className={s.effect}>
                            Active requests will close.
                          </li>
                          <li className={s.effect}>
                            Pending offers will be rejected.
                          </li>
                        </ul>
                        <p className={s.retained}>
                          The accepted offer and history are retained.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={s.summary}>
                          {requirements.filter((row) => row.met).length} of 4
                          requirements met
                        </p>
                        <ul className={s.criteria}>
                          {requirements.map((row) => (
                            <Requirement key={row.label} {...row} />
                          ))}
                        </ul>
                      </>
                    )}
                    {(!cancel ||
                      (cancellation.eligible(state) && !unknown)) && (
                      <div className={cancel ? s.cancelActions : s.actions}>
                        {(cancel
                          ? cancellation.eligible(state)
                          : state.status === "In Progress") &&
                          !unknown && (
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
                        {!cancel && !state.proof && (
                          <ActionLink
                            href="?id=us026--a-01&viewMode=story"
                            role="entry"
                          >
                            View proof of delivery
                          </ActionLink>
                        )}
                      </div>
                    )}
                  </Card>
                )}
                <Card
                  boundary={cancel ? "ContractSummary" : "DeliveryEvidence"}
                  title={cancel ? "Contract summary" : "Delivery evidence"}
                >
                  {cancel ? (
                    <Metadata
                      variant="rows"
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
                    <ProofRecord
                      url="https://example.com/proof/campus-dining"
                      timestamp="Saved 28 Oct 2026, 14:20 ICT"
                    />
                  ) : (
                    <EmptyState title="No proof added yet" variant="delivery">
                      Briefs and other attachments cannot replace delivery
                      proof.
                    </EmptyState>
                  )}
                </Card>
              </Columns>
            </>
          )}
          <ContentDialog
            busy={!!state.pending}
            initialFocusId={!state.pending ? `task-${feature}-safe` : undefined}
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
            <p className={s.dialogReference}>Job #41</p>
            {state.modal === "blocked" ? (
              <ul className={s.reasons}>
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : state.pending ? (
              <p className={s.progress} role="status">
                <Icon name="spinner" />
                Submitting…
              </p>
            ) : (
              <>
                <p className={s.consequence}>
                  {cancel ? "This cannot be undone." : "This closes the job."}
                </p>
                {cancel && (
                  <Metadata
                    variant="dialog"
                    items={[
                      { label: "Current status", value: state.status },
                      { label: "Requests to close", value: state.requests },
                      { label: "Offers to reject", value: state.offers },
                    ]}
                  />
                )}
              </>
            )}
            {!state.pending &&
              (state.modal === "blocked" ? (
                <ConfirmationActions
                  variant="recovery"
                  safe={
                    <Action
                      id={`task-${feature}-safe`}
                      role="quiet"
                      onClick={() => send({ type: "dismiss" })}
                    >
                      Got it
                    </Action>
                  }
                  commit={
                    !state.proof ? (
                      <ActionLink
                        href="?id=us026--a-01&viewMode=story"
                        role="supporting"
                      >
                        Add delivery proof
                      </ActionLink>
                    ) : null
                  }
                />
              ) : (
                <ConfirmationActions
                  safe={
                    <Action
                      id={`task-${feature}-safe`}
                      role="safe"
                      onClick={() => send({ type: "dismiss" })}
                    >
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
              ))}
          </ContentDialog>
        </>
      )}
    </WorkbenchFrame>
  );
}
