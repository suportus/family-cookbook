// At the end of the page content (not fixed). `belowFab`: the page has the
// floating "+" button, so leave room for it under the text.
export default function Footer({ belowFab = false }: { belowFab?: boolean }) {
  return (
    <footer
      className="px-4 pt-6 text-center text-xs text-muted-foreground"
      style={{
        // Under the "+" button (64 px + 24 px margin, lifted by the safe
        // area like the button), otherwise just the safe area.
        paddingBottom: belowFab
          ? "calc(7rem + env(safe-area-inset-bottom))"
          : "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      © {new Date().getFullYear()} · Powered by{" "}
      <a
        href="https://internetcomputer.org"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Internet Computer
      </a>
    </footer>
  );
}
