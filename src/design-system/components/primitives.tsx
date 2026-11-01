import {
  useId,
  useRef,
  useEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import s from "./system.module.css";

export type JobStatus =
  | "Pending"
  | "Accepted"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Unverified";
export type ActionRole =
  "primary" | "supporting" | "safe" | "utility" | "quiet" | "destructive";
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
    close: "m6 6 12 12M6 18 18 6",
    next: "m10 6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    link: "M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2",
    menu: "M3 6h18M3 12h18M3 18h18",
    refresh: "M21 10a9 9 0 1 0-2 8M21 4v6h-6",
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
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
      {filled && ["jobs", "services", "invites"].includes(name) && (
        <path
          d={
            name === "jobs"
              ? "M8 12h8M8 17h8"
              : name === "services"
                ? "M3 12h18M10 12v3h4v-3"
                : "M6 8h12M6 13h8"
          }
          fill="none"
          stroke="var(--nav-cutout, var(--surface-card))"
        />
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
> & { children: ReactNode; role?: ActionRole; busy?: boolean };
/** Semantic action. Consumers own placement; this component owns paint and targets. */
export function Action({
  children,
  role = "utility",
  busy = false,
  disabled,
  type = "button",
  ...props
}: ActionProps) {
  return (
    <button
      {...props}
      type={type}
      data-ui="Action"
      data-role={role}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={s.action}
    >
      {busy && <Icon name="clock" />}
      {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  role = "supporting",
}: {
  href: string;
  children: ReactNode;
  role?: ActionRole;
}) {
  return (
    <a href={href} className={s.action} data-ui="Action" data-role={role}>
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
      <Icon name="link" />
      Proof
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
    <a href={href} className={s.back} data-ui="BackLink">
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
export function CloseControl({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={s.close}
      data-ui="CloseControl"
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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusId?: string;
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
        <Dialog.Backdrop className={s.backdrop} />
        <Dialog.Popup
          className={s.dialog}
          data-ui="ContentDialog"
          initialFocus={() =>
            (initialFocusId ? document.getElementById(initialFocusId) : null) ??
            heading.current
              ?.closest('[role="dialog"]')
              ?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
            heading.current
          }
        >
          <div className={s.dialogHeading}>
            <Dialog.Title ref={heading} tabIndex={-1}>
              {title}
            </Dialog.Title>
            <CloseControl onClick={onClose} />
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
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={options}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <Select.Trigger className={s.select} aria-label={label} data-ui="Select">
        <Select.Value />
        <Select.Icon>▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className={s.positioner}
        >
          <Select.Popup className={s.options}>
            {options.map((o) => (
              <Select.Item key={o.value} value={o.value} className={s.option}>
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator>✓</Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
export function Field({
  label,
  value,
  error,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (error) input.current?.focus();
  }, [error]);
  return (
    <div className={s.field} data-ui="Field">
      <label htmlFor={id}>{label}</label>
      <input
        ref={input}
        id={id}
        type="url"
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
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  action?: ReactNode;
}) {
  return (
    <section data-ui="RecoveryPanel" className={s.recovery}>
      <div role="status" className={s.feedback} data-tone={tone}>
        <Icon
          name={
            tone === "success" ? "check" : tone === "info" ? "clock" : "warning"
          }
        />
        <div>
          <h2>{title}</h2>
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
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.empty} data-ui="EmptyState" data-description={!!children}>
      <span className={s.emptyIcon}>
        <Icon name="link" />
      </span>
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
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
      <span>
        Page {page} of {pages}
      </span>
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
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
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
          <Icon name="external" />
          <span className={s.srOnly}> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}
export function ProofLink({ url }: { url: string }) {
  const parsed = new URL(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${s.inlineLink} ${s.proofLink}`}
      data-ui="ProofLink"
    >
      <span>
        <strong>
          {parsed.protocol}//{parsed.host}
        </strong>
        <span>
          {parsed.pathname}
          {parsed.search}
          {parsed.hash}
        </span>
      </span>
      <Icon name="external" />
      <span className={s.srOnly}> (opens in a new tab)</span>
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
  return (
    <div data-ui="LongTextDisclosure">
      <p id={id} className={s.disclosureText}>
        {expanded ? text : preview}
      </p>
      {preview !== text && (
        <Action
          role="quiet"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={onToggle}
        >
          {expanded ? "Show less" : "Read more"}
        </Action>
      )}
    </div>
  );
}
export function Loading({
  title,
  onStop,
  rows = 2,
}: {
  title: string;
  onStop: () => void;
  rows?: 2 | 3;
}) {
  return (
    <section className={s.loading} data-ui="Loading" aria-busy="true">
      <div role="status">
        <Icon name="clock" /> {title}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={s.skeleton} aria-hidden="true" />
      ))}
      <Action role="safe" onClick={onStop}>
        Stop waiting
      </Action>
    </section>
  );
}
