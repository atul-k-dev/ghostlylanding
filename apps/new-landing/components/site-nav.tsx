"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronIcon } from "./icons";
import { SITE } from "@/lib/site";

const LINKS = [
  { label: "Features", href: "/#features", hasMenu: true },
  { label: "Safety", href: "/#safety" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

const PRODUCT_MENU = [
  { label: "Ask", href: "/#ask", desc: "Tell Ghostly what to change. It proposes, you approve." },
  { label: "Your voice", href: "/#voice", desc: "Learns how you write from your own posts." },
  { label: "Create & schedule", href: "/#create", desc: "Draft, thread and queue posts ahead." },
  { label: "Targeting", href: "/#targeting", desc: "Topic feeds and creators worth replying to." },
  { label: "Growth", href: "/#growth", desc: "Followers gained, not just actions taken." },
];

/**
 * Links that leave the site open in a new tab, so a visitor sent to the Chrome
 * Web Store does not lose the page they were reading. Detected from the href
 * rather than passed at every call site.
 */
const offSiteProps = (href: string) =>
  href.startsWith("http") ? { target: "_blank" as const, rel: "noreferrer" } : {};

export function PrimaryButton({
  children,
  href = "#",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a href={href} {...offSiteProps(href)} className={`btn-primary t-nav ${className}`}>
      <span className="btn-primary__flood" aria-hidden="true" />
      <span className="btn-primary__icon">
        <ChevronIcon />
      </span>
      <span className="btn-primary__label">{children}</span>
    </a>
  );
}

export function GhostButton({
  children,
  href = "#",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a href={href} {...offSiteProps(href)} className={`btn-ghost t-nav ${className}`}>
      {children}
    </a>
  );
}

export function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  return (
    <>
      {/* Spacer holding the 80px the fixed bar takes out of the flow. */}
      <div className="h-20 w-full" />

      <header
        className="fixed inset-x-0 top-0 z-40 w-full"
        style={{
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          backgroundColor: "var(--page-80)",
        }}
      >
        <nav className="mx-auto flex h-20 w-full max-w-[1500px] items-center gap-5 px-5">
          {/* Wordmark */}
          <div className="flex min-w-[240px] items-center gap-5">
            <Link href="/" className="t-logo flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <Image
                src="/logo.png"
                alt=""
                width={44}
                height={44}
                priority
                className="h-10 w-10 rounded-xl object-cover"
              />
              Ghostly<span style={{ color: "var(--muted-2)" }}>247</span>
            </Link>
          </div>

          {/* Centre links — desktop only */}
          <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
            {LINKS.map((link) =>
              link.hasMenu ? (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setProductOpen(true)}
                  onMouseLeave={() => setProductOpen(false)}
                >
                  <button
                    className="t-nav cursor-pointer transition-colors"
                    style={{ color: "var(--ink)" }}
                    onFocus={() => setProductOpen(true)}
                  >
                    {link.label}
                  </button>

                  <AnimatePresence>
                    {productOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.22, ease: [0.44, 0, 0.22, 1] }}
                        className="absolute left-1/2 top-full w-[320px] -translate-x-1/2 pt-4"
                      >
                        <div
                          className="flex flex-col gap-1 p-2"
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--line)",
                            borderRadius: 24,
                            boxShadow: "var(--shadow-soft)",
                          }}
                        >
                          {PRODUCT_MENU.map((item) => (
                            <a
                              key={item.label}
                              href={item.href}
                              className="rounded-2xl px-4 py-3 transition-colors"
                              style={{ color: "var(--ink)" }}
                              onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--line-2)")
                              }
                              onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "transparent")
                              }
                            >
                              <div className="t-nav">{item.label}</div>
                              <div
                                className="t-sm"
                                style={{ color: "var(--muted)" }}
                              >
                                {item.desc}
                              </div>
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="t-nav transition-colors"
                  style={{ color: "var(--ink)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--muted)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--ink)")
                  }
                >
                  {link.label}
                </a>
              )
            )}
          </div>

          {/* Right-hand actions */}
          <div className="ml-auto hidden items-center gap-4 lg:flex border border-blue-400 rounded-full">
            <PrimaryButton href={SITE.chromeStoreUrl}>Add to Chrome</PrimaryButton>
          </div>

          {/* Hamburger — below 1024px */}
          <button
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full lg:hidden"
            style={{ background: "var(--line-2)" }}
          >
            <span
              className="block h-[1.5px] w-4 transition-transform"
              style={{
                background: "var(--ink)",
                transform: menuOpen ? "translateY(3.25px) rotate(45deg)" : "none",
              }}
            />
            <span
              className="block h-[1.5px] w-4 transition-transform"
              style={{
                background: "var(--ink)",
                transform: menuOpen
                  ? "translateY(-3.25px) rotate(-45deg)"
                  : "none",
              }}
            />
          </button>
        </nav>

        {/* Mobile drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.44, 0, 0.22, 1] }}
              className="overflow-hidden lg:hidden"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-5 pb-6 pt-2">
                {LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="t-nav py-2"
                    style={{ color: "var(--ink)" }}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-2 flex items-center gap-4">
                  <PrimaryButton href={SITE.chromeStoreUrl}>Add to Chrome</PrimaryButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
