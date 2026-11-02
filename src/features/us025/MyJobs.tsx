import { WorkbenchFrame as AppFrame } from "../shared/WorkbenchFrame";
import { useReducer, useEffect, type ComponentProps } from "react";
import {
  Action,
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
import { createDemoState, transitionDemo } from "./model.mjs";
import { FIXTURES, SCENARIO_BY_ID } from "./scenarios.mjs";
import { mockJobRecords } from "./records.mjs";
import { money, date, useOperation, type Timing } from "../shared/operations";
import s from "../shared/features.module.css";
import detail from "./detail.module.css";
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
  const records = mockJobRecords(data);
  const selected =
    records.find((job: { id: number }) => job.id === state.jobId) ?? data;
  const resolve = () =>
    send(
      state.pending
        ? { type: "RESOLVE_START", outcome: "started" }
        : { type: "DETAIL_READ_RESULT", status: "accepted" },
    );
  const loading = ["L01", "D01"].includes(state.scenarioId);
  useOperation(
    state.pending || loading,
    timing,
    () => (state.route === "list" ? send({ type: "RETRY_LIST" }) : resolve()),
    () =>
      send(
        state.pending
          ? { type: "RESOLVE_START", outcome: "unknown" }
          : state.route === "list"
            ? { type: "LIST_READ_FAILED" }
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
  const notice = ["C07", "R02", "R05"].includes(state.scenarioId)
    ? null
    : model.bannerTone
      ? (model.bannerTitle ?? "")
      : null;
  const canStart =
    ["D02", "D09", "C02", "R03", "R11"].includes(viewId) && !state.pending;
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
      headingAction={
        state.route === "list" ? (
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
        canStart && !state.pending ? (
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
          {state.pending && !state.confirmationOpen && (
            <div className={detail.notice}>
              <OperationProgress
                title={`Starting Job #${state.jobId}`}
                onReopen={() => send({ type: "REOPEN_PROGRESS" })}
              />
            </div>
          )}
          {notice !== null && (
            <div className={detail.notice}>
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
                          send({ type: "REFRESH_DETAIL" });
                          send({
                            type: "DETAIL_READ_RESULT",
                            status: "accepted",
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
                {model.bannerBody?.replace(
                  "{status}",
                  state.jobStatus ?? "Unavailable",
                )}
              </Feedback>
            </div>
          )}
          {state.scenarioId === "L08" && (
            <p role="status">Updating your results…</p>
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
                                <Action
                                  role="entry"
                                  size="list-entry"
                                  id={`view-job-${job.id}`}
                                  onClick={() => openJob(job.id)}
                                >
                                  View job
                                </Action>
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
                          value: `${selected.targetResponses} responses`,
                        },
                        {
                          label: "Brief",
                          value: (
                            <InlineLink
                              href={selected.briefUrl}
                              external
                              externalIcon={false}
                            >
                              Open brief
                            </InlineLink>
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
                        <strong>{state.lastConfirmedStatus}</strong>
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
                              send({ type: "REFRESH_DETAIL" });
                              send({
                                type: "DETAIL_READ_RESULT",
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
            {state.pending && <p role="status">Submitting…</p>}
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
    </AppFrame>
  );
}
