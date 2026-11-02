import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import {
  Action,
  BackLink,
  AttachmentTag,
  ProofLink,
  Icon,
  LifecycleBadge,
  OperationNotice,
  type JobStatus,
} from "../components/primitives";
import s from "./layout.module.css";
import { useTheme } from "../ThemeProvider";
import { Artwork } from "../components/Artwork";
export function ProofRecord({
  url,
  timestamp,
  variant = "task",
}: {
  url: string;
  timestamp: string;
  variant?: "task" | "proof";
}) {
  return (
    <article
      className={s.proofRecord}
      data-ui="ProofRecord"
      data-variant={variant}
    >
      <AttachmentTag />
      <ProofLink url={url} variant={variant} />
      <p className={s.timestamp}>{timestamp}</p>
    </article>
  );
}
export function Card({
  title,
  description,
  children,
  action,
  boundary = "Card",
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  boundary?:
    | "Card"
    | "ProofWorkspace"
    | "CompletionRequirements"
    | "CancellationEffects"
    | "ContractSummary"
    | "DeliveryEvidence"
    | "ReviewHistory"
    | "EntitySummary"
    | "JobEntry"
    | "JobsEmpty";
}) {
  return (
    <section className={s.card} data-ui={boundary}>
      {(title || action) && (
        <header className={s.cardHead}>
          {title &&
            (description ? (
              <div>
                <h2>{title}</h2>
                <p className={s.cardDescription}>{description}</p>
              </div>
            ) : (
              <h2>{title}</h2>
            ))}
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
  variant?: "confirmation" | "recovery" | "job-start";
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
export function UnavailableState({
  title,
  children,
  action,
  variant = "detail",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  variant?: "detail" | "proof";
}) {
  return (
    <section
      className={s.unavailableCard}
      data-ui="UnavailableState"
      data-variant={variant}
    >
      {variant === "proof" && (
        <div className={s.unavailableMark}>
          <Icon name="jobs" />
        </div>
      )}
      {variant === "proof" ? <h1>{title}</h1> : <h2>{title}</h2>}
      <p>{children}</p>
      {action && <div className={s.unavailableActions}>{action}</div>}
    </section>
  );
}
export function Columns({
  children,
  variant = "task",
}: {
  children: ReactNode;
  variant?: "task" | "sidebar" | "single";
}) {
  return (
    <div className={s.columns} data-layout={variant} data-ui="Columns">
      {children}
    </div>
  );
}
export function Metadata({
  items,
  variant = "summary",
}: {
  items: { label: string; value: ReactNode }[];
  variant?: "summary" | "rows" | "dialog";
}) {
  return (
    <dl className={s.metadata} data-variant={variant}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Requirement({
  met,
  label,
  description,
}: {
  met: boolean;
  label: string;
  description?: string;
}) {
  return (
    <li className={s.requirement} data-ui="Requirement" data-met={met}>
      <Icon name={met ? "check" : "warning"} />
      <div>
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>
    </li>
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
    <article className={s.jobCard} data-ui="JobSummary">
      <div className={s.jobCardHeading}>
        <div>
          <span className={s.jobIdentity}>{context}</span>
        </div>
        <LifecycleBadge status={status} />
      </div>
      <div className={s.jobCardCopy}>
        <h2 className={s.jobTitle}>
          <span className={s.screenReader}>{context} · </span>
          {title}
        </h2>
        <dl className={s.jobFacts}>
          {items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={s.jobEntry}>{action}</div>
    </article>
  );
}
export type NavigationItem = {
  id: string;
  label: string;
  href?: string;
  icon: Parameters<typeof Icon>[0]["name"];
};
export function AppFrame({
  title,
  children,
  onBack,
  backLabel = "Back",
  activeKey,
  mobileActiveKey = activeKey,
  navigation,
  mobileNavigation = navigation,
  brandHref = navigation[0]?.href ?? "#",
  workspaceLinks = [],
  busy = false,
  headingAction,
  action,
  showBack = true,
  actionHidden = false,
  kind = "story",
  headingStatus,
  headingDescription,
  showHeading = true,
}: {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  activeKey?: string;
  mobileActiveKey?: string;
  navigation: NavigationItem[];
  mobileNavigation?: NavigationItem[];
  brandHref?: string;
  workspaceLinks?: { label: string; href: string }[];
  busy?: boolean;
  headingAction?: ReactNode;
  action?: ReactNode;
  showBack?: boolean;
  actionHidden?: boolean;
  kind?: "jobs" | "proof" | "story";
  headingStatus?: JobStatus;
  headingDescription?: ReactNode;
  showHeading?: boolean;
}) {
  const [menu, setMenu] = useState(false),
    [roleMenu, setRoleMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null),
    roleButton = useRef<HTMLButtonElement>(null),
    frame = useRef<HTMLDivElement>(null),
    dock = useRef<HTMLDivElement>(null);
  const { theme, material, textScale, toggle } = useTheme();
  const nav = navigation,
    mobile = mobileNavigation;
  useLayoutEffect(() => {
    const measure = () => {
      if (frame.current) {
        frame.current.dataset.compactChrome = String(
          innerWidth < 1024 || textScale !== 100,
        );
        frame.current.dataset.chromeLayout = "fixed";
      }
      const nav = dock.current?.querySelector<HTMLElement>(
        '[data-ui="BottomNavigation"]',
      );
      if (nav && nav.clientWidth) {
        const items = [...nav.querySelectorAll<HTMLElement>("a")],
          style = getComputedStyle(nav);
        const available =
          nav.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight);
        const caption = Math.max(
          ...items.map(
            (item) =>
              item.querySelector("span")?.getBoundingClientRect().width ?? 0,
          ),
        );
        const target =
          parseFloat(getComputedStyle(items[0]).minInlineSize) || 44;
        const maximum = Math.max(
          1,
          Math.min(
            items.length,
            Math.floor(available / Math.max(target, caption + 2)),
          ),
        );
        const rows = Math.ceil(items.length / maximum),
          columns = Math.ceil(items.length / rows);
        nav.style.setProperty("--nav-columns", String(columns));
      }
      if (frame.current && dock.current) {
        const host = frame.current,
          tray = host.querySelector<HTMLElement>('[data-ui="ActionTray"]'),
          main = host.querySelector<HTMLElement>('[data-ui="Page"]'),
          header = host.querySelector<HTMLElement>(
            '[data-ui="ApplicationHeader"]',
          );
        const visible = (element: HTMLElement | null) =>
          element && getComputedStyle(element).display !== "none"
            ? element.getBoundingClientRect().height
            : 0;
        const navHeight = visible(dock.current),
          font = parseFloat(
            getComputedStyle(document.documentElement).fontSize,
          ),
          trayHeight = visible(tray);
        const start =
          kind === "jobs"
            ? main?.querySelector<HTMLElement>(
                '[data-ui="RecoveryPanel"],[data-ui="OperationNotice"],[data-ui="JobSummary"],[data-ui="JobsEmpty"]',
              )
            : main?.querySelector<HTMLElement>(
                '[data-ui="PageHeading"] + div > :first-child',
              );
        const leadIn =
          navHeight && start && main
            ? Math.max(
                0,
                start.getBoundingClientRect().top -
                  main.getBoundingClientRect().top,
              )
            : 0;
        const flow =
          kind === "proof"
            ? innerHeight < 500 ||
              (Number(document.documentElement.dataset.textScale) >= 150 &&
                innerHeight < 640)
            : visible(header) +
                navHeight +
                (trayHeight ? trayHeight + font * 0.75 : 0) +
                leadIn +
                font * (kind === "jobs" ? 6 : 8) >
              innerHeight;
        host.dataset.chromeLayout = flow ? "flow" : "fixed";
        frame.current.style.setProperty(
          "--dock-height",
          `${flow ? 0 : navHeight + (trayHeight ? trayHeight + font * 0.75 : 0)}px`,
        );
      }
    };
    const observer = new ResizeObserver(measure);
    const bottom = dock.current?.querySelector('[data-ui="BottomNavigation"]');
    if (bottom) observer.observe(bottom);
    const header = frame.current?.querySelector(
      '[data-ui="ApplicationHeader"]',
    );
    if (header) observer.observe(header);
    for (const label of dock.current?.querySelectorAll(
      '[data-ui="BottomNavigation"] a > span',
    ) ?? [])
      observer.observe(label);
    const tray = frame.current?.querySelector('[data-ui="ActionTray"]');
    if (tray) observer.observe(tray);
    measure();
    window.addEventListener("resize", measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [action, kind, textScale]);
  const dismissMenu = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setMenu(false);
      setRoleMenu(false);
      (roleMenu ? roleButton : menuButton).current?.focus();
    }
  };
  return (
    <div
      className={s.frame}
      data-ui="ApplicationFrame"
      data-kind={kind}
      data-compact-chrome={
        typeof window !== "undefined" &&
        (window.innerWidth < 1024 || textScale !== 100)
      }
      data-chrome-layout="fixed"
      ref={frame}
    >
      <header
        className={s.header}
        data-ui="ApplicationHeader"
        data-material={material}
        data-menu-open={menu || roleMenu}
      >
        <div className={s.headerRow}>
          <a className={s.brand} href={brandHref} aria-label="CU Ways home">
            <Artwork kind="logo" theme={theme} />
          </a>
          <nav aria-label="Main navigation" className={s.desktop}>
            {nav.map(({ id, label, icon, href }) => (
              <a
                key={id}
                aria-current={activeKey === id ? "page" : undefined}
                href={href}
              >
                <Icon name={icon} filled={activeKey === id} />
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
            {workspaceLinks.length > 0 && (
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
                <Artwork kind="birds" theme={theme} />
              </button>
            )}
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
        </div>
        {menu && (
          <nav
            className={s.dropdown}
            aria-label="Mobile menu"
            onKeyDown={dismissMenu}
          >
            {nav.map(({ id, label, href }) => (
              <a key={id} href={href}>
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
            {workspaceLinks.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main
        className={s.main}
        data-ui="Page"
        data-kind={kind}
        aria-busy={busy || undefined}
      >
        {showBack && (
          <BackLink
            href={brandHref}
            onClick={
              onBack ??
              (() => {
                window.location.href = brandHref;
              })
            }
          >
            {backLabel}
          </BackLink>
        )}
        {showHeading && (
          <div
            className={s.pageHeading}
            data-ui="PageHeading"
            data-back={showBack}
            data-layout={
              headingStatus ? "identity" : headingAction ? "list" : undefined
            }
          >
            <div className={headingStatus ? s.identityHeading : s.headingCopy}>
              <h1 id="page-heading" tabIndex={-1}>
                {title}
              </h1>
              {headingStatus && <LifecycleBadge status={headingStatus} />}
            </div>
            {headingDescription}
            {headingAction}
          </div>
        )}
        <div className={s.content}>{children}</div>
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
            data-obscured={actionHidden}
            aria-hidden={actionHidden || undefined}
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
          {mobile.map(({ id, label, icon, href }) => {
            const active = mobileActiveKey === id;
            return (
              <a
                key={label}
                aria-current={active ? "page" : undefined}
                href={href}
                role={href ? undefined : "link"}
                aria-disabled={!href || undefined}
                title={href ? undefined : `${label} is outside this preview`}
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
  title = "Request in progress",
  onReopen,
  onStop,
}: {
  title?: string;
  onReopen?: () => void;
  onStop?: () => void;
}) {
  return (
    <OperationNotice
      title={title}
      action={
        onReopen ? (
          <Action
            size="operation"
            id="view-progress"
            role="utility"
            onClick={onReopen}
          >
            View progress
          </Action>
        ) : onStop ? (
          <Action size="operation" onClick={onStop}>
            Stop waiting
          </Action>
        ) : undefined
      }
    />
  );
}
