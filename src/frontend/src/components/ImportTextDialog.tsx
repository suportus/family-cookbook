import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRecipes } from "../hooks/useQueries";
import { copyText } from "../lib/clipboard";
import {
  IMPORT_SAMPLE,
  RECIPE_SEPARATOR,
  aiInstruction,
  formatRules,
  parseRecipeText,
} from "../lib/importText";
import { allTags } from "../lib/recipe";
import ImportPreview, { type ImportCandidate } from "./ImportPreview";

export default function ImportTextDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const { data: recipes = [] } = useRecipes();
  // The app's tags plus those used in recipes, suggested to the AI.
  const tags = useMemo(() => allTags(recipes), [recipes]);

  const copy = async (value: string) => {
    if (await copyText(value)) {
      toast.success("Kopirano");
    } else {
      toast.error("Kopiranje ni uspelo");
    }
  };

  const close = (next: boolean) => {
    if (!next) setCandidates(null);
    onOpenChange(next);
  };

  const handlePreview = () => {
    const parsed = parseRecipeText(text);
    if (!parsed.length) {
      toast.error("V besedilu ni receptov.");
      return;
    }
    setCandidates(parsed);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Uvozi recepte</DialogTitle>
          <DialogDescription>
            Prilepite enega ali več receptov. Recepte ločite z vrstico{" "}
            <code>{RECIPE_SEPARATOR}</code>.
          </DialogDescription>
        </DialogHeader>

        {candidates ? (
          <ImportPreview
            candidates={candidates}
            onCancel={() => setCandidates(null)}
            onDone={() => {
              setText("");
              close(false);
            }}
          />
        ) : (
          <div className="min-w-0 space-y-4">
            <Collapsible>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary">
                  <ChevronDown className="h-4 w-4" />
                  Oblika in primer
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 rounded-full"
                  onClick={() => copy(aiInstruction(tags))}
                >
                  <Sparkles className="h-4 w-4" />
                  Kopiraj navodilo za AI
                </Button>
              </div>
              <CollapsibleContent className="space-y-2 pt-2 text-sm text-muted-foreground">
                <p>
                  Navodilo za AI prilepite v ChatGPT, Gemini, Claude ..., za
                  njim pa recept. Odgovor prilepite spodaj.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {formatRules(tags).map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
                <div className="relative">
                  <pre className="overflow-x-auto whitespace-pre rounded-lg bg-muted p-3 pr-12 text-xs text-foreground">
                    {IMPORT_SAMPLE}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full"
                    onClick={() => copy(IMPORT_SAMPLE)}
                    aria-label="Kopiraj primer"
                    title="Kopiraj primer"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setText(IMPORT_SAMPLE)}
                >
                  Vstavi primer
                </Button>
              </CollapsibleContent>
            </Collapsible>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Prilepite recepte tukaj ..."
              className="font-mono text-sm"
            />

            <Button
              className="w-full"
              onClick={handlePreview}
              disabled={!text.trim()}
            >
              Predogled
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
