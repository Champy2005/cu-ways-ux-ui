import { WorkbenchFrame as AppFrame } from "../shared/WorkbenchFrame";
import { useReducer, useState } from "react";
import {
  Action,
  ContentDialog,
  EmptyState,
  Feedback,
  Field,
  Loading,
} from "../../design-system/components/primitives";
import {
  Card,
  ConfirmationActions,
  OperationProgress,
  ProofRecord,
  Stack,
  StatusHeading,
} from "../../design-system/compositions/layout";
import { createDemoState, reduceDemoState } from "./model.mjs";
import { date, useOperation, type Timing } from "../shared/operations";

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
}: {
  scenario?: string;
  timing?: Timing;
  outcome?: ProofOutcome;
}) {
  const [state, send] = useReducer(reduceDemoState, scenario, (id) =>
    createDemoState(id),
  );
  const [open, setOpen] = useState(
    ["A02", "A03", "A05", "B01", "B04"].includes(scenario),
  );
  const resolve = () => {
    if (state.pending === "save") {
      send({ type: "resolve-save", outcome });
      setOpen(false);
    } else if (state.pending === "check")
      send({ type: "resolve-check", outcome: "available" });
    else if (state.pending === "refresh") send({ type: "resolve-status" });
    else send({ type: "resolve-list", outcome: "loaded" });
  };
  useOperation(state.pending, timing, resolve, () => {
    send({ type: "timeout" });
    setOpen(false);
  });
  const add = () => {
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
      body: "Attachment type rejected. Your link is preserved.",
      tone: "error",
    },
    "save-confirmed": { title: "Proof saved", tone: "success" },
    "proof-confirmed": { title: "Proof confirmed", tone: "success" },
    "save-unknown": {
      title: "Save not confirmed",
      body: "Check the saved list before another attempt.",
      tone: "warning",
    },
    "check-unavailable": {
      title: "Saved proof could not be checked",
      body: "Your link is preserved.",
      tone: "warning",
    },
    "confirmed-miss": {
      title: "This link wasn’t saved",
      body: "You can now retry.",
      tone: "info",
    },
    "status-changed": {
      title: "This job may have changed",
      body: "Refresh before adding proof.",
      tone: "warning",
    },
    "list-unavailable": {
      title: "Couldn’t load saved proof",
      body: "The list may not be empty.",
      tone: "error",
    },
  };
  const notice = state.feedback
    ? feedback[state.feedback]
    : state.scenarioId === "B03"
      ? {
          title: "Save not confirmed",
          body: "Check the saved list before another attempt.",
          tone: "warning" as const,
        }
      : null;
  return (
    <AppFrame
      title="Proof of delivery"
      feature="026"
      backLabel="Back to My Jobs"
      onBack={() =>
        !state.job
          ? (window.location.href = "?id=us025--l-02&viewMode=story")
          : send({ type: state.view === "jobs" ? "open-job" : "go-to-jobs" })
      }
    >
      {!state.job ? (
        <Feedback title="This job isn’t available">
          Your access has changed.
        </Feedback>
      ) : state.view === "jobs" ? (
        <Card>
          <Stack>
            <StatusHeading
              title={state.job.title}
              context={`Job #${state.job.id}`}
              status={state.job.status}
            />
            <Action
              role="supporting"
              onClick={() => send({ type: "open-job" })}
            >
              Open delivery evidence
            </Action>
          </Stack>
        </Card>
      ) : (
        <>
          <StatusHeading
            title={state.job.title}
            context={`Job #${state.job.id}`}
            status={state.job.status}
          />
          {notice && state.listStatus !== "failed" && (
            <Feedback
              title={notice.title}
              tone={notice.tone}
              action={
                state.scenarioId === "B02" ? (
                  <Action onClick={add}>Reopen proof form</Action>
                ) : state.scenarioId === "B03" ? (
                  <Action onClick={() => send({ type: "check-saved" })}>
                    Check saved proof
                  </Action>
                ) : state.scenarioId === "C02" ? (
                  <Action onClick={() => send({ type: "refresh-status" })}>
                    Refresh job
                  </Action>
                ) : undefined
              }
            >
              {notice.body}
            </Feedback>
          )}
          {state.pending && state.pending !== "save" && (
            <OperationProgress onCheck={resolve} />
          )}
          {state.listStatus === "loading" ? (
            <Loading
              title="Loading saved proof"
              onStop={() => send({ type: "timeout" })}
            />
          ) : state.listStatus === "failed" ? (
            <Feedback
              title={notice?.title ?? "Saved proof unavailable"}
              tone="error"
              action={
                <Action onClick={() => send({ type: "retry-list" })}>
                  Try again
                </Action>
              }
            >
              {notice?.body ?? "The list may not be empty."}
            </Feedback>
          ) : (
            <Card
              boundary="ProofWorkspace"
              title={`Saved proof (${state.rows.length})`}
              action={
                state.job.status === "In Progress" &&
                state.scenarioId !== "C02" &&
                state.scenarioId !== "B03" ? (
                  <Action role="utility" onClick={add}>
                    Add proof
                  </Action>
                ) : undefined
              }
            >
              {state.rows.length ? (
                state.rows.map(
                  (row: { id: string; url: string; upload_at: string }) => (
                    <ProofRecord
                      key={row.id}
                      url={row.url}
                      timestamp={`Saved ${date(row.upload_at)}, ${new Intl.DateTimeFormat(
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
                <EmptyState title="No proof added yet" />
              )}
            </Card>
          )}
          {state.pending === "save" && !open && (
            <OperationProgress
              onReopen={() => setOpen(true)}
              onCheck={resolve}
            />
          )}
          <ContentDialog
            open={open}
            title={state.pending === "save" ? "Saving proof" : "Add proof"}
            onClose={() => setOpen(false)}
          >
            <form
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
                label="Delivery link"
                value={state.draft}
                error={state.fieldError}
                readOnly={!!state.pending}
                onChange={(value) => send({ type: "draft", value })}
              />
              <ConfirmationActions
                safe={
                  state.pending ? (
                    <Action role="safe" onClick={resolve}>
                      Check status
                    </Action>
                  ) : null
                }
                commit={
                  <Action
                    role="primary"
                    type="submit"
                    busy={state.pending === "save"}
                  >
                    {state.pending === "save" ? "Saving…" : "Save proof"}
                  </Action>
                }
              />
            </form>
          </ContentDialog>
        </>
      )}
    </AppFrame>
  );
}
