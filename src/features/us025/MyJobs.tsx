import { useReducer } from "react";
import {
  Action,
  ActionLink,
  ContentDialog,
  EmptyState,
  Feedback,
  Loading,
  Pagination,
  SelectControl,
  type JobStatus,
} from "../../design-system/components/primitives";
import {
  AppFrame,
  Card,
  Columns,
  ConfirmationActions,
  Metadata,
  OperationProgress,
  Stack,
  StatusHeading,
} from "../../design-system/compositions/layout";
import { createDemoState, transitionDemo } from "./model.mjs";
import { FIXTURES, SCENARIO_BY_ID } from "./scenarios.mjs";
import { mockJobRecords } from "./records.mjs";
import { money, useOperation, type Timing } from "../shared/operations";
import s from "../shared/features.module.css";
type JobEvent = { type: string; [key: string]: unknown };
export function MyJobs({
  scenario = "L02",
  fixture = "standard",
  timing = "hold",
}: {
  scenario?: string;
  fixture?: string;
  timing?: Timing;
}) {
  const [state, send] = useReducer(
    (
      previous: ReturnType<typeof createDemoState> & {
        offlineNotice?: boolean;
      },
      event: JobEvent,
    ) => transitionDemo(previous, event).state,
    scenario,
    (id) => createDemoState({ scenarioId: id, fixtureName: fixture }),
  );
  const model = SCENARIO_BY_ID[state.scenarioId];
  const data = FIXTURES[state.fixtureName as keyof typeof FIXTURES];
  const records = mockJobRecords(data);
  const selected =
    records.find((job: { id: number }) => job.id === state.jobId) ?? data;
  const resolve = () =>
    send(
      state.pending
        ? { type: "RESOLVE_START", outcome: "started" }
        : { type: "DETAIL_READ_RESULT", status: "accepted" },
    );
  const loading = ["L01", "L08", "D01", "R01", "R13"].includes(
    state.scenarioId,
  );
  useOperation(
    state.pending || loading,
    timing,
    () => (state.route === "list" ? send({ type: "RETRY_LIST" }) : resolve()),
    () =>
      send(
        state.pending
          ? { type: "RESOLVE_START", outcome: "unknown" }
          : { type: "DETAIL_READ_RESULT", status: "failed" },
      ),
  );
  const openJob = (jobId: number) => {
    send({ type: "OPEN_JOB", jobId });
    send({
      type: "DETAIL_READ_RESULT",
      status:
        records.find((r: { id: number }) => r.id === jobId)?.status ===
        "In Progress"
          ? "in-progress"
          : "accepted",
    });
  };
  const filterOptions = [
    { value: "active", label: "Active jobs" },
    ...["Accepted", "In Progress", "Completed", "Cancelled"].map((value) => ({
      value,
      label: value,
    })),
    { value: "all", label: "All my jobs" },
  ];
  const list = records.filter((job: { status: string }) =>
    state.listFilter === "all" || state.listFilter === "active"
      ? state.listFilter === "all" ||
        ["Accepted", "In Progress"].includes(job.status)
      : job.status === state.listFilter,
  );
  const pages = Math.max(1, Math.ceil(list.length / 20));
  const empty = ["L03", "L04", "L05"].includes(state.scenarioId);
  const privateTitle = ["D10", "R09"].includes(state.scenarioId)
    ? "Session expired"
    : state.scenarioId === "D07"
      ? "Marketer access required"
      : "Job unavailable";
  const notice =
    model.bannerTitle ??
    (["R11", "R14", "R10"].includes(state.scenarioId)
      ? model.title
      : state.scenarioId === "C06"
        ? "Start request may still be processing"
        : null);
  const canStart = ["D02", "D09", "C02", "R03", "R11"].includes(
    state.scenarioId,
  );
  return (
    <AppFrame
      title={state.route === "list" ? "My Jobs" : "Job details"}
      feature="025"
      backLabel={state.route === "list" ? "Story library" : "Back to My Jobs"}
      onBack={() =>
        send({ type: state.pending ? "NAVIGATE_AWAY" : "BACK_TO_LIST" })
      }
    >
      {state.route === "list" && (
        <div className={s.listHeading}>
          <p className={s.muted}>Your hired work</p>
          <label className={s.filter}>
            Status
            <SelectControl
              label="Filter jobs by status"
              value={state.listFilter}
              options={filterOptions}
              onChange={(filter) => send({ type: "CHANGE_FILTER", filter })}
            />
          </label>
        </div>
      )}
      {!state.privateDataVisible || state.scenarioId === "L09" ? (
        <Feedback
          title={privateTitle}
          action={
            privateTitle === "Session expired" ? (
              <Action
                role="supporting"
                onClick={() => send({ type: "SIGN_IN" })}
              >
                Sign in
              </Action>
            ) : undefined
          }
        >
          Your access has changed.
        </Feedback>
      ) : (
        <>
          {notice && (
            <Feedback
              title={notice}
              tone={
                state.scenarioId === "C07"
                  ? "success"
                  : ["L06", "D03", "C08", "R12"].includes(state.scenarioId)
                    ? "error"
                    : "warning"
              }
              action={
                ["L06", "D03", "D08", "C08", "R04", "R10", "R12"].includes(
                  state.scenarioId,
                ) ? (
                  <Action
                    onClick={() => {
                      if (state.route === "list") send({ type: "RETRY_LIST" });
                      else {
                        send({ type: "REFRESH_DETAIL" });
                        send({
                          type: "DETAIL_READ_RESULT",
                          status: "accepted",
                        });
                      }
                    }}
                  >
                    Try again
                  </Action>
                ) : undefined
              }
            >
              {model.bannerBody}
            </Feedback>
          )}
          {loading ? (
            <Loading
              title={
                state.route === "list"
                  ? "Loading your jobs"
                  : "Checking job details"
              }
              onStop={() =>
                send(
                  state.route === "list"
                    ? { type: "RETRY_LIST" }
                    : { type: "DETAIL_READ_RESULT", status: "failed" },
                )
              }
            />
          ) : state.route === "list" ? (
            <>
              {empty ? (
                <Card>
                  <Stack>
                    <EmptyState
                      title={
                        state.scenarioId === "L03"
                          ? "No active jobs"
                          : state.scenarioId === "L04"
                            ? "No hired jobs"
                            : "No jobs match this status"
                      }
                    >
                      Jobs appear after a creator accepts your offer.
                    </EmptyState>
                    <Action
                      onClick={() =>
                        send({ type: "CHANGE_FILTER", filter: "all" })
                      }
                    >
                      View all my jobs
                    </Action>
                  </Stack>
                </Card>
              ) : (
                state.scenarioId !== "L06" && (
                  <>
                    <div className={s.jobRows}>
                      {list
                        .slice(
                          (Math.min(state.page, pages) - 1) * 20,
                          Math.min(state.page, pages) * 20,
                        )
                        .map(
                          (job: {
                            id: number;
                            status: JobStatus;
                            surveys: string[];
                            creator: string;
                            offeredPrice: string;
                            deadline: string | null;
                          }) => (
                            <Card key={job.id}>
                              <StatusHeading
                                title={job.surveys.join(" · ")}
                                context={`Job #${job.id}`}
                                status={job.status}
                              />
                              <Metadata
                                items={[
                                  { label: "Creator", value: job.creator },
                                  {
                                    label: "Agreed price",
                                    value: money(job.offeredPrice),
                                  },
                                  {
                                    label: "Deadline",
                                    value: job.deadline ?? "Not specified",
                                  },
                                ]}
                              />
                              <div className={s.jobFooter}>
                                <Action onClick={() => openJob(job.id)}>
                                  View job
                                </Action>
                              </div>
                            </Card>
                          ),
                        )}
                    </div>
                    <Pagination
                      page={Math.min(state.page, pages)}
                      pages={pages}
                      onChange={(page) => send({ type: "CHANGE_PAGE", page })}
                    />
                  </>
                )
              )}
            </>
          ) : (
            !["D03"].includes(state.scenarioId) && (
              <>
                <Card>
                  <StatusHeading
                    title={selected.surveys.join(" · ")}
                    context={`Job #${state.jobId}`}
                    status={state.statusKnown ? state.jobStatus : undefined}
                  />
                </Card>
                <Columns>
                  <Card title="Job overview">
                    <Metadata
                      items={[
                        { label: "Creator", value: selected.creator },
                        {
                          label: "Agreed delivery",
                          value: selected.deliveryDate,
                        },
                        {
                          label: "Deadline",
                          value: selected.deadline ?? "Not specified",
                        },
                        {
                          label: "Target responses",
                          value: selected.targetResponses,
                        },
                        {
                          label: "Brief",
                          value: (
                            <a
                              href={selected.briefUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open brief ↗
                            </a>
                          ),
                        },
                      ]}
                    />
                  </Card>
                  <Card
                    title={
                      state.jobStatus === "In Progress"
                        ? "Work has started"
                        : canStart
                          ? "Ready to start"
                          : "Start unavailable"
                    }
                  >
                    <Stack>
                      <div>
                        <p className={s.muted}>Agreed price</p>
                        <p className={s.price}>
                          {money(selected.offeredPrice)}
                        </p>
                      </div>
                      {canStart && (
                        <Action
                          role="primary"
                          onClick={() => send({ type: "OPEN_CONFIRM" })}
                        >
                          Start job
                        </Action>
                      )}
                      {state.jobStatus === "In Progress" && (
                        <ActionLink
                          href="?id=us026--a-01&viewMode=story"
                          role="utility"
                        >
                          Open delivery evidence
                        </ActionLink>
                      )}
                      <Action
                        onClick={() => {
                          send({ type: "REFRESH_DETAIL" });
                          send({
                            type: "DETAIL_READ_RESULT",
                            status: "in-progress",
                          });
                        }}
                      >
                        Refresh job
                      </Action>
                    </Stack>
                  </Card>
                </Columns>
              </>
            )
          )}
          {state.pending && !state.confirmationOpen && (
            <OperationProgress
              onReopen={() => send({ type: "REOPEN_PROGRESS" })}
              onCheck={resolve}
            />
          )}
          {state.offlineNotice && (
            <Feedback title="You’re offline" tone="warning">
              Reconnect and refresh before starting.
            </Feedback>
          )}
          <ContentDialog
            open={state.confirmationOpen}
            title={state.pending ? "Starting job" : "Start job"}
            onClose={() => send({ type: "CANCEL_CONFIRM" })}
          >
            <Stack>
              <p className={s.muted}>Job #{state.jobId}</p>
              <div>
                <p className={s.muted}>Agreed price</p>
                <p className={s.price}>{money(selected.offeredPrice)}</p>
              </div>
              {state.pending && <p role="status">Submitting…</p>}
            </Stack>
            <ConfirmationActions
              safe={
                state.pending ? null : (
                  <Action
                    role="safe"
                    onClick={() => send({ type: "CANCEL_CONFIRM" })}
                  >
                    Keep Accepted
                  </Action>
                )
              }
              commit={
                state.pending ? (
                  <Action role="safe" onClick={resolve}>
                    Check status
                  </Action>
                ) : (
                  <Action
                    role="primary"
                    onClick={() => send({ type: "CONFIRM_START" })}
                  >
                    Start job
                  </Action>
                )
              }
            />
          </ContentDialog>
        </>
      )}
    </AppFrame>
  );
}
