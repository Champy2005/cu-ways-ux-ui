import {
  useId,
  useRef,
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
    | "external";
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
  };
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
type ActionProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "disabled" | "type" | "id" | "aria-label"
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
            ? "check"
            : status === "Cancelled"
              ? "close"
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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
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
          initialFocus={heading}
        >
          <header className={s.dialogHeading}>
            <Dialog.Title ref={heading} tabIndex={-1}>
              {title}
            </Dialog.Title>
            <CloseControl onClick={onClose} />
          </header>
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
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <input
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
    <div className={s.empty} data-ui="EmptyState">
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
export function ProofLink({ url }: { url: string }) {
  const parsed = new URL(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={s.proofLink}
      data-ui="InlineLink"
    >
      <span>
        <strong>{parsed.host}</strong>
        <span>{decodeURI(parsed.pathname)}</span>
      </span>
      <Icon name="external" />
      <span className={s.srOnly}> (opens in a new tab)</span>
    </a>
  );
}
export function Loading({
  title,
  onStop,
}: {
  title: string;
  onStop: () => void;
}) {
  return (
    <section className={s.loading} data-ui="Loading" aria-busy="true">
      <div role="status">
        <Icon name="clock" /> {title}
      </div>
      <div className={s.skeleton} />
      <div className={s.skeleton} />
      <Action role="safe" onClick={onStop}>
        Stop waiting
      </Action>
    </section>
  );
}
