import {
  useId,
  useRef,
  useEffect,
  useLayoutEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
  Fragment,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import s from "./system.module.css";

export type JobStatus =
  | "Pending"
  | "Accepted"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Unverified";
export type ActionRole =
  | "primary"
  | "supporting"
  | "entry"
  | "safe"
  | "utility"
  | "quiet"
  | "destructive";
export function Icon({
  name,
  filled = false,
}: {
  name:
    | "back"
    | "close"
    | "next"
    | "check"
    | "clock"
    | "info"
    | "spinner"
    | "link"
    | "menu"
    | "refresh"
    | "warning"
    | "external"
    | "jobs"
    | "home"
    | "services"
    | "invites"
    | "profile"
    | "sun"
    | "moon"
    | "person-check"
    | "sealed-check";
  filled?: boolean;
}) {
  const paths = {
    back: "m14 6-6 6 6 6",
    close: "m5 5 14 14M5 19 19 5",
    next: "m10 6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    info: "M12 8h.01M12 11v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    spinner: "M12 3a9 9 0 1 1-9 9",
    link: "M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2",
    menu: "M3 6h18M3 12h18M3 18h18",
    refresh: "M21 10a9 9 0 1 0-2.3 8M21 4v6h-6",
    warning: "m12 3 10 18H2zM12 9v5M12 17h.01",
    external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
    jobs: "M8 4H4v18h16V4h-4M8 2h8v5H8zM8 12h8M8 17h8",
    home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
    services: "M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 11v3h4v-3",
    invites: "M3 4h18v14H8l-5 4z",
    profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-2a8 8 0 0 1 16 0v2z",
    sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
    moon: "M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z",
    "person-check":
      "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-2c0-5 14-5 14 0v2M16 10l2 2 4-5",
    "sealed-check": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M7 12l3 3 7-7",
  };
  return (
    <svg
      data-icon={name}
      width="1.125em"
      height="1.125em"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-spinner={name === "spinner" || undefined}
    >
      {filled && name === "home" ? (
        <path d="M3 10.5 12 2.5l9 8V22h-7v-8h-4v8H3z" stroke="none" />
      ) : filled && name === "profile" ? (
        <g stroke="none">
          <circle cx="12" cy="7" r="4.5" />
          <path d="M3 22c0-11 18-11 18 0z" />
        </g>
      ) : filled && name === "services" ? (
        <g strokeLinecap="butt" strokeLinejoin="miter">
          <path d="M3 6h18v16H3z" stroke="none" />
          <path d="M8 6V3h8v3" fill="none" strokeWidth="2" />
          <path
            d="M3 12h18M10 12v3h4v-3"
            fill="none"
            stroke="var(--nav-cutout, var(--surface-card))"
            strokeWidth="1.8"
          />
        </g>
      ) : filled && name === "invites" ? (
        <g strokeLinecap="butt" strokeLinejoin="miter">
          <path d="M2 3h20v16H9l-7 4z" stroke="none" />
          <path
            d="M6 8h12M6 13h8"
            stroke="var(--nav-cutout, var(--surface-card))"
            strokeWidth="1.6"
          />
        </g>
      ) : filled && name === "jobs" ? (
        <g strokeLinecap="butt" strokeLinejoin="miter">
          <path d="M4 5h16v18H4z" stroke="none" />
          <path
            d="M8 2h8v6H8z"
            stroke="var(--nav-cutout, var(--surface-card))"
            strokeWidth="1.4"
          />
          <path
            d="M8 12h8M8 17h8"
            stroke="var(--nav-cutout, var(--surface-card))"
            strokeWidth="1.8"
          />
        </g>
      ) : (
        <path d={paths[name]} />
      )}
    </svg>
  );
}
type ActionProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "onClick"
  | "disabled"
  | "type"
  | "id"
  | "aria-label"
  | "aria-expanded"
  | "aria-controls"
> & {
  children: ReactNode;
  role?: ActionRole;
  busy?: boolean;
  size?:
    | "default"
    | "list-entry"
    | "proof-entry"
    | "operation"
    | "proof-save"
    | "proof-job-entry";
};
/** Semantic action. Consumers own placement; this component owns paint and targets. */
export function Action({
  children,
  role = "utility",
  busy = false,
  disabled,
  type = "button",
  size = "default",
  ...props
}: ActionProps) {
  return (
    <button
      {...props}
      type={type}
      data-ui="Action"
      data-role={role}
      data-size={size}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={s.action}
    >
      {busy && <Icon name="spinner" />}
      {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  role = "supporting",
  size = "default",
  id,
  onClick,
}: {
  href: string;
  children: ReactNode;
  role?: ActionRole;
  size?: ActionProps["size"];
  id?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      id={id}
      className={s.action}
      data-ui="Action"
      data-role={role}
      data-size={size}
      onClick={(event) => {
        if (
          onClick &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.button === 0
        ) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </a>
  );
}
/** Job lifecycle semantics are distinct from operation outcomes and attachment tags. */
export function LifecycleBadge({ status }: { status: JobStatus }) {
  return (
    <span data-ui="LifecycleBadge" data-status={status} className={s.status}>
      <Icon
        name={
          status === "Completed"
            ? "sealed-check"
            : status === "Cancelled"
              ? "close"
              : status === "Accepted"
                ? "person-check"
                : status === "Unverified"
                  ? "warning"
                  : "clock"
        }
      />
      {status}
    </span>
  );
}
export function AttachmentTag() {
  return (
    <span data-ui="AttachmentTag" className={s.tag}>
      <Icon name="jobs" />
      Proof
    </span>
  );
}
export function VerificationBadge() {
  return (
    <span
      className={s.verification}
      data-ui="VerificationBadge"
      aria-label="Verified completed job"
      title="Review from a completed job"
    >
      <Icon name="sealed-check" />
      Verified
    </span>
  );
}
export function BackLink({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  return href ? (
    <a
      href={href}
      onClick={(event) => {
        if (
          onClick &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          onClick();
        }
      }}
      className={s.back}
      data-ui="BackLink"
    >
      <Icon name="back" />
      {children}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={s.back}
      data-ui="BackLink"
    >
      <Icon name="back" />
      {children}
    </button>
  );
}
export function CloseControl({
  onClick,
  size = "default",
}: {
  onClick: () => void;
  size?: "default" | "dialog";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={s.close}
      data-ui="CloseControl"
      data-size={size}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  );
}
export function ContentDialog({
  open,
  title,
  onClose,
  children,
  initialFocusId,
  finalFocusId,
  busy = false,
  variant = "content",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusId?: string;
  finalFocusId?: string;
  busy?: boolean;
  variant?: "content" | "job-start" | "proof-entry";
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={s.backdrop} data-ui="ContentBackdrop" />
        <Dialog.Popup
          className={s.dialog}
          data-ui="ContentDialog"
          data-variant={variant}
          aria-busy={busy || undefined}
          finalFocus={
            finalFocusId
              ? () => {
                  const target = document.getElementById(finalFocusId);
                  if (!target) return true;
                  // Source return targets use native focus scrolling. Base UI's
                  // default restoration suppresses it and can leave this control
                  // outside the viewport after a short/enlarged dialog closes.
                  target.focus();
                  return false;
                }
              : undefined
          }
          initialFocus={() => {
            const popup = heading.current?.closest('[role="dialog"]');
            const explicit = initialFocusId
              ? document.getElementById(initialFocusId)
              : null;
            const validExplicit =
              explicit &&
              popup?.contains(explicit) &&
              !explicit.matches(":disabled");
            // The source's explicit "View progress" action returns to its
            // retained URL, even in an overflowing proof dialog. Initial
            // pending/overflow presentation still begins at the heading.
            if (
              validExplicit &&
              variant === "proof-entry" &&
              explicit instanceof HTMLInputElement
            )
              return explicit;
            // Keep the beginning readable when enlarged content overflows.
            // Focusing a footer action would otherwise scroll the title away.
            if (popup && popup.scrollHeight > popup.clientHeight + 1)
              return heading.current;
            if (validExplicit) return explicit;
            if (busy) return heading.current;
            return (
              heading.current
                ?.closest('[role="dialog"]')
                ?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
              (variant === "proof-entry"
                ? heading.current
                    ?.closest('[role="dialog"]')
                    ?.querySelector<HTMLElement>("input")
                : null) ??
              heading.current
            );
          }}
        >
          <div className={s.dialogHeading}>
            <Dialog.Title ref={heading} tabIndex={-1}>
              {title}
            </Dialog.Title>
            <CloseControl onClick={onClose} size="dialog" />
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function SelectControl({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className={s.select}
      aria-label={label}
      data-ui="Select"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
export function Field({
  id: providedId,
  label,
  value,
  error,
  onChange,
  readOnly = false,
}: {
  id?: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const input = useRef<HTMLInputElement>(null);
  const previousError = useRef(error);
  useLayoutEffect(() => {
    // Match a freshly parsed URL field without resetting the user's caret on edits.
    input.current?.setSelectionRange(0, 0);
    if (input.current) input.current.scrollLeft = 0;
  }, []);
  useEffect(() => {
    // Initial dialog focus belongs to ContentDialog, especially when it overflows.
    // Validation introduced by a later submission still targets the field.
    if (error && error !== previousError.current) input.current?.focus();
    previousError.current = error;
  }, [error]);
  return (
    <div className={s.field} data-ui="Field">
      <label htmlFor={id}>{label}</label>
      <input
        ref={input}
        id={id}
        type="url"
        inputMode="url"
        autoComplete="url"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder="https://…"
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
      />
      {error && (
        <p className={s.error} id={id + "-error"} role="alert">
          <Icon name="warning" />
          {error}
        </p>
      )}
    </div>
  );
}
export function Feedback({
  title,
  children,
  tone = "info",
  action,
  pending = false,
  variant = "default",
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  action?: ReactNode;
  pending?: boolean;
  variant?: "default" | "jobs" | "proof";
}) {
  return (
    <section
      data-ui="RecoveryPanel"
      data-variant={variant}
      className={s.recovery}
    >
      <div
        role={tone === "error" ? "alert" : "status"}
        className={s.feedback}
        data-tone={tone}
      >
        <Icon
          name={
            pending
              ? "spinner"
              : tone === "success"
                ? "check"
                : tone === "info"
                  ? "info"
                  : "warning"
          }
        />
        <div>
          {title && <h2>{title}</h2>}
          {children && <div className={s.feedbackCopy}>{children}</div>}
        </div>
      </div>
      {action && <div className={s.recoveryAction}>{action}</div>}
    </section>
  );
}
export function EmptyState({
  title,
  children,
  variant = "default",
  action,
}: {
  title: string;
  children?: ReactNode;
  variant?: "default" | "proof" | "delivery" | "jobs" | "reviews" | "rating";
  action?: ReactNode;
}) {
  if (variant === "reviews")
    return (
      <div
        data-ui="EmptyState"
        data-variant={variant}
        className={s.reviewEmpty}
      >
        <div className={s.reviewEmptyHeading}>
          <Icon name="invites" />
          <h3>{title}</h3>
        </div>
        {children && <p>{children}</p>}
        {action && <div className={s.emptyActions}>{action}</div>}
      </div>
    );
  if (variant === "rating")
    return (
      <div
        data-ui="EmptyState"
        data-variant={variant}
        className={s.ratingEmpty}
      >
        <Icon name="profile" />
        <h3>{title}</h3>
        {children && <p>{children}</p>}
      </div>
    );
  return (
    <div
      className={s.empty}
      data-ui="EmptyState"
      data-description={!!children}
      data-variant={variant}
    >
      <span className={s.emptyIcon}>
        <Icon name={variant === "default" ? "link" : "jobs"} />
      </span>
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
        {action && <div className={s.emptyActions}>{action}</div>}
      </div>
    </div>
  );
}
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" data-ui="Pagination" className={s.pagination}>
      {page > 1 && (
        <button
          className={s.pager}
          aria-label="Previous"
          onClick={() => onChange(page - 1)}
        >
          <Icon name="back" />
        </button>
      )}
      <span>{`Page ${page} of ${pages}`}</span>
      {page < pages && (
        <button
          className={s.pager}
          aria-label="Next"
          onClick={() => onChange(page + 1)}
        >
          <Icon name="next" />
        </button>
      )}
    </nav>
  );
}
/** Named navigation within content; keeps visited links in the semantic palette. */
export function InlineLink({
  href,
  children,
  external = false,
  externalIcon = true,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  externalIcon?: boolean;
}) {
  return (
    <a
      href={href}
      className={s.inlineLink}
      data-ui="InlineLink"
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
      {external && (
        <>
          {externalIcon && <Icon name="external" />}
          <span className={s.srOnly}> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}
export function ProofLink({
  url,
  variant = "task",
}: {
  url: string;
  variant?: "task" | "proof";
}) {
  const parsed = new URL(url);
  const tail = (parsed.pathname + parsed.search + parsed.hash).replace(
    /^\/$/,
    "",
  );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={s.proofLink}
      data-ui="ProofLink"
      data-variant={variant}
      title={parsed.href}
      aria-label={`${parsed.href} (opens in a new tab)`}
    >
      <span className={s.proofHost}>
        {`${parsed.protocol}//${parsed.host}`}
      </span>
      <Icon name="external" />
      {tail && (
        <span className={s.proofPath}>
          {tail.split(/(?<=[/\-?&])/).map((text, index) => (
            <Fragment key={index}>
              {text}
              {/[/\-?&]$/.test(text) && <wbr />}
            </Fragment>
          ))}
        </span>
      )}
    </a>
  );
}
export function LongTextDisclosure({
  text,
  preview,
  expanded,
  onToggle,
}: {
  text: string;
  preview: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const long = preview !== text;
  return (
    <div data-ui="LongTextDisclosure" className={s.disclosure}>
      {(!long || !expanded) && (
        <p className={s.disclosureText} data-preview={long}>
          {long ? preview : text}
        </p>
      )}
      {long && (
        <details
          open={expanded}
          onToggle={(event) => {
            if (event.currentTarget.open !== expanded) onToggle();
          }}
        >
          <summary aria-controls={id}>
            {expanded ? "Show less" : "Read full review"}
          </summary>
          <p id={id} className={s.disclosureText}>
            {text}
          </p>
        </details>
      )}
    </div>
  );
}
export function Loading({
  title,
  onStop,
  kind = "completion",
}: {
  title: string;
  onStop: () => void;
  kind?: "completion" | "cancellation" | "proof" | "reviews";
}) {
  const lines = (
    <div className={s.loadingLines} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
  const operation = (
    <OperationNotice
      title={title}
      action={
        <Action size="operation" onClick={onStop}>
          Stop waiting
        </Action>
      }
    />
  );
  return (
    <div
      className={s.loadingLayout}
      data-ui="Loading"
      data-kind={kind}
      aria-busy="true"
    >
      {kind === "reviews" ? (
        <>
          <div className={s.loadingContext}>
            <section className={s.loadingCard}>
              {operation}
              {lines}
            </section>
            <section className={s.loadingCard}>{lines}</section>
          </div>
          <section className={s.loadingCard} data-shape="history">
            {lines}
            {lines}
            {lines}
          </section>
        </>
      ) : (
        (kind === "proof" ? ["proof"] : ["summary", "task", "context"]).map(
          (shape, index) => (
            <section key={shape} className={s.loadingCard}>
              {index === 0 && operation}
              {lines}
            </section>
          ),
        )
      )}
    </div>
  );
}
export function OperationNotice({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <section className={s.operationNotice} data-ui="OperationNotice">
      <div className={s.operationMessage} role="status">
        <Icon name="spinner" />
        <strong>{title}</strong>
      </div>
      {action && <div className={s.operationActions}>{action}</div>}
    </section>
  );
}
export function JobsLoading({ detail = false }: { detail?: boolean }) {
  const cards = (
    <div className={s.jobsLoadingStack} data-detail={detail} aria-hidden="true">
      {Array.from({ length: detail ? 2 : 3 }, (_, index) => (
        <div className={s.jobsLoadingCard} key={index}>
          {Array.from({ length: detail && index === 1 ? 2 : 3 }, (_, line) => (
            <div className={s.jobsLoadingLine} key={line} />
          ))}
        </div>
      ))}
    </div>
  );
  const label = (
    <p className={s.jobsLoadingLabel} role="status">
      <Icon name="spinner" />
      {detail ? "Checking job details…" : "Loading jobs…"}
    </p>
  );
  return (
    <div data-ui="JobsLoading">
      {!detail && label}
      {cards}
      {detail && label}
    </div>
  );
}
