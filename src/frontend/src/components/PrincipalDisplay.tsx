import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

interface PrincipalDisplayProps {
  principal: string;
  label?: string;
}

export function PrincipalDisplay({
  principal,
  label = "Principal",
}: PrincipalDisplayProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(principal);
      toast.success("Kopirano");
    } catch (_error) {
      toast.error("Kopiranje ni uspelo");
    }
  };

  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <code className="text-xs font-mono break-all">{principal}</code>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-7 w-7 shrink-0 rounded-lg"
        aria-label="Kopiraj"
        title="Kopiraj"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
