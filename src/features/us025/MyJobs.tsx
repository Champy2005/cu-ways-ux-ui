import { WorkbenchFrame as AppFrame } from "../shared/WorkbenchFrame";
import { useReducer, useEffect, useState, type ComponentProps } from "react";
import {
  Action,
  ActionLink,
  BackLink,
  ContentDialog,
  EmptyState,
  Feedback,
  InlineLink,
  JobsLoading,
  Pagination,
  SelectControl,
  Icon,
  type JobStatus,
} from "../../design-system/components/primitives";
import {
  Card,
  ConfirmationActions,
  JobSummary,
  OperationProgress,
  UnavailableState,
  StatusHeading,
} from "../../design-system/compositions/layout";
import {
  createJobsPreview,
  reduceJobsController,
  type RecordStatus,
} from "./controller";
import { FIXTURES, SCENARIO_BY_ID } from "./scenarios.mjs";
import { mockJobRecords, mockReadStatus } from "./records.mjs";
import { useTheme } from "../../design-system/ThemeProvider";
import { money, date, useOperation, type Timing } from "../shared/operations";
import s from "../shared/features.module.css";
import detail from "./detail.module.css";
function JobOperationTask({
  timing,
  onResolve,
  onTimeout,
}: {
  timing: Timing;
  onResolve: () => void;
  onTimeout: () => void;
}) {
  useOperation(true, timing, onResolve, onTimeout);
  return null;
}
export function MyJobs({
  scenario = "L02",
  fixture = "standard",
  timing = "hold",
  jobId,
  filter,
  page = 1,
  readStatus,
  pendingRequest,
  needsCheck,
}: {
  scenario?: string;
  fixture?: string;
  timing?: Timing;
  jobId?: number;
  filter?: string;
  page?: number;
  readStatus?: RecordStatus;
  pendingRequest?: number;
  needsCheck?: boolean;
}) {
  const appearance = useTheme();
  const [announcement, setAnnouncement] = useState("");
  const [state, send] = useReducer(reduceJobsController, scenario, (id) =>
    createJobsPreview({
      scenario: id,
      fixture,
      jobId,
      filter,
      page,
      readStatus,
      pendingRequest,
      needsCheck,
    }),
  );
  const model = SCENARIO_BY_ID[state.scenarioId];
  useEffect(() => {
    if (state.confirmationOpen) return;
    const id =
      state.focusTarget === "return-job"
        ? `view-job-${state.jobId}`
        : state.focusTarget === "progress"
          ? "view-progress"
          : ["page-heading", "detail-heading", "start"].includes(
                state.focusTarget ?? "",
              )
            ? "page-heading"
            : null;
    if (id) document.getElementById(id)?.focus();
  }, [
    state.focusTarget,
    state.route,
    state.scenarioId,
    state.confirmationOpen,
    state.jobId,
  ]);
  const data = FIXTURES[state.fixtureName as keyof typeof FIXTURES];
  const records = mockJobRecords(data, state.confirmedStatuses);
  const selectedRecord =
    records.find((job: { id: number }) => job.id === state.jobId) ?? data;
  const selected =
    state.optionalMissingJobId === state.jobId
      ? {
          ...selectedRecord,
          deliveryDate: null,
          deadline: null,
          targetResponses: null,
          briefUrl: null,
        }
      : selectedRecord;
  const loading = ["L01", "D01"].includes(state.scenarioId);
  const reading = ["L01", "D01", "C08", "R01", "R13"].includes(
    state.scenarioId,
  );
  const activeStart =
    state.starts.get(state.jobId) ?? state.starts.values().next().value;
  const openJob = (jobId: number) => {
    send({ type: "OPEN_JOB", jobId });
    send({
      type: "DETAIL_READ_RESULT",
      status: mockReadStatus(
        records.find((r: { id: number }) => r.id === jobId),
        {
          useConfiguredOutcome: state.uncertainStarts.has(jobId),
          configuredOutcome: "in-progress",
        },
      ),
    });
  };
  const jobHref = (id: number) => {
    const record = records.find((record: { id: number }) => record.id === id);
    const task = state.starts.get(id);
    const read = record ? `;readStatus:${record.status}` : "";
    const pending = task ? `;pendingRequest:${task.requestId}` : "";
    const uncertain = state.uncertainStarts.has(id) ? ";needsCheck:true" : "";
    const query = new URLSearchParams({
      id: "us025--d-01",
      viewMode: "story",
      args: `jobId:${id};fixture:${state.fixtureName};timing:${timing};filter:${state.listFilter};page:${state.page}${read}${pending}${uncertain}`,
      globals: `theme:${appearance.theme};material:${appearance.material};textScale:${appearance.textScale}`,
    });
    return `iframe.html?${query}`;
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
  const viewId = ["C01", "C03", "C04", "C05"].includes(state.scenarioId)
    ? "D02"
    : state.scenarioId;
  const recoveryIds = [
    "R01",
    "R04",
    "R07",
    "R11",
    "R12",
    "R13",
    "R14",
    "C08",
    "D08",
    "R10",
  ];
  const notice =
    state.scenarioId === "C06"
      ? "Start request may still be processing"
      : ["C07", "R02", "R05", "R06"].includes(state.scenarioId)
        ? null
        : model.bannerTone
          ? (model.bannerTitle ?? "")
          : null;
  const canStart = ["D02", "D09", "C02", "R03", "R11"].includes(viewId);
  const standaloneRecovery = ["D03", "D08", "R10"].includes(state.scenarioId);
  const panelRefresh =
    !["D05", "R06"].includes(viewId) && !recoveryIds.includes(viewId);
  return (
    <AppFrame
      title={
        state.route === "list"
          ? "My Jobs"
          : ["D01", "D03", "D06", "D07", "D10", "R08", "R09"].includes(
                state.scenarioId,
              )
            ? "Job details"
            : `Job #${state.jobId}`
      }
      showBack={state.route !== "list"}
      feature="025"
      busy={loading}
      headingLayout={state.scenarioId === "L06" ? "list" : undefined}
      headingAction={
        state.route === "list" && !["L06", "L09"].includes(state.scenarioId) ? (
          <label className={detail.filter}>
            Status
            <SelectControl
              disabled={state.scenarioId === "L01"}
              label="Filter jobs by status"
              value={state.listFilter}
              options={filterOptions}
              onChange={(filter) => send({ type: "CHANGE_FILTER", filter })}
            />
          </label>
        ) : undefined
      }
      action={
        canStart &&
        ((state.statusKnown && state.jobStatus === "Accepted") ||
          viewId === "R11") ? (
          <Action
            role="primary"
            disabled={state.pending}
            onClick={() => send({ type: "OPEN_CONFIRM" })}
          >
            Start job
          </Action>
        ) : undefined
      }
      backLabel={
        ["D07", "D10", "R09"].includes(state.scenarioId)
          ? "Back to workspace"
          : "Back to My Jobs"
      }
      onBack={() =>
        send({ type: state.pending ? "NAVIGATE_AWAY" : "BACK_TO_LIST" })
      }
    >
      {!state.privateDataVisible || state.scenarioId === "L09" ? (
        <UnavailableState
          title={
            state.scenarioId === "L09"
              ? "My Jobs isn’t available yet"
              : privateTitle
          }
          action={
            state.scenarioId === "L09" ? (
              <BackLink
                href="#overview"
                onClick={() =>
                  setAnnouncement("Overview is outside this demo.")
                }
              >
                Back to overview
              </BackLink>
            ) : privateTitle === "Session expired" ? (
              <Action
                role="entry"
                onClick={() =>
                  state.demoSignInComplete
                    ? openJob(state.jobId)
                    : send({ type: "SIGN_IN" })
                }
              >
                {state.demoSignInComplete ? "Continue" : "Sign in"}
              </Action>
            ) : undefined
          }
        >
          {state.scenarioId === "L09"
            ? "Please return to your overview."
            : privateTitle === "Session expired"
              ? "Sign in to check this job’s status."
              : privateTitle === "Marketer access required"
                ? "Use an account with marketer access to view hired jobs."
                : "This job couldn’t be found or you don’t have access to it."}
        </UnavailableState>
      ) : (
        <>
          {activeStart && !state.confirmationOpen && (
            <div className={detail.notice}>
              <OperationProgress
                title={`Starting Job #${activeStart.jobId}`}
                onReopen={() =>
                  send({ type: "REOPEN_OPERATION", jobId: activeStart.jobId })
                }
              />
            </div>
          )}
          {!activeStart &&
            state.backgroundResult &&
            !state.confirmationOpen &&
            !state.unknownOutcome && (
              <div className={detail.notice}>
                <Feedback
                  variant="jobs"
                  title={state.backgroundResult.title}
                  tone={state.backgroundResult.tone}
                  action={
                    state.route === "list" ||
                    state.jobId !== state.backgroundResult.jobId ? (
                      <Action
                        onClick={() => openJob(state.backgroundResult!.jobId)}
                      >
                        View job
                      </Action>
                    ) : undefined
                  }
                >
                  {state.backgroundResult.body}
                </Feedback>
              </div>
            )}
          {notice !== null && (
            <div
              className={standaloneRecovery ? detail.recovery : detail.notice}
            >
              <Feedback
                variant="jobs"
                title={notice}
                pending={["R01", "R13"].includes(state.scenarioId)}
                tone={
                  (model.bannerTone as ComponentProps<
                    typeof Feedback
                  >["tone"]) ?? "info"
                }
                action={
                  ["L06", "L07", "D03"].includes(state.scenarioId) ||
                  (recoveryIds.includes(state.scenarioId) &&
                    !["R01", "R13"].includes(state.scenarioId)) ? (
                    <Action
                      disabled={state.pending}
                      onClick={() => {
                        if (state.route === "list")
                          send({ type: "RETRY_LIST" });
                        else {
                          send({
                            type: "REFRESH_DETAIL",
                            status: "in-progress",
                          });
                        }
                      }}
                    >
                      <Icon name="refresh" />
                      {["L06", "L07", "D03"].includes(state.scenarioId)
                        ? "Try again"
                        : "Refresh job"}
                    </Action>
                  ) : undefined
                }
              >
                {state.scenarioId === "C06"
                  ? "Opening a job checks its current status. This page will not repeat the start request."
                  : model.bannerBody?.replace(
                      "{status}",
                      state.jobStatus ?? "Unavailable",
                    )}
              </Feedback>
            </div>
          )}
          {state.scenarioId === "L08" && (
            <div className={detail.listUpdating} role="status">
              <Icon name="spinner" />
              Updating your results…
            </div>
          )}
          {loading ? (
            <JobsLoading detail={state.route !== "list"} />
          ) : state.route === "list" ? (
            <>
              {empty ? (
                <Card boundary="JobsEmpty">
                  <EmptyState
                    variant="jobs"
                    title={
                      state.scenarioId === "L03"
                        ? "No active jobs"
                        : state.scenarioId === "L04"
                          ? "No hired jobs yet"
                          : "No jobs with this status"
                    }
                    action={
                      state.scenarioId === "L04" ? undefined : (
                        <Action
                          role={
                            state.scenarioId === "L03" ? "entry" : "utility"
                          }
                          onClick={() =>
                            send({
                              type: "CHANGE_FILTER",
                              filter:
                                state.scenarioId === "L03" ? "all" : "active",
                            })
                          }
                        >
                          {state.scenarioId === "L03"
                            ? "View all my jobs"
                            : "Clear filter · Active jobs"}
                        </Action>
                      )
                    }
                  >
                    {state.scenarioId === "L05"
                      ? "Try a different status or return to Active jobs."
                      : "Jobs appear here after a creator accepts your offer."}
                  </EmptyState>
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
                            <JobSummary
                              key={job.id}
                              title={job.surveys.join(" · ")}
                              context={`Job #${job.id}`}
                              status={job.status}
                              items={[
                                { label: "Creator", value: job.creator },
                                {
                                  label: "Agreed price",
                                  value: money(job.offeredPrice),
                                },
                                {
                                  label: "Deadline",
                                  value: job.deadline
                                    ? date(job.deadline)
                                    : "Not specified",
                                },
                              ]}
                              action={
                                <ActionLink
                                  href={jobHref(job.id)}
                                  role="entry"
                                  size="list-entry"
                                  id={`view-job-${job.id}`}
                                  onClick={() => openJob(job.id)}
                                >
                                  View job
                                </ActionLink>
                              }
                            />
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
            !["D03", "D08", "R10"].includes(state.scenarioId) && (
              <>
                <div className={detail.layout} data-ui="JobDetailLayout">
                  <section className={detail.context} data-ui="SurveyContext">
                    <div className={detail.heading}>
                      <h2 className={detail.title}>
                        {selected.surveys.length === 1 ? "Survey" : "Surveys"}
                      </h2>
                      {selected.surveys.length > 1 && (
                        <span className={detail.count}>
                          {selected.surveys.length} total
                        </span>
                      )}
                    </div>
                    <ul className={detail.surveys}>
                      {selected.surveys.map((name: string) => (
                        <li className={detail.surveyItem} key={name}>
                          {name}
                        </li>
                      ))}
                    </ul>
                    <dl className={detail.facts}>
                      {[
                        { label: "Creator", value: selected.creator },
                        {
                          label: "Agreed delivery",
                          value: selected.deliveryDate
                            ? date(selected.deliveryDate)
                            : "Not specified",
                        },
                        {
                          label: "Deadline",
                          value: selected.deadline
                            ? date(selected.deadline)
                            : "Not specified",
                        },
                        {
                          label: "Target responses",
                          value:
                            selected.targetResponses == null
                              ? "Target not specified"
                              : `${selected.targetResponses.toLocaleString("en-US")} responses`,
                        },
                        {
                          label: "Brief",
                          value: selected.briefUrl ? (
                            <InlineLink
                              href={selected.briefUrl}
                              external
                              externalIcon={false}
                            >
                              Open brief
                            </InlineLink>
                          ) : (
                            "No brief attached"
                          ),
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <dt className={detail.factLabel}>{item.label}</dt>
                          <dd className={detail.factValue}>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  <section className={detail.contract} data-ui="JobContract">
                    <StatusHeading
                      title="Contract"
                      status={
                        state.statusKnown
                          ? (state.jobStatus as JobStatus)
                          : undefined
                      }
                    />
                    {state.scenarioId === "R14" && (
                      <p className={detail.provenance}>
                        Last confirmed information
                      </p>
                    )}
                    {!state.statusKnown && state.lastConfirmedStatus && (
                      <p className={detail.lastConfirmed}>
                        Last confirmed:{" "}
                        <strong className={detail.lastStatus}>
                          {state.lastConfirmedStatus}
                        </strong>
                      </p>
                    )}
                    <dl className={detail.price}>
                      <dt className={detail.priceLabel}>Agreed price</dt>
                      <dd className={detail.priceValue}>
                        {money(selected.offeredPrice)}
                      </dd>
                    </dl>
                    {(canStart || panelRefresh) && (
                      <div className={detail.actions}>
                        {canStart && (
                          <div className={detail.desktopAction}>
                            <Action
                              role="primary"
                              disabled={state.pending}
                              onClick={() => send({ type: "OPEN_CONFIRM" })}
                            >
                              Start job
                            </Action>
                          </div>
                        )}
                        {panelRefresh && (
                          <Action
                            disabled={state.pending}
                            onClick={() => {
                              send({
                                type: "REFRESH_DETAIL",
                                status: "in-progress",
                              });
                            }}
                          >
                            <Icon name="refresh" />
                            Refresh job
                          </Action>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )
          )}
          {state.offlineNotice && (
            <Feedback title="You’re offline" tone="warning">
              Reconnect and refresh before starting.
            </Feedback>
          )}
          <ContentDialog
            variant="job-start"
            busy={!!state.pending}
            initialFocusId={!state.pending ? "keep-accepted" : undefined}
            open={state.confirmationOpen}
            title={state.pending ? "Starting job" : "Start job"}
            onClose={() => send({ type: "CANCEL_CONFIRM" })}
          >
            <p className={detail.dialogReference}>Job #{state.jobId}</p>
            <dl className={detail.dialogPrice}>
              <dt className={detail.priceLabel}>Agreed price</dt>
              <dd className={detail.dialogPriceValue}>
                {money(selected.offeredPrice)}
              </dd>
            </dl>
            {state.pending && (
              <div className={detail.dialogProgress} role="status">
                <Icon name="spinner" />
                <span>Submitting…</span>
              </div>
            )}
            <ConfirmationActions
              variant="job-start"
              safe={
                state.pending ? null : (
                  <Action
                    id="keep-accepted"
                    role="safe"
                    onClick={() => send({ type: "CANCEL_CONFIRM" })}
                  >
                    Cancel
                  </Action>
                )
              }
              commit={
                state.pending ? null : (
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
      {announcement && (
        <p role="status" className={detail.srOnly}>
          {announcement}
        </p>
      )}
      {[...state.starts.values()].map((task) => (
        <JobOperationTask
          key={`start-${task.jobId}-${task.requestId}`}
          timing={timing}
          onResolve={() =>
            send({
              type: "SETTLE_START",
              jobId: task.jobId,
              requestId: task.requestId,
              outcome: "started",
            })
          }
          onTimeout={() =>
            send({
              type: "SETTLE_START",
              jobId: task.jobId,
              requestId: task.requestId,
              outcome: "unknown",
            })
          }
        />
      ))}
      {reading && (
        <JobOperationTask
          key={`read-${state.jobId}-${state.requestId}-${state.scenarioId}`}
          timing={timing}
          onResolve={() =>
            send(
              state.route === "list"
                ? { type: "RETRY_LIST" }
                : {
                    type: "DETAIL_READ_RESULT",
                    status: mockReadStatus(selectedRecord, {
                      useConfiguredOutcome: state.readMode === "configured",
                      configuredOutcome: "in-progress",
                    }),
                  },
            )
          }
          onTimeout={() =>
            send(
              state.route === "list"
                ? { type: "LIST_READ_FAILED" }
                : { type: "DETAIL_READ_RESULT", status: "failed" },
            )
          }
        />
      )}
    </AppFrame>
  );
}
