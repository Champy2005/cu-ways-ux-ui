import { WorkbenchFrame as AppFrame } from "../shared/WorkbenchFrame";
import { useLayoutEffect, useReducer, useRef, useState } from "react";
import {
  Action,
  ContentDialog,
  EmptyState,
  Feedback,
  Field,
  Loading,
  ProofLink,
  LifecycleBadge,
  Icon,
} from "../../design-system/components/primitives";
import {
  Card,
  OperationProgress,
  ProofRecord,
  StatusHeadingFrame,
  UnavailableState,
} from "../../design-system/compositions/layout";
import { createDemoState, reduceDemoState, canSubmitProof } from "./model.mjs";
import { date, useOperation, type Timing } from "../shared/operations";
import s from "./proof.module.css";

export type ProofOutcome =
  | "confirmed"
  | "type-rejected"
  | "unknown-saved"
  | "unknown-miss"
  | "job-completed"
  | "access-revoked";
export function ProofDelivery({
  scenario = "A01",
  timing = "hold",
  outcome = "confirmed",
  fixture = "standard",
}: {
  scenario?: string;
  timing?: Timing;
  outcome?: ProofOutcome;
  fixture?: "standard" | "long";
}) {
  const [state, send] = useReducer(reduceDemoState, scenario, (id) =>
    createDemoState(id, { fixtureId: fixture }),
  );
  const [open, setOpen] = useState(
    ["A02", "A03", "A05", "B01", "B04"].includes(scenario),
  );
  const [focusReason, setFocusReason] = useState<
    "initial" | "draft" | "result"
  >("initial");
  const [backgroundResult, setBackgroundResult] = useState<
    "success" | "warning" | null
  >(null);
  const previousView = useRef(state.view);
  useLayoutEffect(() => {
    if (previousView.current === state.view) return;
    previousView.current = state.view;
    if (open) return;
    document
      .querySelector<HTMLElement>(
        state.view === "jobs" ? "#page-heading" : '[data-ui="Page"]',
      )
      ?.focus();
  }, [state.view, open]);
  const resolve = () => {
    if (state.pending === "save") {
      const event = { type: "resolve-save", outcome };
      const next = reduceDemoState(state, event);
      send(event);
      if (state.view === "jobs")
        setBackgroundResult(
          ["A04", "A06"].includes(next.scenarioId) ? "success" : "warning",
        );
      setOpen(false);
    } else if (state.pending === "check") {
      const event = { type: "resolve-check", outcome: "available" };
      const next = reduceDemoState(state, event);
      send(event);
      if (next.scenarioId === "B04") {
        setFocusReason("result");
        setOpen(true);
      }
    } else if (state.pending === "refresh") send({ type: "resolve-status" });
    else send({ type: "resolve-list", outcome: "loaded" });
  };
  useOperation(state.pending, timing, resolve, () => {
    send({ type: "timeout" });
    setOpen(false);
  });
  const add = () => {
    setFocusReason("initial");
    if (["A04", "A06"].includes(state.scenarioId))
      send({ type: "add-another" });
    else if (state.scenarioId === "B02") send({ type: "reopen-form" });
    setOpen(true);
  };
  const feedback: Record<
    string,
    {
      title: string;
      body?: string;
      tone: "info" | "warning" | "error" | "success";
    }
  > = {
    "type-rejected": {
      title: "Proof wasn’t saved",
      body: "The attachment type was rejected.",
      tone: "error",
    },
    "save-confirmed": { title: "Proof saved", tone: "success" },
    "proof-confirmed": { title: "Proof confirmed", tone: "success" },
    "save-unknown": {
      title: "We couldn’t confirm the save",
      body: "Check the saved list before trying again.",
      tone: "warning",
    },
    "check-unavailable": {
      title: "Couldn’t check saved proof",
      body: "The result is still unknown. Keep this link and check again before trying another save.",
      tone: "error",
    },
    "confirmed-miss": {
      title: open ? "Link not saved" : "This link wasn’t saved",
      body: open ? undefined : "You can try saving it again.",
      tone: "info",
    },
    "status-changed": {
      title: "This job may have changed",
      body: "Refresh the job before adding proof.",
      tone: "warning",
    },
    "list-unavailable": {
      title: "Couldn’t load saved proof",
      body: "Try again to load your saved links.",
      tone: "error",
    },
  };
  const notice = state.feedback
    ? feedback[state.feedback]
    : state.scenarioId === "B04"
      ? feedback["confirmed-miss"]
      : state.scenarioId === "A04"
        ? feedback["save-confirmed"]
        : state.scenarioId === "B03"
          ? {
              title: "We couldn’t confirm the save",
              body: "Check the saved list before trying again.",
              tone: "warning" as const,
            }
          : null;
  return (
    <AppFrame
      title={state.view === "jobs" ? "My Jobs" : "Proof of delivery"}
      showHeading={state.view === "jobs" || !!state.job}
      headingLayout={state.view === "jobs" ? "proof-list" : undefined}
      headingStatus={state.view === "job" ? state.job?.status : undefined}
      headingDescription={
        state.view !== "jobs" && state.job ? (
          <p className={s.identity}>
            <span className={s.jobId}>Job #{state.job.id}</span>
            <span className={s.jobName}>{state.job.title}</span>
          </p>
        ) : undefined
      }
      feature="026"
      onJobsNavigate={() => {
        send({ type: "go-to-jobs" });
        if (state.view === "jobs")
          document.querySelector<HTMLElement>("#page-heading")?.focus();
      }}
      backLabel={state.view === "jobs" ? "Story library" : "Back to My Jobs"}
      onBack={() =>
        state.view === "jobs"
          ? (window.location.href = "?id=us025--l-02&viewMode=story")
          : send({ type: "go-to-jobs" })
      }
    >
      {state.job &&
        state.pending &&
        !open &&
        (state.view === "jobs" || state.listStatus !== "loading") && (
          <div className={s.progress} data-ui="ProofProgress">
            <OperationProgress
              title={
                state.pending === "save"
                  ? "Saving proof"
                  : "Loading delivery evidence"
              }
              onReopen={
                state.pending === "save"
                  ? () => {
                      if (state.view === "jobs") send({ type: "open-job" });
                      setFocusReason("draft");
                      setOpen(true);
                    }
                  : undefined
              }
              onStop={
                state.pending !== "save"
                  ? () => send({ type: "timeout" })
                  : undefined
              }
            />
          </div>
        )}
      {state.job &&
        state.view === "jobs" &&
        !state.pending &&
        backgroundResult && (
          <Feedback
            title={
              backgroundResult === "success"
                ? "Proof saved"
                : "Check the proof result"
            }
            tone={backgroundResult}
          />
        )}
      {state.view === "jobs" ? (
        <Card boundary="JobEntry">
          {state.job ? (
            <>
              <StatusHeadingFrame
                as="header"
                badge={<LifecycleBadge status={state.job.status} />}
              >
                <span className={s.jobReference}>Job #{state.job.id}</span>
              </StatusHeadingFrame>
              <h2 className={s.jobTitle}>{state.job.title}</h2>
              <div className={s.jobsActions}>
                <Action
                  role="entry"
                  size="proof-job-entry"
                  onClick={() => send({ type: "open-job" })}
                >
                  Open delivery evidence
                </Action>
              </div>
            </>
          ) : (
            <h2 className={s.jobTitle}>No job selected</h2>
          )}
        </Card>
      ) : !state.job ? (
        <UnavailableState title="Job unavailable" variant="proof">
          Your access has changed.
        </UnavailableState>
      ) : (
        <>
          {notice &&
            !open &&
            state.listStatus !== "failed" &&
            !(state.scenarioId === "B03" && state.pending === "check") && (
              <div className={s.notice}>
                <Feedback
                  variant="proof"
                  title={notice.title}
                  tone={notice.tone}
                  action={
                    state.scenarioId === "B02" ? (
                      <Action onClick={add}>Reopen proof form</Action>
                    ) : state.scenarioId === "B03" ? (
                      <Action onClick={() => send({ type: "check-saved" })}>
                        <Icon name="refresh" />
                        Check saved proof
                      </Action>
                    ) : state.scenarioId === "C02" ? (
                      <Action onClick={() => send({ type: "refresh-status" })}>
                        <Icon name="refresh" />
                        Refresh job
                      </Action>
                    ) : undefined
                  }
                >
                  {notice.body}
                </Feedback>
              </div>
            )}
          {state.listStatus === "loading" ? (
            <Loading
              kind="proof"
              title="Loading saved proof"
              onStop={() => send({ type: "timeout" })}
            />
          ) : state.listStatus === "failed" ? (
            <Feedback
              title={notice?.title ?? "Saved proof unavailable"}
              variant="proof"
              tone="error"
              action={
                <Action onClick={() => send({ type: "retry-list" })}>
                  <Icon name="refresh" />
                  Try again
                </Action>
              }
            >
              {notice?.body ?? "The list may not be empty."}
            </Feedback>
          ) : (
            <Card
              boundary="ProofWorkspace"
              title={
                <>
                  Saved proof{" "}
                  <span className={s.count}>({state.rows.length})</span>
                </>
              }
              action={
                state.job.status === "In Progress" &&
                state.scenarioId !== "C02" &&
                state.scenarioId !== "B02" &&
                state.scenarioId !== "B03" ? (
                  <Action
                    role="entry"
                    size="proof-entry"
                    disabled={!!state.pending}
                    onClick={add}
                  >
                    Add proof
                  </Action>
                ) : undefined
              }
            >
              {["B02", "B03"].includes(state.scenarioId) && (
                <div className={s.retainedDraft}>
                  <p className={s.draftLabel}>
                    {state.scenarioId === "B03"
                      ? "Unconfirmed link"
                      : "Draft link"}
                  </p>
                  <ProofLink url={state.draft} variant="proof" />
                </div>
              )}
              {state.rows.length ? (
                state.rows.map(
                  (row: { id: string; url: string; upload_at: string }) => (
                    <ProofRecord
                      variant="proof"
                      key={row.id}
                      url={row.url}
                      timestamp={`${date(row.upload_at)}, ${new Intl.DateTimeFormat(
                        "en-GB",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Bangkok",
                        },
                      ).format(new Date(row.upload_at))} ICT`}
                    />
                  ),
                )
              ) : (
                <EmptyState title="No proof added yet" variant="proof">
                  {state.scenarioId === "A01"
                    ? "Add your first delivery link."
                    : undefined}
                </EmptyState>
              )}
            </Card>
          )}
          <ContentDialog
            busy={!!state.pending}
            variant="proof-entry"
            open={open}
            title={state.pending === "save" ? "Saving proof" : "Add proof"}
            onClose={() => setOpen(false)}
            finalFocusId={
              state.pending === "save" ? "view-progress" : undefined
            }
            initialFocusId={
              focusReason === "draft"
                ? "proof-url"
                : focusReason === "result"
                  ? "proof-reconcile-result"
                  : undefined
            }
          >
            {state.scenarioId === "B04" && notice && (
              <div
                className={s.formFeedback}
                id="proof-reconcile-result"
                tabIndex={-1}
              >
                <Feedback title={notice.title} tone={notice.tone}>
                  {notice.body}
                </Feedback>
              </div>
            )}
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                send({
                  type: state.scenarioId === "B04" ? "retry-save" : "submit",
                  outcome,
                });
              }}
              noValidate
            >
              <Field
                id="proof-url"
                label="Delivery link"
                value={state.draft}
                error={state.fieldError}
                readOnly={!!state.pending}
                onChange={(value) => send({ type: "draft", value })}
              />
              <div className={s.formActions}>
                <Action
                  role="primary"
                  size="proof-save"
                  type="submit"
                  disabled={!state.draft.trim() || !canSubmitProof(state)}
                  busy={state.pending === "save"}
                >
                  {state.pending === "save" ? "Saving proof…" : "Save proof"}
                </Action>
              </div>
            </form>
          </ContentDialog>
        </>
      )}
    </AppFrame>
  );
}
