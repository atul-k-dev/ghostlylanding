import Link from "next/link";
import type { ReactNode } from "react";
import { GhostMascot } from "./GhostMascot";

/**
 * The backdrop shared by /invite and /welcome — the same black canvas, faint
 * grid and centre fade as the home page's final CTA, so arriving from a friend's
 * link feels like the same site.
 */
export function InviteShell({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep-space px-4 py-16 md:px-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000000_80%)]" />

      <div className="relative z-10 mx-auto w-full max-w-xl text-center">
        <div className="mb-10 flex justify-center">
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-10 blur-3xl"
              style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
              aria-hidden="true"
            />
            <GhostMascot className="h-24 w-auto invert brightness-0 md:h-28" />
          </div>
        </div>

        <span className="mb-5 inline-flex items-center gap-2 rounded-sm border border-iron-slate/20 bg-shadow-tint px-3 py-1 font-geist text-[11px] uppercase tracking-widest text-iron-slate">
          <span className="h-1.5 w-1.5 rounded-full bg-ghost-white" />
          {eyebrow}
        </span>

        {children}

        <p className="mt-12 font-geist text-[10px] uppercase tracking-wider text-iron-slate">
          <Link href="/" className="transition hover:text-ghost-white">
            Ghostly247
          </Link>{" "}
          · Browser-session only · Free to start
        </p>
      </div>
    </main>
  );
}

export const primaryButton =
  "inline-flex items-center justify-center rounded-sm bg-ghost-white px-8 py-4 font-geist text-[12px] font-semibold uppercase tracking-widest text-deep-space transition hover:bg-white/90";
export const secondaryButton =
  "inline-flex items-center justify-center rounded-sm border border-iron-slate/30 bg-transparent px-6 py-4 font-geist text-[12px] font-semibold uppercase tracking-widest text-fg transition hover:border-ghost-white";
