import { Input } from "@/components/ui/input";
import { Search, Wind } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { navigate } from "../hooks/useRoute";
import {
  type RecipeData,
  compareTitles,
  formatNumber,
  matchesSearch,
} from "../lib/recipe";

function joinValues(values: (number | null)[], unit: string): string {
  const shown = values.filter((v): v is number => v !== null).map(formatNumber);
  if (!shown.length) return "";
  return unit ? `${shown.join(" / ")} ${unit}` : shown.join(" / ");
}

// All air fryer settings in one table: food, program, temperature, time, note.
// `scopeToggle` ("Vsi / Moji") is only given when there are two or more authors.
export default function AirFryerPage({
  recipes,
  scopeToggle,
}: {
  recipes: RecipeData[];
  scopeToggle: ReactNode;
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      recipes
        .filter((r) => r.airFryer)
        .filter((r) =>
          matchesSearch(query, [r.title, r.airFryer?.program ?? "", ...r.tags]),
        )
        .sort((a, b) => compareTitles(a.title, b.title)),
    [recipes, query],
  );

  return (
    <div className="container px-4 py-4 pb-16">
      <h2 className="mb-3 flex items-center gap-2 text-3xl font-bold tracking-tight">
        <Wind className="h-7 w-7 text-primary" />
        Air fryer
      </h2>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Išči jed ali program ..."
            className="h-12 rounded-full pl-10 text-base"
          />
        </div>
        {scopeToggle}
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {query
            ? "Ni zadetkov."
            : "Noben recept še nima nastavitev za air fryer."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Jed</th>
                <th className="px-3 py-2 font-semibold">Program</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                  °C
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                  Čas
                </th>
                <th className="px-3 py-2 font-semibold">Opomba</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const af = r.airFryer;
                if (!af) return null;
                const notes = [
                  af.preheat ? "predgrej" : "",
                  ...af.stages.map((s) => s.note),
                  af.note,
                ].filter(Boolean);
                return (
                  <tr
                    key={String(r.id)}
                    tabIndex={0}
                    onClick={() => navigate({ name: "recipe", id: r.id })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate({ name: "recipe", id: r.id });
                    }}
                    className="cursor-pointer border-t align-top hover:bg-muted/50 active:bg-muted"
                  >
                    <td className="px-3 py-3 font-semibold">{r.title}</td>
                    <td className="px-3 py-3">{af.program}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums">
                      {joinValues(
                        af.stages.map((s) => s.tempC),
                        "",
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums">
                      {joinValues(
                        af.stages.map((s) => s.minutes),
                        "min",
                      )}
                    </td>
                    <td className="min-w-[8rem] px-3 py-3 text-muted-foreground">
                      {notes.join(" · ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
