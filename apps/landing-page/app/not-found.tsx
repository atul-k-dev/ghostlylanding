import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e0e0e",
        color: "#fff",
        textAlign: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display-loaded), sans-serif",
          fontSize: "clamp(4rem, 10vw, 8rem)",
          lineHeight: 1,
          background: "linear-gradient(135deg, #a78bfa, #818cf8, #6366f1)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </h1>

      <p
        style={{
          fontSize: "1.25rem",
          color: "rgba(255,255,255,0.6)",
          maxWidth: "28rem",
        }}
      >
        Oops — this page doesn&apos;t exist. Casper must have ghosted it.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 2rem",
          borderRadius: "9999px",
          background: "linear-gradient(135deg, #a78bfa, #6366f1)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          textDecoration: "none",
          transition: "opacity 0.2s",
        }}
      >
        ← Back to Home
      </Link>
    </main>
  );
}
