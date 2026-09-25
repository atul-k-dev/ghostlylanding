"use client";

import { useState, type FormEvent } from "react";
import { API_BASE } from "@/lib/referral";
import { SITE } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "error";

const FIELD =
  "t-body w-full rounded-2xl px-4 py-3 outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--line)]";
const fieldStyle = { background: "var(--line-2)", color: "var(--ink)" };

/**
 * Contact form → POST /api/support on the API, which emails the support inbox
 * (rate-limited per IP, with a honeypot field for bots). The email address is
 * shown alongside it, so a failure never leaves someone with no way to reach us.
 */
export function SupportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans never see it
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject: subject || undefined, message, company }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      if (res.ok && data.ok) {
        setStatus("sent");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        setStatus("error");
        setError(data.error?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError(`Couldn't reach us. Please try again, or email ${SITE.email}.`);
    }
  };

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-[28px] px-6 py-8 text-center" style={{ background: "var(--card)" }}>
        <p className="t-h5" style={{ color: "var(--ink)" }}>
          Message sent
        </p>
        <p className="t-body mt-2" style={{ color: "var(--zinc)" }}>
          Thanks for getting in touch — we&rsquo;ll reply to your email, usually within one working day.
        </p>
        <button type="button" onClick={() => setStatus("idle")} className="btn-ghost t-nav mt-5">
          Send another message
        </button>
      </div>
    );
  }

  const busy = status === "sending";
  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-6 flex flex-col gap-4 rounded-[28px] p-6 max-[809px]:p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="t-sm-med" style={{ color: "var(--ink)" }}>Name</span>
          <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} autoComplete="name" className={FIELD} style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="t-sm-med" style={{ color: "var(--ink)" }}>Email</span>
          <input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} autoComplete="email" className={FIELD} style={fieldStyle} />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="t-sm-med" style={{ color: "var(--ink)" }}>
          Subject <span style={{ color: "var(--muted)" }}>(optional)</span>
        </span>
        <input maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={busy} className={FIELD} style={fieldStyle} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="t-sm-med" style={{ color: "var(--ink)" }}>How can we help?</span>
        <textarea
          required
          rows={6}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
          placeholder="What happened, what you expected, and your extension version (Settings, bottom of the page)."
          className={`${FIELD} resize-y`}
          style={fieldStyle}
        />
      </label>
      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {error && (
        <p role="alert" className="t-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <div>
        <button type="submit" disabled={busy} className="btn-ghost t-nav disabled:opacity-60" style={{ background: "var(--ink)", color: "var(--card)" }}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
