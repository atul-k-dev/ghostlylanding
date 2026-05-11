import Image from "next/image";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Twitter / X", href: "#" },
      { label: "LinkedIn", href: "#" },
      { label: "Email", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink pt-16 md:pt-20">
      {/* Foreground content */}
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 md:grid-cols-5 md:gap-8 md:px-10">
        {/* Brand block */}
        <div className="col-span-2">
          <a href="#" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Casper AI"
              width={44}
              height={44}
              className="h-11 w-11"
            />
            <span className="font-sans font-black text-xl tracking-wider">
              Casper AI
            </span>
          </a>
          <p className="mt-4 max-w-xs text-sm text-cream/60">
            The friendly little ghost that grows your Twitter and LinkedIn
            while you sleep.
          </p>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-sans font-black text-[11px] tracking-[0.3em] text-coral">
              {col.title.toUpperCase()}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-cream/70 transition hover:text-cream"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Legal row */}
      <div className="relative z-10 mx-auto mt-14 flex max-w-7xl flex-col items-start justify-between gap-3 border-t border-cream/10 px-6 pb-2 pt-6 text-xs text-cream-dim md:flex-row md:items-center md:px-10">
        <p>© {new Date().getFullYear()} Casper AI. Made for solo creators.</p>
        <p>Browser-session only · Zero credentials collected</p>
      </div>

      {/* Giant translucent CASPER wordmark — visible portion sits at the bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative -mt-2 flex select-none justify-center overflow-hidden"
      >
        <span
          className="block translate-y-[18%] whitespace-nowrap font-sans font-bold leading-none tracking-tight text-cream/[0.045]"
          style={{ fontSize: "clamp(92px, 18vw, 310px)" }}
        >
          CASPER AI
        </span>
      </div>
    </footer>
  );
}
