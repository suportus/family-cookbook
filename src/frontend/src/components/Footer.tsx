import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-center">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          © 2025. Narejeno z{" "}
          <Heart className="h-3.5 w-3.5 fill-primary text-primary" />{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
