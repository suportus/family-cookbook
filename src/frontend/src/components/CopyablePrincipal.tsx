import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../hooks/useLanguage";

interface CopyablePrincipalProps {
  principal: string;
  className?: string;
  showIcon?: boolean;
}

export default function CopyablePrincipal({
  principal,
  className,
  showIcon = false,
}: CopyablePrincipalProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const shortenPrincipal = (text: string) => {
    if (text.length <= 13) return text;
    return `${text.slice(0, 5)}...${text.slice(-5)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(principal);
      setCopied(true);
      toast.success(t.principalCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t.failedCopyPrincipal);
      console.error("Copy failed:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm transition-colors hover:text-primary cursor-pointer",
        className,
      )}
      title={t.clickToCopy}
    >
      <span>{shortenPrincipal(principal)}</span>
      {showIcon &&
        (copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3 opacity-50" />
        ))}
    </button>
  );
}
