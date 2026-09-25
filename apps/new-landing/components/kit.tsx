"use client";

import type { ReactNode } from "react";
import { Reveal } from "./motion-primitives";

/** Page gutter + the 1600px measure every section shares. */
export function Shell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1600px] px-5 ${className}`}>
      {children}
    </div>
  );
}

/** Small pill above a section title — the lime one is the brand accent. */
export function Eyebrow({
  children,
  tone = "line",
}: {
  children: ReactNode;
  tone?: "line" | "lime" | "violet" | "pink";
}) {
  const bg = {
    line: "var(--line-2)",
    lime: "var(--lime)",
    violet: "var(--violet)",
    pink: "var(--pink)",
  }[tone];

  return (
    <span
      className="t-sm-med inline-flex items-center rounded-full px-3 py-1"
      style={{ background: bg, color: "var(--ink)" }}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  tone,
  title,
  body,
  align = "center",
  className = "",
}: {
  eyebrow?: string;
  tone?: "line" | "lime" | "violet" | "pink";
  title: ReactNode;
  body?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const centred = align === "center";

  return (
    <Reveal
      className={`flex w-full flex-col gap-4 ${
        centred ? "items-center text-center" : "items-start text-left"
      } ${className}`}
    >
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2
        className={`t-h2 ${centred ? "max-w-[820px]" : "max-w-[760px]"}`}
        style={{ color: "var(--ink)", textWrap: "balance" }}
      >
        {title}
      </h2>
      {body ? (
        <p
          className="t-h6 max-w-[620px]"
          style={{ color: "var(--muted)", textWrap: "balance" }}
        >
          {body}
        </p>
      ) : null}
    </Reveal>
  );
}

/** Standard section wrapper: vertical rhythm matching the export (80/40). */
export function Section({
  id,
  children,
  className = "",
  background,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  background?: string;
}) {
  return (
    <section
      id={id}
      className={`flex w-full flex-col items-center py-20 max-[1199px]:py-10 ${className}`}
      style={background ? { background } : undefined}
    >
      {children}
    </section>
  );
}

/** A framed product screenshot — the shadow/radius pairing used page-wide. */
export function Shot({
  src,
  alt,
  width,
  height,
  className = "",
  radius = 16,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  radius?: number;
  priority?: boolean;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`block h-auto w-full ${className}`}
      style={{ borderRadius: radius, boxShadow: "var(--shadow-card)" }}
    />
  );
}
