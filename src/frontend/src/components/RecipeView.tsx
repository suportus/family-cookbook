import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Edit,
  Flame,
  RotateCcw,
  Share2,
  Sun,
  Trash2,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { useDeleteRecipe } from "../hooks/useQueries";
import { navigate } from "../hooks/useRoute";
import { useTicks } from "../hooks/useTicks";
import { useWakeLock } from "../hooks/useWakeLock";
import { backendErrorMessage } from "../lib/canisterEnv";
import {
  type RecipeData,
  formatDate,
  formatNumber,
  shareText,
} from "../lib/recipe";

export default function RecipeView({ recipe }: { recipe: RecipeData }) {
  const deleteRecipe = useDeleteRecipe();
  const { ticked, toggle, reset } = useTicks(recipe.id, recipe.updatedAt);
  const wakeLock = useWakeLock();
  const af = recipe.airFryer;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText(recipe));
      toast.success("Recept je kopiran. Prilepite ga v WhatsApp ali Viber.");
    } catch {
      toast.error("Kopiranje ni uspelo");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecipe.mutateAsync(recipe.id);
      toast.success("Recept je izbrisan");
      navigate({ name: "list" }, { replace: true });
    } catch (error) {
      toast.error(backendErrorMessage(error, "Brisanje ni uspelo"));
    }
  };

  return (
    <div className="container max-w-3xl px-4 py-4 pb-16">
      <h2 className="mb-2 text-3xl font-bold leading-tight tracking-tight">
        {recipe.title}
      </h2>
      {recipe.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {af && (
        <div className="mb-6 rounded-xl border-2 border-primary bg-primary/10 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold uppercase">
              {af.program || "Air fryer"}
            </span>
            {af.preheat && (
              <Badge className="gap-1">
                <Flame className="h-3 w-3" />
                Predgrevanje
              </Badge>
            )}
          </div>
          {af.stages.length > 0 && (
            <ol className="space-y-2">
              {af.stages.map((stage, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stages have no id
                <li key={i} className="flex flex-wrap items-baseline gap-x-3">
                  {af.stages.length > 1 && (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {i + 1}.
                    </span>
                  )}
                  {stage.tempC !== null && (
                    <span className="text-3xl font-extrabold tabular-nums">
                      {formatNumber(stage.tempC)} °C
                    </span>
                  )}
                  {stage.minutes !== null && (
                    <span className="text-3xl font-extrabold tabular-nums">
                      {formatNumber(stage.minutes)} min
                    </span>
                  )}
                  {stage.note && (
                    <span className="w-full text-base font-medium">
                      {stage.note}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          {af.note && <p className="mt-3 text-base">{af.note}</p>}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-full"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          Deli
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-full"
          onClick={() => navigate({ name: "edit", id: recipe.id })}
        >
          <Edit className="h-4 w-4" />
          Uredi
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full text-destructive hover:text-destructive"
              aria-label="Izbriši"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Izbriši recept?</AlertDialogTitle>
              <AlertDialogDescription>
                Recept »{recipe.title}« bo trajno izbrisan. Tega ni mogoče
                razveljaviti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Prekliči</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Izbriši
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <label
        htmlFor="keep-screen-on"
        className="mb-6 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3"
      >
        <Sun className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1">
          <span className="block font-medium">Zaslon naj ostane prižgan</span>
          {!wakeLock.supported && (
            <span className="block text-xs text-muted-foreground">
              Ta brskalnik tega ne podpira.
            </span>
          )}
          {wakeLock.enabled && wakeLock.supported && !wakeLock.active && (
            <span className="block text-xs text-muted-foreground">
              Ni bilo mogoče vklopiti.
            </span>
          )}
        </span>
        <Switch
          id="keep-screen-on"
          checked={wakeLock.enabled}
          onCheckedChange={wakeLock.setEnabled}
          disabled={!wakeLock.supported}
        />
      </label>

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          {recipe.ingredients.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Sestavine</h3>
                {ticked.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 rounded-full"
                    onClick={reset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Počisti kljukice
                  </Button>
                )}
              </div>
              <ul className="space-y-1">
                {recipe.ingredients.map((row, i) =>
                  row.kind === "section" ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
                    <li key={i} className="pt-3 font-bold">
                      {row.text}
                    </li>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
                    <li key={i}>
                      <label
                        htmlFor={`tick-${i}`}
                        className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5"
                      >
                        <Checkbox
                          id={`tick-${i}`}
                          checked={ticked.has(i)}
                          onCheckedChange={() => toggle(i)}
                          className="mt-0.5 h-5 w-5"
                        />
                        <span
                          className={
                            ticked.has(i)
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {row.text}
                        </span>
                      </label>
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}

          {recipe.steps.length > 0 && (
            <section>
              <h3 className="mb-3 text-xl font-semibold">Navodila</h3>
              <ol className="space-y-4">
                {recipe.steps.map((step, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: steps have no id
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="whitespace-pre-wrap pt-0.5 leading-relaxed">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {recipe.ingredients.length === 0 && recipe.steps.length === 0 && (
            <p className="text-muted-foreground">
              Ta recept nima sestavin ali navodil.
            </p>
          )}

          <p className="border-t pt-4 text-sm text-muted-foreground">
            Dodano {formatDate(recipe.createdAt)}
            {recipe.updatedAt !== recipe.createdAt && (
              <> · Spremenjeno {formatDate(recipe.updatedAt)}</>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
