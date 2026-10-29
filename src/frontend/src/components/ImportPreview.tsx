import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useImportRecipes, useRecipes } from "../hooks/useQueries";
import { type BackupRecipe, toImportItem } from "../lib/backup";
import { backendErrorMessage } from "../lib/canisterEnv";
import { airFryerLine, fold } from "../lib/recipe";

export type ImportCandidate = BackupRecipe & { warnings?: string[] };

type Choice = "skip" | "copy";

function copyTitle(title: string, taken: Set<string>): string {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? `${title} (kopija)` : `${title} (kopija ${n})`;
    if (!taken.has(fold(candidate))) return candidate;
  }
}

// Shows what will be imported and asks what to do with titles that already
// exist. Nothing is saved before "Uvozi" is pressed, and import only adds.
export default function ImportPreview({
  candidates,
  onDone,
  onCancel,
}: {
  candidates: ImportCandidate[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data: existing = [] } = useRecipes();
  const importRecipes = useImportRecipes();
  const [choices, setChoices] = useState<Record<number, Choice>>({});

  const existingTitles = useMemo(
    () => new Set(existing.map((r) => fold(r.title.trim()))),
    [existing],
  );
  const isDuplicate = (c: ImportCandidate) =>
    existingTitles.has(fold(c.title.trim()));
  const duplicates = candidates.filter(isDuplicate).length;
  const choiceOf = (i: number): Choice => choices[i] ?? "skip";

  const setAll = (choice: Choice) => {
    const next: Record<number, Choice> = {};
    candidates.forEach((c, i) => {
      if (isDuplicate(c)) next[i] = choice;
    });
    setChoices(next);
  };

  const toAdd = candidates.filter(
    (c, i) => !isDuplicate(c) || choiceOf(i) === "copy",
  );

  const handleImport = async () => {
    const taken = new Set(existingTitles);
    const items = candidates.flatMap((c, i) => {
      if (isDuplicate(c) && choiceOf(i) === "skip") return [];
      const title = isDuplicate(c) ? copyTitle(c.title.trim(), taken) : c.title;
      taken.add(fold(title));
      return [toImportItem({ ...c, title })];
    });
    if (!items.length) {
      onDone();
      return;
    }
    try {
      const added = await importRecipes.mutateAsync(items);
      toast.success(`Uvoženih receptov: ${added}`);
      onDone();
    } catch (error) {
      const added = (error as { added?: number }).added ?? 0;
      toast.error(
        `${backendErrorMessage(error, "Uvoz ni uspel.")} Uvoženih receptov: ${added}.`,
      );
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Najdenih receptov: <strong>{candidates.length}</strong>
        {duplicates > 0 && (
          <>
            {" "}
            · z enakim naslovom: <strong>{duplicates}</strong>
          </>
        )}
      </p>

      {duplicates > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setAll("skip")}
          >
            Vse enake preskoči
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setAll("copy")}
          >
            Vse enake dodaj kot kopijo
          </Button>
        </div>
      )}

      <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
        {candidates.map((c, i) => {
          const dup = isDuplicate(c);
          const line = airFryerLine(c.body.airFryer);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
              key={i}
              className={`rounded-lg border p-3 ${dup && choiceOf(i) === "skip" ? "opacity-60" : ""}`}
            >
              <p className="font-semibold">{c.title}</p>
              {line && <p className="text-sm font-bold">{line}</p>}
              <p className="text-sm text-muted-foreground">
                Sestavine:{" "}
                {c.body.ingredients.filter((r) => r.kind === "item").length} ·
                Koraki: {c.body.steps.length}
              </p>
              {c.body.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.body.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {c.warnings?.map((w) => (
                <p
                  key={w}
                  className="mt-1 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {w}
                </p>
              ))}
              {dup && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Recept s tem naslovom že obstaja.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={choiceOf(i) === "skip" ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setChoices({ ...choices, [i]: "skip" })}
                    >
                      Preskoči
                    </Button>
                    <Button
                      size="sm"
                      variant={choiceOf(i) === "copy" ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setChoices({ ...choices, [i]: "copy" })}
                    >
                      Dodaj kot kopijo
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Uvoz samo dodaja nove recepte. Obstoječih receptov ne spremeni in ne
        izbriše.
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={importRecipes.isPending}
        >
          Nazaj
        </Button>
        <Button
          className="flex-1"
          onClick={handleImport}
          disabled={importRecipes.isPending || !toAdd.length}
        >
          {importRecipes.isPending ? "Uvažanje..." : `Uvozi (${toAdd.length})`}
        </Button>
      </div>
    </div>
  );
}
