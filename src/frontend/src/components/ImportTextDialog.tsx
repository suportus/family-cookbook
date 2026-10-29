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
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseRecipeText } from "../lib/importText";
import ImportPreview, { type ImportCandidate } from "./ImportPreview";

const SAMPLE = `Piščančja bedra v air fryerju
Oznake: Air fryer, Kosila
Air fryer: Air Fry | predgrevanje | 200 °C 12 min (obrni po 6 min) | 180 °C 3 min
Air fryer opomba: Bedra naj bodo čim bolj suha.
Sestavine:
4 piščančja bedra
## Marinada
1 žlica olja
1 žlička paprike
Navodila:
1. Bedra osuši s papirnato brisačo.
2. Natri z marinado.
---
Krompirček
Oznake: Air fryer, Prigrizki
Air fryer: Fries | 190 °C 15 min (pretresi na pol)`;

export default function ImportTextDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);

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
            <code>---</code>.
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
          <div className="space-y-4">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary">
                <ChevronDown className="h-4 w-4" />
                Oblika in primer
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Prva vrstica je naslov (edino obvezno).</li>
                  <li>
                    <code>Oznake:</code> ločene z vejico.
                  </li>
                  <li>
                    <code>Air fryer:</code> deli ločeni z <code>|</code>:
                    program, <code>predgrevanje</code>, do 3 stopnje (
                    <code>200 °C 12 min (opomba)</code>).
                  </li>
                  <li>
                    <code>Air fryer opomba:</code> splošna opomba.
                  </li>
                  <li>
                    <code>Sestavine:</code> ena na vrstico; <code>## Ime</code>{" "}
                    je razdelek.
                  </li>
                  <li>
                    <code>Navodila:</code> en korak na vrstico; številke niso
                    potrebne.
                  </li>
                </ul>
                <pre className="overflow-x-auto whitespace-pre rounded-lg bg-muted p-3 text-xs text-foreground">
                  {SAMPLE}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setText(SAMPLE)}
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
