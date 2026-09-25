import Image from "next/image";
import type { ReactNode } from "react";
import { IMG } from "@/lib/assets";

/**
 * The one card /invite and /welcome are built around — a single centred card
 * on the page canvas, the blue mascot on top, in the site's own type scale.
 * A server component; the interactive parts are passed in as children.
 */
export function InviteCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col items-center px-5 py-16 text-center max-[809px]:py-10">
      <Image src={IMG.mrBlue} alt="" width={178} height={236} className="h-28 w-auto" priority />
      <div
        className="mt-6 flex w-full flex-col items-center gap-4 rounded-[28px] px-8 py-10 max-[809px]:px-5"
        style={{ background: "var(--card)" }}
      >
        <span
          className="t-sm-med w-fit rounded-full px-3 py-1"
          style={{ background: "var(--line-2)", color: "var(--zinc)" }}
        >
          {eyebrow}
        </span>
        <h1 className="t-h2" style={{ color: "var(--ink)", textWrap: "balance" }}>
          {title}
        </h1>
        <div className="t-h6 max-w-[46ch]" style={{ color: "var(--muted)" }}>
          {body}
        </div>
        {children}
      </div>
    </section>
  );
}
