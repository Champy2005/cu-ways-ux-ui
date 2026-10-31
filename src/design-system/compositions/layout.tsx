import { useState, type ReactNode } from "react";
import {
  Action,
  BackLink,
  Icon,
  LifecycleBadge,
  type JobStatus,
} from "../components/primitives";
import s from "./layout.module.css";
export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={s.card} data-ui="Card">
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
}: {
  title: string;
  context?: string;
  status?: JobStatus;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={s.statusHeading} data-ui="StatusHeading">
      <div>
        {context && <p className={s.context}>{context}</p>}
        <Heading>{title}</Heading>
      </div>
      {status && <LifecycleBadge status={status} />}
    </div>
  );
}
export function ConfirmationActions({
  safe,
  commit,
}: {
  safe: ReactNode;
  commit: ReactNode;
}) {
  return (
    <div className={s.confirmation} data-ui="ConfirmationActions">
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
export function AppFrame({
  title,
  children,
  onBack,
  backLabel = "Story library",
  feature,
}: {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  feature: string;
}) {
  const [menu, setMenu] = useState(false);
  const nav = [
    ["025", "My Jobs"],
    ["026", "Proof"],
    ["027", "Completion"],
    ["028", "Cancellation"],
    ["034", "Reviews"],
  ];
  return (
    <div className={s.frame} data-ui="ApplicationFrame">
      <header className={s.header} data-ui="ApplicationHeader">
        <a
          className={s.brand}
          href="/?path=/story/us025--l-02"
          aria-label="CU Ways home"
        >
          <img
            src={`/assets/logo-${document.documentElement.dataset.cuTheme === "dark" ? "dark" : "light"}.svg`}
            alt="CU Ways"
            width="140"
            height="38"
          />
        </a>
        <nav aria-label="Main navigation" className={s.desktop}>
          {nav.map(([id, label]) => (
            <a
              key={id}
              aria-current={feature === id ? "page" : undefined}
              href={`?id=us${id}--${id === "025" ? "l-02" : "a-01"}&viewMode=story`}
            >
              {label}
            </a>
          ))}
        </nav>
        <button
          className={s.menuToggle}
          aria-label="Menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Icon name="menu" />
        </button>
        {menu && (
          <nav className={s.dropdown} aria-label="Mobile menu">
            {nav.map(([id, label]) => (
              <a
                key={id}
                href={`?id=us${id}--${id === "025" ? "l-02" : "a-01"}&viewMode=story`}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main className={s.main} data-ui="Page">
        <BackLink
          onClick={
            onBack ??
            (() => {
              window.location.href = "/?path=/story/us025--l-02";
            })
          }
        >
          {backLabel}
        </BackLink>
        <div className={s.pageHeading} data-ui="PageHeading">
          <h1>{title}</h1>
        </div>
        <div className={s.stack}>{children}</div>
      </main>
      <nav
        className={s.bottom}
        aria-label="Bottom navigation"
        data-ui="BottomNavigation"
      >
        {nav
          .filter(([id]) => id !== "028")
          .map(([id, label]) => (
            <a
              key={id}
              aria-current={feature === id ? "page" : undefined}
              href={`?id=us${id}--${id === "025" ? "l-02" : "a-01"}&viewMode=story`}
            >
              {label}
            </a>
          ))}
      </nav>
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
        <Action role="utility" onClick={onReopen}>
          View progress
        </Action>
      )}
      <Action role="safe" onClick={onCheck}>
        Check status
      </Action>
    </div>
  );
}
