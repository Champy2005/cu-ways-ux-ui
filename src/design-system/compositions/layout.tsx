import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import {
  Action,
  BackLink,
  AttachmentTag,
  ProofLink,
  Icon,
  LifecycleBadge,
  type JobStatus,
} from "../components/primitives";
import s from "./layout.module.css";
import { useTheme } from "../ThemeProvider";
export function ProofRecord({
  url,
  timestamp,
}: {
  url: string;
  timestamp: string;
}) {
  return (
    <article className={s.proofRecord} data-ui="ProofRecord">
      <AttachmentTag />
      <ProofLink url={url} />
      <p className={s.timestamp}>{timestamp}</p>
    </article>
  );
}
export function Card({
  title,
  children,
  action,
  boundary = "Card",
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  boundary?:
    | "Card"
    | "ProofWorkspace"
    | "CompletionRequirements"
    | "CancellationEffects"
    | "ContractSummary"
    | "DeliveryEvidence"
    | "ReviewHistory";
}) {
  return (
    <section className={s.card} data-ui={boundary}>
      {(title || action) && (
        <header className={s.cardHead}>
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function StatusHeading({
  title,
  context,
  status,
  level = 2,
  compact = false,
}: {
  title: string;
  context?: string;
  status?: JobStatus;
  level?: 1 | 2;
  compact?: boolean;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={s.statusHeading} data-ui="StatusHeading">
      <div>
        {context && <p className={s.context}>{context}</p>}
        <Heading className={compact ? s.compactTitle : undefined}>
          {title}
        </Heading>
      </div>
      {status && <LifecycleBadge status={status} />}
    </div>
  );
}
export function ConfirmationActions({
  safe,
  commit,
  variant = "confirmation",
}: {
  safe: ReactNode;
  commit: ReactNode;
  variant?: "confirmation" | "recovery";
}) {
  return (
    <div
      className={s.confirmation}
      data-ui="ConfirmationActions"
      data-variant={variant}
    >
      {safe}
      {commit}
    </div>
  );
}
export function Stack({ children }: { children: ReactNode }) {
  return <div className={s.stack}>{children}</div>;
}
export function Columns({
  children,
  variant = "task",
}: {
  children: ReactNode;
  variant?: "task" | "sidebar";
}) {
  return (
    <div className={s.columns} data-layout={variant}>
      {children}
    </div>
  );
}
export function Metadata({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className={s.metadata}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function JobSummary({
  title,
  context,
  status,
  items,
  action,
}: {
  title: string;
  context: string;
  status: JobStatus;
  items: { label: string; value: ReactNode }[];
  action: ReactNode;
}) {
  return (
    <article className={s.card} data-ui="JobSummary">
      <StatusHeading title={title} context={context} status={status} compact />
      <div className={s.jobSummaryBody}>
        <Metadata items={items} />
        {action}
      </div>
    </article>
  );
}
export function AppFrame({
  title,
  children,
  onBack,
  backLabel = "Story library",
  feature,
  busy = false,
  headingAction,
  action,
}: {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  feature: string;
  busy?: boolean;
  headingAction?: ReactNode;
  action?: ReactNode;
}) {
  const [menu, setMenu] = useState(false),
    [roleMenu, setRoleMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null),
    roleButton = useRef<HTMLButtonElement>(null),
    frame = useRef<HTMLDivElement>(null),
    dock = useRef<HTMLDivElement>(null);
  const { theme, material, toggle } = useTheme();
  const destination = (id: string) =>
    "?id=us" + id + "--" + (id === "025" ? "l-02" : "a-01") + "&viewMode=story";
  const nav = [
    { id: "025", label: "My Jobs", icon: "jobs" },
    { id: "026", label: "Proof", icon: "services" },
    { id: "027", label: "Completion", icon: "invites" },
    { id: "028", label: "Cancellation", icon: "close" },
    { id: "034", label: "Reviews", icon: "profile" },
  ] as const;
  const mobile = [
    { id: "025", label: "Home", icon: "home" },
    { id: "026", label: "Services", icon: "services" },
    { id: "025", label: "Jobs", icon: "jobs" },
    { id: "027", label: "Invites", icon: "invites" },
    { id: "034", label: "Profile", icon: "profile" },
  ] as const;
  useLayoutEffect(() => {
    const measure = () => {
      if (frame.current && dock.current)
        frame.current.style.setProperty(
          "--dock-height",
          dock.current.getBoundingClientRect().height + "px",
        );
    };
    const observer = new ResizeObserver(measure);
    if (dock.current) observer.observe(dock.current);
    measure();
    return () => observer.disconnect();
  }, []);
  const dismissMenu = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setMenu(false);
      setRoleMenu(false);
      (roleMenu ? roleButton : menuButton).current?.focus();
    }
  };
  return (
    <div className={s.frame} data-ui="ApplicationFrame" ref={frame}>
      <header
        className={s.header}
        data-ui="ApplicationHeader"
        data-material={material}
        data-menu-open={menu || roleMenu}
      >
        <a
          className={s.brand}
          href={destination("025")}
          aria-label="CU Ways home"
        >
          <img
            src={"/assets/logo-" + theme + ".svg"}
            alt="CU Ways"
            width="140"
            height="38"
          />
        </a>
        <nav aria-label="Main navigation" className={s.desktop}>
          {nav.map(({ id, label, icon }) => (
            <a
              key={id}
              aria-current={feature === id ? "page" : undefined}
              href={destination(id)}
            >
              <Icon name={icon} filled={feature === id} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className={s.tools}>
          <button
            type="button"
            className={s.headerControl}
            aria-label={
              "Switch to " + (theme === "light" ? "dark" : "light") + " theme"
            }
            onClick={toggle}
          >
            <Icon name={theme === "light" ? "sun" : "moon"} />
          </button>
          <button
            type="button"
            className={s.headerControl}
            aria-label="Workspace role"
            ref={roleButton}
            aria-expanded={roleMenu}
            onClick={() => {
              setRoleMenu(!roleMenu);
              setMenu(false);
            }}
          >
            <img
              src={"/assets/birds-" + theme + ".svg"}
              alt=""
              width="51"
              height="39"
            />
          </button>
          <button
            type="button"
            ref={menuButton}
            className={s.menuToggle}
            aria-label="Menu"
            aria-expanded={menu}
            onClick={() => {
              setMenu(!menu);
              setRoleMenu(false);
            }}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
        {menu && (
          <nav
            className={s.dropdown}
            aria-label="Mobile menu"
            onKeyDown={dismissMenu}
          >
            {nav.map(({ id, label }) => (
              <a key={id} href={destination(id)}>
                {label}
              </a>
            ))}
          </nav>
        )}
        {roleMenu && (
          <nav
            className={s.dropdown}
            aria-label="Workspace role"
            onKeyDown={dismissMenu}
          >
            <a href={destination("025")}>Marketer workspace</a>
            <a href={destination("027")}>Creator workspace</a>
          </nav>
        )}
      </header>
      <main className={s.main} data-ui="Page" aria-busy={busy || undefined}>
        <BackLink
          onClick={
            onBack ??
            (() => {
              window.location.href = destination("025");
            })
          }
        >
          {backLabel}
        </BackLink>
        <div className={s.pageHeading} data-ui="PageHeading">
          <h1 id="page-heading" tabIndex={-1}>
            {title}
          </h1>
          {headingAction}
        </div>
        <div className={s.stack}>{children}</div>
      </main>
      <div
        className={s.dock}
        ref={dock}
        data-ui="ApplicationDock"
        data-material={material}
      >
        {action && (
          <div
            className={s.actionTray}
            data-ui="ActionTray"
            role="group"
            aria-label="Job start action"
          >
            {action}
          </div>
        )}
        <nav
          className={s.bottom}
          aria-label="Bottom navigation"
          data-ui="BottomNavigation"
        >
          {mobile.map(({ id, label, icon }) => {
            const active = feature === id && label !== "Home";
            return (
              <a
                key={label}
                aria-current={active ? "page" : undefined}
                href={destination(id)}
              >
                <Icon name={icon} filled={active} />
                <span>{label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
export function OperationProgress({
  onReopen,
  onCheck,
}: {
  onReopen?: () => void;
  onCheck: () => void;
}) {
  return (
    <div className={s.operation} role="status">
      <span>Request in progress</span>
      {onReopen && (
        <Action id="view-progress" role="utility" onClick={onReopen}>
          View progress
        </Action>
      )}
      <Action role="safe" onClick={onCheck}>
        Check status
      </Action>
    </div>
  );
}
