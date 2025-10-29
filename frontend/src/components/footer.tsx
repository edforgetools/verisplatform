export function Footer() {
  return (
    <footer
      className="mt-auto border-t text-sm"
      style={{ borderColor: "rgba(255, 255, 255, 0.1)", color: "rgba(255, 255, 255, 0.8)" }}
      role="contentinfo"
    >
      <div className="mx-auto max-w-5xl px-4 py-4 text-center">
        <p>
          Questions or issues?{" "}
          <a
            href="mailto:support@verisplatform.com"
            className="underline underline-offset-2 hover:brightness-90"
            aria-label="Email support at support@verisplatform.com"
          >
            support@verisplatform.com
          </a>
        </p>
      </div>
    </footer>
  );
}
