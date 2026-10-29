import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ClipboardPaste, Plus, Wind, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAddRecipe, useUpdateRecipe } from "../hooks/useQueries";
import { goBack, navigate } from "../hooks/useRoute";
import { backendErrorMessage } from "../lib/canisterEnv";
import {
  MAX_STAGES,
  type RecipeBody,
  type RecipeData,
  allTags,
  cleanText,
  fold,
  splitPastedLines,
  usedPrograms,
} from "../lib/recipe";

type IngredientField = { key: string; kind: "item" | "section"; text: string };
type StepField = { key: string; text: string };
type StageField = { key: string; tempC: string; minutes: string; note: string };

const newKey = () => crypto.randomUUID();

function numberText(n: number | null): string {
  return n === null ? "" : String(n).replace(".", ",");
}

function parseNumber(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function RecipeForm({
  recipe,
  allRecipes,
}: {
  recipe?: RecipeData;
  allRecipes: RecipeData[];
}) {
  const addRecipe = useAddRecipe();
  const updateRecipe = useUpdateRecipe();
  const isEditing = !!recipe;
  // The version this edit started from; the backend rejects the save if the
  // recipe was changed elsewhere in the meantime.
  const [expectedUpdatedAt] = useState(recipe?.updatedAt);

  const [title, setTitle] = useState(recipe?.title ?? "");
  const [ingredients, setIngredients] = useState<IngredientField[]>(() =>
    recipe?.ingredients.length
      ? recipe.ingredients.map((r) => ({ key: newKey(), ...r }))
      : [{ key: newKey(), kind: "item", text: "" }],
  );
  const [steps, setSteps] = useState<StepField[]>(() =>
    recipe?.steps.length
      ? recipe.steps.map((text) => ({ key: newKey(), text }))
      : [{ key: newKey(), text: "" }],
  );
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const af = recipe?.airFryer;
  const [airFryerOpen, setAirFryerOpen] = useState(!!af);
  const [program, setProgram] = useState(af?.program ?? "");
  const [preheat, setPreheat] = useState(af?.preheat ?? false);
  const [stages, setStages] = useState<StageField[]>(() =>
    af?.stages.length
      ? af.stages.map((s) => ({
          key: newKey(),
          tempC: numberText(s.tempC),
          minutes: numberText(s.minutes),
          note: s.note,
        }))
      : [{ key: newKey(), tempC: "", minutes: "", note: "" }],
  );
  const [airFryerNote, setAirFryerNote] = useState(af?.note ?? "");
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const tagSuggestions = useMemo(() => allTags(allRecipes), [allRecipes]);
  const programs = useMemo(() => usedPrograms(allRecipes), [allRecipes]);

  // Focus a row that was just added with Enter.
  useEffect(() => {
    if (focusKey) {
      document.getElementById(`row-${focusKey}`)?.focus();
      setFocusKey(null);
    }
  }, [focusKey]);

  // ---------- Ingredients ----------

  const addIngredient = (kind: "item" | "section", after?: number) => {
    const row: IngredientField = { key: newKey(), kind, text: "" };
    setIngredients((rows) => {
      const at = after === undefined ? rows.length : after + 1;
      return [...rows.slice(0, at), row, ...rows.slice(at)];
    });
    setFocusKey(row.key);
  };

  const pasteIngredients = (text: string) => {
    const rows: IngredientField[] = text
      .split(/\r?\n/)
      .flatMap((line): IngredientField[] => {
        const t = line.trim();
        if (t.startsWith("#")) {
          const section = t.replace(/^#+\s*/, "");
          return section
            ? [{ key: newKey(), kind: "section", text: section }]
            : [];
        }
        return splitPastedLines(t).map((item) => ({
          key: newKey(),
          kind: "item",
          text: item,
        }));
      });
    setIngredients((old) => [...old.filter((r) => r.text.trim()), ...rows]);
    return rows.length;
  };

  // ---------- Steps ----------

  const addStep = (after?: number) => {
    const row: StepField = { key: newKey(), text: "" };
    setSteps((rows) => {
      const at = after === undefined ? rows.length : after + 1;
      return [...rows.slice(0, at), row, ...rows.slice(at)];
    });
    setFocusKey(row.key);
  };

  const pasteSteps = (text: string) => {
    const rows = splitPastedLines(text).map((t) => ({
      key: newKey(),
      text: t,
    }));
    setSteps((old) => [...old.filter((r) => r.text.trim()), ...rows]);
    return rows.length;
  };

  // ---------- Tags ----------

  const hasTag = (tag: string) => tags.some((t) => fold(t) === fold(tag));

  const toggleTag = (tag: string) => {
    setTags((old) =>
      hasTag(tag) ? old.filter((t) => fold(t) !== fold(tag)) : [...old, tag],
    );
  };

  const addCustomTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (!hasTag(tag)) {
      // Reuse the spelling of an existing tag ("juhe" -> "Juhe").
      const known = tagSuggestions.find((t) => fold(t) === fold(tag));
      setTags((old) => [...old, known ?? tag]);
    }
    setTagInput("");
  };

  const shownTags = useMemo(
    () => [
      ...tagSuggestions,
      ...tags.filter((t) => !tagSuggestions.some((s) => fold(s) === fold(t))),
    ],
    [tagSuggestions, tags],
  );

  // ---------- Save ----------

  const buildBody = (): RecipeBody => ({
    tags,
    ingredients: ingredients.map(({ kind, text }) => ({ kind, text })),
    steps: steps.map((s) => s.text),
    airFryer: airFryerOpen
      ? {
          program,
          preheat,
          stages: stages.map((s) => ({
            tempC: parseNumber(s.tempC),
            minutes: parseNumber(s.minutes),
            note: s.note,
          })),
          note: airFryerNote,
        }
      : null,
  });

  const isSaving = addRecipe.isPending || updateRecipe.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanText(title)) {
      toast.error("Vnesite naslov recepta");
      return;
    }
    const draft = { title: cleanText(title), body: buildBody() };
    try {
      const saved =
        recipe && expectedUpdatedAt !== undefined
          ? await updateRecipe.mutateAsync({
              id: recipe.id,
              expectedUpdatedAt,
              draft,
            })
          : await addRecipe.mutateAsync(draft);
      toast.success(isEditing ? "Recept je shranjen" : "Recept je dodan");
      navigate({ name: "recipe", id: saved.id }, { replace: true });
    } catch (error) {
      toast.error(backendErrorMessage(error, "Shranjevanje ni uspelo"));
    }
  };

  return (
    <div className="container max-w-3xl px-4 py-4 pb-16">
      <h2 className="mb-4 text-3xl font-bold tracking-tight">
        {isEditing ? "Uredi recept" : "Nov recept"}
      </h2>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="title">Naslov</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="npr. Piščančja bedra"
                className="h-12 text-base"
                maxLength={200}
              />
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Sestavine</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full"
                    onClick={() => addIngredient("item")}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Dodaj
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full"
                    onClick={() => addIngredient("section")}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Dodaj razdelek
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {ingredients.map((row, index) => (
                  <div
                    key={row.key}
                    className={`flex gap-2 ${row.kind === "section" ? "pt-3" : ""}`}
                  >
                    <Input
                      id={`row-${row.key}`}
                      value={row.text}
                      placeholder={
                        row.kind === "section"
                          ? "Razdelek, npr. Marinada"
                          : `Sestavina ${index + 1}`
                      }
                      className={`h-11 text-base ${row.kind === "section" ? "font-bold" : ""}`}
                      enterKeyHint="next"
                      onChange={(e) =>
                        setIngredients((rows) =>
                          rows.map((r) =>
                            r.key === row.key
                              ? { ...r, text: e.target.value }
                              : r,
                          ),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addIngredient("item", index);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      aria-label="Odstrani"
                      onClick={() =>
                        setIngredients((rows) =>
                          rows.filter((r) => r.key !== row.key),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <PasteBox
                hint="Ena sestavina na vrstico. Vrstica z ## na začetku je razdelek."
                onPaste={pasteIngredients}
              />
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Navodila</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => addStep()}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Dodaj
                </Button>
              </div>
              <div className="space-y-2">
                {steps.map((row, index) => (
                  <div key={row.key} className="flex items-start gap-2">
                    <span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <Textarea
                      id={`row-${row.key}`}
                      value={row.text}
                      placeholder={`Korak ${index + 1}`}
                      rows={2}
                      className="min-h-11 resize-y text-base"
                      enterKeyHint="next"
                      onChange={(e) =>
                        setSteps((rows) =>
                          rows.map((r) =>
                            r.key === row.key
                              ? { ...r, text: e.target.value }
                              : r,
                          ),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addStep(index);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      aria-label="Odstrani"
                      onClick={() =>
                        setSteps((rows) =>
                          rows.filter((r) => r.key !== row.key),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <PasteBox
                hint="En korak na vrstico. Številke na začetku se odstranijo."
                onPaste={pasteSteps}
              />
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label>Oznake</Label>
              <div className="flex flex-wrap gap-2">
                {shownTags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={hasTag(tag) ? "default" : "outline"}
                    className="h-9 rounded-full"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Nova oznaka, npr. Gedžo recepti"
                  className="h-11 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={addCustomTag}
                  disabled={!tagInput.trim()}
                >
                  Dodaj
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 pr-1 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        aria-label={`Odstrani ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Air fryer */}
            <Collapsible
              open={airFryerOpen}
              onOpenChange={setAirFryerOpen}
              className="rounded-lg border"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3">
                <span className="flex items-center gap-2 font-medium">
                  <Wind className="h-5 w-5 text-primary" />
                  Air fryer
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  {airFryerOpen ? "Odstrani" : "Dodaj nastavitve"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${airFryerOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 border-t px-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="program">Program</Label>
                  <Input
                    id="program"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="npr. Air Fry"
                    list="air-fryer-programs"
                    className="h-11 text-base"
                  />
                  <datalist id="air-fryer-programs">
                    {programs.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  {programs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {programs.map((p) => (
                        <Button
                          key={p}
                          type="button"
                          size="sm"
                          variant={
                            fold(p) === fold(program) ? "default" : "outline"
                          }
                          className="h-8 rounded-full"
                          onClick={() => setProgram(p)}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <label
                  htmlFor="preheat"
                  className="flex cursor-pointer items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium">Predgrevanje</span>
                  <Switch
                    id="preheat"
                    checked={preheat}
                    onCheckedChange={setPreheat}
                  />
                </label>

                <div className="space-y-3">
                  <Label>Stopnje</Label>
                  {stages.map((stage, index) => (
                    <div
                      key={stage.key}
                      className="space-y-2 rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {index + 1}. stopnja
                        </span>
                        {stages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Odstrani stopnjo"
                            onClick={() =>
                              setStages((rows) =>
                                rows.filter((r) => r.key !== stage.key),
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input
                            value={stage.tempC}
                            inputMode="numeric"
                            placeholder="200"
                            aria-label="Temperatura"
                            className="h-11 pr-10 text-base"
                            onChange={(e) =>
                              setStages((rows) =>
                                rows.map((r) =>
                                  r.key === stage.key
                                    ? { ...r, tempC: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            °C
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            value={stage.minutes}
                            inputMode="decimal"
                            placeholder="12"
                            aria-label="Minute"
                            className="h-11 pr-12 text-base"
                            onChange={(e) =>
                              setStages((rows) =>
                                rows.map((r) =>
                                  r.key === stage.key
                                    ? { ...r, minutes: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            min
                          </span>
                        </div>
                      </div>
                      <Input
                        value={stage.note}
                        placeholder="Opomba, npr. obrni po 6 min"
                        className="h-11 text-base"
                        onChange={(e) =>
                          setStages((rows) =>
                            rows.map((r) =>
                              r.key === stage.key
                                ? { ...r, note: e.target.value }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  {stages.length < MAX_STAGES && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full"
                      onClick={() =>
                        setStages((rows) => [
                          ...rows,
                          { key: newKey(), tempC: "", minutes: "", note: "" },
                        ])
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Dodaj stopnjo
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="af-note">Splošna opomba</Label>
                  <Textarea
                    id="af-note"
                    value={airFryerNote}
                    onChange={(e) => setAirFryerNote(e.target.value)}
                    rows={2}
                    className="text-base"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => goBack()}
                disabled={isSaving}
              >
                Prekliči
              </Button>
              <Button type="submit" className="h-12 flex-1" disabled={isSaving}>
                {isSaving
                  ? "Shranjevanje..."
                  : isEditing
                    ? "Shrani"
                    : "Dodaj recept"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// "Paste a list, one per line" box under ingredients and steps.
function PasteBox({
  hint,
  onPaste,
}: { hint: string; onPaste: (text: string) => number }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex min-h-9 items-center gap-1 text-sm font-medium text-primary">
        <ClipboardPaste className="h-4 w-4" />
        Prilepi seznam
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        <p className="text-xs text-muted-foreground">{hint}</p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="text-base"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full"
          disabled={!text.trim()}
          onClick={() => {
            const added = onPaste(text);
            toast.success(`Dodanih vrstic: ${added}`);
            setText("");
            setOpen(false);
          }}
        >
          Dodaj vrstice
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
