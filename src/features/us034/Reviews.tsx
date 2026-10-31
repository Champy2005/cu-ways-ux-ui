import { useReducer } from "react";
import {
  Action,
  EmptyState,
  Feedback,
  Icon,
  Loading,
  Pagination,
  SelectControl,
} from "../../design-system/components/primitives";
import {
  AppFrame,
  Card,
  Columns,
  Stack,
} from "../../design-system/compositions/layout";
import * as model from "./model.mjs";
import { date, useOperation, type Timing } from "../shared/operations";
import s from "../shared/features.module.css";
type Review = {
  id: number;
  creator: string;
  jobId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
};
type ReviewState = {
  rows: Review[];
  page: number;
  pageSize: number;
  filter: string;
  pending: string | null;
  error: string | null;
  access: boolean;
  expanded: number[];
};
export function Reviews({
  scenario = "A01",
  timing = "hold",
}: {
  scenario?: string;
  timing?: Timing;
}) {
  const [state, send] = useReducer(
    (s: ReviewState, e: { type: string; [key: string]: unknown }) =>
      model.reduce(s, e) as ReviewState,
    scenario,
    (id) => model.seed(id) as ReviewState,
  );
  useOperation(
    !!state.pending,
    timing,
    () => send({ type: "resolve", read: "success" }),
    () => send({ type: "timeout" }),
  );
  const stats = model.summary(state.rows);
  const rows = model
    .qualifying(state.rows)
    .filter(
      (r: Review) =>
        state.filter === "all" || r.rating === Number(state.filter),
    ) as Review[];
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  return (
    <AppFrame title="Marketer reviews" feature="034">
      {!state.access ? (
        <Feedback title="Profile unavailable">
          This marketer is no longer available.
        </Feedback>
      ) : state.pending ? (
        <Loading
          title="Loading reviews"
          onStop={() => send({ type: "timeout" })}
        />
      ) : state.error ? (
        <Feedback
          title="Reviews could not load"
          tone="error"
          action={
            <Action onClick={() => send({ type: "check" })}>Try again</Action>
          }
        />
      ) : (
        <Columns variant="sidebar">
          <Stack>
            <Card>
              <div className={s.profile}>
                <span className={s.avatar}>MS</span>
                <div>
                  <h2>Mali S.</h2>
                  <p className={s.muted}>Survey Marketer</p>
                </div>
              </div>
              <p className={s.muted}>Campus research · Survey distribution</p>
              <p>
                I help research teams reach students with thoughtful survey
                campaigns and clear delivery reports.
              </p>
            </Card>
            <Card title="Ratings">
              {stats.average === null ? (
                <EmptyState title="No ratings yet" />
              ) : (
                <>
                  <div className={s.ratingValue}>
                    {stats.average.toFixed(2)}
                    <span className={s.muted}> / 5</span>
                  </div>
                  <p className={s.muted}>{stats.count} verified reviews</p>
                  {stats.distribution.map(([stars, count]) => (
                    <div className={s.ratingBar} key={stars}>
                      <span>{stars} ★</span>
                      <span className={s.track}>
                        <span
                          className={s.bar}
                          style={{
                            display: "block",
                            width: `${(count / stats.count) * 100}%`,
                          }}
                        />
                      </span>
                      <span>{count}</span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </Stack>
          <Card
            title="Verified reviews"
            action={
              <SelectControl
                label="Filter by rating"
                value={state.filter}
                options={[
                  { label: "All ratings", value: "all" },
                  ...[5, 4, 3, 2, 1].map((n) => ({
                    label: `${n} ${n === 1 ? "star" : "stars"}`,
                    value: String(n),
                  })),
                ]}
                onChange={(filter) => send({ type: "filter", filter })}
              />
            }
          >
            {rows.length ? (
              rows.slice((state.page - 1) * 3, state.page * 3).map((row) => (
                <article key={row.id} className={s.review} data-ui="ReviewCard">
                  <header className={s.reviewHeading}>
                    <div>
                      <h3>{row.creator}</h3>
                      <time dateTime={row.createdAt}>
                        {date(row.createdAt)}
                      </time>
                    </div>
                    <span className={s.verified}>
                      <Icon name="check" />
                      Verified
                    </span>
                  </header>
                  <p
                    className={s.stars}
                    aria-label={`${row.rating} out of 5 stars`}
                  >
                    {"★".repeat(row.rating)}
                    {"☆".repeat(5 - row.rating)}
                  </p>
                  {row.comment ? (
                    <>
                      <p className={s.reviewText}>
                        {row.comment.length > model.LONG_REVIEW_LENGTH &&
                        !state.expanded.includes(row.id)
                          ? model.reviewPreview(row.comment)
                          : row.comment}
                      </p>
                      {row.comment.length > model.LONG_REVIEW_LENGTH && (
                        <Action
                          role="quiet"
                          onClick={() =>
                            send({
                              type: "review-expansion",
                              id: row.id,
                              open: !state.expanded.includes(row.id),
                            })
                          }
                        >
                          {state.expanded.includes(row.id)
                            ? "Show less"
                            : "Read more"}
                        </Action>
                      )}
                    </>
                  ) : (
                    <p className={s.muted}>No written feedback provided.</p>
                  )}
                  <footer className={s.reviewFooter}>Job #{row.jobId}</footer>
                </article>
              ))
            ) : (
              <>
                <EmptyState
                  title={
                    state.filter === "all"
                      ? "No reviews yet"
                      : "No reviews match this rating"
                  }
                />
                {state.filter !== "all" && (
                  <Action onClick={() => send({ type: "clear-filter" })}>
                    Show all ratings
                  </Action>
                )}
              </>
            )}
            <Pagination
              page={state.page}
              pages={pages}
              onChange={(page) =>
                send({ type: page > state.page ? "next" : "previous" })
              }
            />
          </Card>
        </Columns>
      )}
    </AppFrame>
  );
}
