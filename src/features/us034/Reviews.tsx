import { WorkbenchFrame as AppFrame } from "../shared/WorkbenchFrame";
import { useReducer } from "react";
import {
  Action,
  EmptyState,
  Feedback,
  Loading,
  LongTextDisclosure,
  Pagination,
  SelectControl,
  VerificationBadge,
  Icon,
} from "../../design-system/components/primitives";
import { Card, Columns, Stack } from "../../design-system/compositions/layout";
import * as model from "./model.mjs";
import { date, useOperation, type Timing } from "../shared/operations";
import s from "./reviews.module.css";
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
  long?: boolean;
};
export function Reviews({
  scenario = "A01",
  timing = "hold",
  fixture = "standard",
}: {
  scenario?: string;
  timing?: Timing;
  fixture?: "standard" | "long";
}) {
  const [state, send] = useReducer(
    (s: ReviewState, e: { type: string; [key: string]: unknown }) =>
      model.reduce(s, e) as ReviewState,
    scenario,
    (id) => model.seed(id) as ReviewState,
  );
  useOperation(
    state.pending,
    timing,
    () => send({ type: "resolve", read: "success" }),
    () => send({ type: "timeout" }),
  );
  return (
    <ReviewsView state={{ ...state, long: fixture === "long" }} send={send} />
  );
}
export function ReviewsView({
  state,
  send,
}: {
  state: ReviewState;
  send: (event: { type: string; [key: string]: unknown }) => void;
}) {
  const stats = model.summary(state.rows);
  const rows = model
    .qualifying(state.rows)
    .filter(
      (r: Review) =>
        state.filter === "all" || r.rating === Number(state.filter),
    ) as Review[];
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  const profile = (
    <Card>
      <div className={s.profile}>
        <span className={s.avatar} aria-hidden="true">
          MS
        </span>
        <div className={s.profileIdentity}>
          <h2 className={s.profileName}>
            {state.long
              ? "Mali Sirichulalongkorn — มาลี ศิริจุฬาลงกรณ์"
              : "Mali S."}
          </h2>
          <p className={s.profileRole}>Survey Marketer</p>
        </div>
      </div>
      <p className={s.specialties}>Campus research · Survey distribution</p>
      <p className={s.bio}>
        I help research teams reach students with thoughtful survey campaigns
        and clear delivery reports.
      </p>
    </Card>
  );
  return (
    <AppFrame title="Marketer reviews" feature="034">
      {!state.access ? (
        <Card title="Profile unavailable">
          <p className={s.unavailableCopy}>This profile is not available.</p>
        </Card>
      ) : state.pending ? (
        <Loading
          kind="reviews"
          title="Loading reviews"
          onStop={() => send({ type: "timeout" })}
        />
      ) : state.error ? (
        <>
          {profile}
          <div className={s.notice}>
            <Feedback
              title="Reviews could not load"
              tone="error"
              action={
                <Action onClick={() => send({ type: "check" })}>
                  <Icon name="refresh" />
                  Try again
                </Action>
              }
            >
              Try again to load ratings and reviews.
            </Feedback>
          </div>
        </>
      ) : (
        <Columns variant="sidebar">
          <Stack>
            {profile}
            <Card title="Ratings">
              {stats.average === null ? (
                <EmptyState title="No ratings yet" variant="rating">
                  Ratings appear after the first completed-job review.
                </EmptyState>
              ) : (
                <>
                  <div className={s.ratingSummary}>
                    <div className={s.ratingValue}>
                      <span className={s.ratingNumber}>
                        {stats.average.toFixed(2)}
                      </span>
                      <span className={s.muted}> / 5</span>
                      <p className={s.ratingTotal}>
                        {stats.count} verified reviews
                      </p>
                    </div>
                    <div
                      className={s.distribution}
                      aria-label="Rating distribution"
                    >
                      {stats.distribution.map(([stars, count]) => (
                        <div className={s.ratingBar} key={stars}>
                          <span className={s.ratingLevel}>
                            {stars}
                            <span className={s.levelStar} aria-hidden="true">
                              ★
                            </span>
                          </span>
                          <progress
                            className={s.ratingProgress}
                            max={stats.count}
                            value={count}
                            aria-label={`${stars} stars: ${count} reviews`}
                          />
                          <span className={s.ratingCount}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </Stack>
          <Card
            boundary="ReviewHistory"
            title="Verified reviews"
            description={
              state.filter !== "all"
                ? `${rows.length} of ${model.qualifying(state.rows).length} reviews`
                : undefined
            }
            action={
              model.qualifying(state.rows).length ? (
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
              ) : undefined
            }
          >
            <div className={rows.length ? s.reviewList : undefined}>
              {rows.length ? (
                rows.slice((state.page - 1) * 3, state.page * 3).map((row) => (
                  <article
                    key={row.id}
                    className={s.review}
                    data-ui="ReviewCard"
                  >
                    <header className={s.reviewHeading}>
                      <div className={s.author}>
                        <strong className={s.authorName}>{row.creator}</strong>
                        <time className={s.reviewTime} dateTime={row.createdAt}>
                          {date(row.createdAt)}
                        </time>
                      </div>
                      <VerificationBadge />
                    </header>
                    <p
                      className={s.stars}
                      aria-label={`${row.rating} out of 5 stars`}
                    >
                      {"★".repeat(row.rating)}
                      {"☆".repeat(5 - row.rating)}
                    </p>
                    {row.comment ? (
                      <LongTextDisclosure
                        text={row.comment}
                        preview={
                          row.comment.length > model.LONG_REVIEW_LENGTH
                            ? model.reviewPreview(row.comment)
                            : row.comment
                        }
                        expanded={state.expanded.includes(row.id)}
                        onToggle={() =>
                          send({
                            type: "review-expansion",
                            id: row.id,
                            open: !state.expanded.includes(row.id),
                          })
                        }
                      />
                    ) : (
                      <p className={s.noComment}>No written feedback.</p>
                    )}
                    <footer className={s.reviewFooter}>Job #{row.jobId}</footer>
                  </article>
                ))
              ) : (
                <>
                  <EmptyState
                    variant="reviews"
                    title={
                      state.filter === "all"
                        ? "No reviews yet"
                        : "No reviews match this rating"
                    }
                    action={
                      state.filter !== "all" ? (
                        <Action
                          role="quiet"
                          onClick={() => send({ type: "clear-filter" })}
                        >
                          Show all ratings
                        </Action>
                      ) : undefined
                    }
                  >
                    {state.filter === "all"
                      ? "Completed-job reviews will appear here."
                      : undefined}
                  </EmptyState>
                </>
              )}
            </div>
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
