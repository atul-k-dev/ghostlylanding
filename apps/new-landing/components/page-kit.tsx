import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Chrome for the standalone pages — legal, docs, changelog, status.
 *
 * These sit outside the marketing page's section rhythm: one measure, one
 * heading scale, generous line length. Everything is a server component, so a
 * policy page ships no JavaScript at all.
 */

export function DocShell({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  /** ISO date, rendered in a fixed locale so server and client agree. */
  updated?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-[760px] px-5 py-16 max-[809px]:py-10">
      <Link
        href="/"
        className="t-sm inline-flex items-center gap-2 transition-colors"
        style={{ color: "var(--muted)" }}
      >
        <span aria-hidden="true">←</span> Back to Ghostly 247
      </Link>

      <header className="mt-8 flex flex-col gap-3">
        {eyebrow ? (
          <span
            className="t-sm-med w-fit rounded-full px-3 py-1"
            style={{ background: "var(--line-2)", color: "var(--zinc)" }}
          >
            {eyebrow}
          </span>
        ) : null}

        <h1 className="t-h2" style={{ color: "var(--ink)", textWrap: "balance" }}>
          {title}
        </h1>

        {updated ? (
          <p className="t-sm" style={{ color: "var(--muted-2)" }}>
            Last updated{" "}
            <time dateTime={updated}>
              {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
          </p>
        ) : null}

        {intro ? (
          <div className="t-h6 mt-2" style={{ color: "var(--muted)" }}>
            {intro}
          </div>
        ) : null}
      </header>

      <div className="mt-10 flex flex-col">{children}</div>
    </article>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="t-h5 mt-10 mb-3" style={{ color: "var(--ink)" }}>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="t-nav mt-6 mb-2" style={{ color: "var(--ink)" }}>
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="t-body mt-3" style={{ color: "var(--zinc)", lineHeight: "1.7em" }}>
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul
      className="t-body mt-3 flex list-disc flex-col gap-2 pl-5"
      style={{ color: "var(--zinc)", lineHeight: "1.7em" }}
    >
      {children}
    </ul>
  );
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol
      className="t-body mt-3 flex list-decimal flex-col gap-2 pl-5"
      style={{ color: "var(--zinc)", lineHeight: "1.7em" }}
    >
      {children}
    </ol>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return (
    <strong className="t-sm-med" style={{ color: "var(--ink)", fontSize: "inherit" }}>
      {children}
    </strong>
  );
}

/** A plain link inside body copy. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const internal = href.startsWith("/");
  const style = { color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3 };

  return internal ? (
    <Link href={href} style={style}>
      {children}
    </Link>
  ) : (
    <a href={href} style={style} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Pulled-out warning or emphasis panel. */
export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: "note" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const warn = tone === "warn";
  return (
    <div
      className="mt-8 flex flex-col gap-2 p-6 max-[639px]:p-5"
      style={{
        background: warn ? "var(--brand-050)" : "var(--line-2)",
        border: `1px solid ${warn ? "var(--brand-150)" : "var(--line)"}`,
        borderRadius: 20,
      }}
    >
      {title ? (
        <p className="t-sm-med uppercase" style={{ color: warn ? "var(--brand-800)" : "var(--zinc)", letterSpacing: "0.08em" }}>
          {title}
        </p>
      ) : null}
      <div className="t-body" style={{ color: "var(--ink)", lineHeight: "1.7em" }}>
        {children}
      </div>
    </div>
  );
}

/** Two-column definition table used by the subprocessors page. */
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mt-6 w-full overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="t-sm-med px-4 py-3 uppercase"
                style={{
                  color: "var(--muted)",
                  letterSpacing: "0.06em",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td
                  key={j}
                  className="t-body px-4 py-3.5 align-top"
                  style={{
                    color: j === 0 ? "var(--ink)" : "var(--zinc)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
