"use client";

import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.ghostly247.com";

type Status = "idle" | "sending" | "sent" | "error";

const inputClass =
  "w-full rounded-lg border border-border bg-[#111111] px-3.5 py-2.5 text-[15px] text-fg placeholder:text-muted-fg/60 outline-none transition-colors focus:border-accent/60";

export function SupportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, company }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus("sent");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        setStatus("error");
        setErrorMsg(data?.error?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again, or email support@ghostly247.com.");
    }
  };

  if (status === "sent") {
    return (
      <div className="mt-8 rounded-2xl border border-accent/40 bg-accent/[0.06] p-6 text-center">
        <p className="text-lg font-semibold text-fg">Message sent 👻</p>
        <p className="mt-2 text-[15px] text-muted-fg">
          Thanks for reaching out — we&rsquo;ll reply to your email shortly.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const busy = status === "sending";

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Name</label>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Email</label>
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">Subject</label>
        <input
          type="text"
          maxLength={150}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={busy}
          className={inputClass}
          placeholder="What's this about? (optional)"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">Message</label>
        <textarea
          required
          rows={6}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
          className={`${inputClass} resize-y`}
          placeholder="How can we help?"
        />
      </div>

      {/* Honeypot — hidden from humans, catches bots. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {status === "error" && errorMsg && (
        <p className="text-sm text-accent">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send message"}
      </button>

      <p className="text-xs text-muted-fg">
        Prefer email? Reach us directly at{" "}
        <a href="mailto:support@ghostly247.com" className="text-accent hover:underline">
          support@ghostly247.com
        </a>
        .
      </p>
    </form>
  );
}
