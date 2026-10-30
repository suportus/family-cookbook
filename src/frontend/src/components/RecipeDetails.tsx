import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Flame, RotateCcw, Sun, Wind } from "lucide-react";
import type { ReactNode } from "react";
import type { Ticks } from "../hooks/useTicks";
import { useWakeLock } from "../hooks/useWakeLock";
import { type RecipeBody, formatNumber, stepNumbers } from "../lib/recipe";

// How a recipe is shown, both on the recipe page and on a shared link.
// `actions` (buttons) and `footer` (dates) are only given on the recipe page.
export default function RecipeDetails({
  title,
  body,
  ticks,
  actions,
  footer,
}: {
  title: string;
  body: RecipeBody;
  ticks: Ticks;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  const { ticked, toggle, reset } = ticks;
  const wakeLock = useWakeLock();
  const af = body.airFryer;
  const numbers = stepNumbers(body.steps);

  return (
    <div className="container max-w-3xl px-4 py-4 pb-16">
      <h2 className="mb-2 text-3xl font-bold leading-tight tracking-tight">
        {title}
      </h2>
      {body.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {body.tags.map((tag) => (
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

      {actions}

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
          {body.ingredients.length > 0 && (
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
                {body.ingredients.map((row, i) =>
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

          {body.steps.length > 0 && (
            <section>
              <h3 className="mb-3 text-xl font-semibold">Navodila</h3>
              <ol className="space-y-4">
                {body.steps.map((row, i) =>
                  row.kind === "section" ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: steps have no id
                    <li key={i} className="pt-2 text-lg font-bold">
                      {row.text}
                    </li>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: steps have no id
                    <li key={i} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {numbers[i]}
                      </span>
                      <p className="whitespace-pre-wrap pt-0.5 leading-relaxed">
                        {row.text}
                      </p>
                    </li>
                  ),
                )}
              </ol>
            </section>
          )}

          {body.ingredients.length === 0 && body.steps.length === 0 && (
            <p className="text-muted-foreground">
              Ta recept nima sestavin ali navodil.
            </p>
          )}

          {footer}
        </CardContent>
      </Card>
    </div>
  );
}
