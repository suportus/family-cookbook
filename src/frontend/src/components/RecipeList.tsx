import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChefHat, Plus, Search, X } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { navigate } from "../hooks/useRoute";
import {
  type RecipeData,
  airFryerLine,
  authorKey,
  compareTitles,
  fold,
  matchesSearch,
  searchTexts,
} from "../lib/recipe";

export type ListState = {
  query: string;
  tag: string | null;
  sort: "newest" | "title";
  // Author filter (see authorKey); null: every author.
  author: string | null;
};

const ALL_AUTHORS = "all";

// `authors` and `scopeToggle` are only given when there are two or more
// authors; with one author the list looks as it did before authors existed.
export default function RecipeList({
  recipes,
  state,
  onChange,
  authors,
  scopeToggle,
}: {
  recipes: RecipeData[];
  state: ListState;
  onChange: (state: ListState) => void;
  authors: { key: string; label: string }[];
  scopeToggle: ReactNode;
}) {
  // An author that no longer has recipes in view filters nothing.
  const author = authors.some((a) => a.key === state.author)
    ? state.author
    : null;

  // Only tags that are actually used, for the chips.
  const tags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tag of recipes.flatMap((r) => r.tags)) {
      if (!seen.has(fold(tag))) seen.set(fold(tag), tag);
    }
    return [...seen.values()].sort(compareTitles);
  }, [recipes]);

  const shown = useMemo(() => {
    const filtered = recipes.filter(
      (r) =>
        (!state.tag || r.tags.some((t) => fold(t) === fold(state.tag ?? ""))) &&
        (!author || authorKey(r) === author) &&
        matchesSearch(state.query, searchTexts(r)),
    );
    return filtered.sort((a, b) =>
      state.sort === "title"
        ? compareTitles(a.title, b.title)
        : Number(b.createdAt - a.createdAt) || Number(b.id - a.id),
    );
  }, [recipes, state, author]);

  return (
    <div className="container px-4 py-4 pb-28">
      <div className="sticky top-16 z-40 -mx-4 space-y-3 bg-background/95 px-4 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={state.query}
              onChange={(e) => onChange({ ...state, query: e.target.value })}
              placeholder="Išči recept, sestavino, oznako ..."
              className="h-12 rounded-full pl-10 pr-10 text-base"
              enterKeyHint="search"
            />
            {state.query && (
              <button
                type="button"
                onClick={() => onChange({ ...state, query: "" })}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Počisti iskanje"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {scopeToggle}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
            <Button
              variant={state.tag === null ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ ...state, tag: null })}
              className="h-9 shrink-0 rounded-full"
            >
              Vse
            </Button>
            {tags.map((tag) => (
              <Button
                key={tag}
                variant={state.tag === tag ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  onChange({ ...state, tag: state.tag === tag ? null : tag })
                }
                className="h-9 shrink-0 whitespace-nowrap rounded-full"
              >
                {tag}
              </Button>
            ))}
          </div>
          {authors.length > 1 && (
            <Select
              value={author ?? ALL_AUTHORS}
              onValueChange={(v) =>
                onChange({ ...state, author: v === ALL_AUTHORS ? null : v })
              }
            >
              <SelectTrigger
                className="h-9 w-auto max-w-[45%] shrink-0 rounded-full"
                aria-label="Avtor"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_AUTHORS}>Avtor: vsi</SelectItem>
                {authors.map((a) => (
                  <SelectItem key={a.key} value={a.key}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {shown.length === recipes.length
              ? `Receptov: ${recipes.length}`
              : `Prikazanih: ${shown.length} od ${recipes.length}`}
          </span>
          <div className="flex rounded-full border p-0.5">
            {(
              [
                ["newest", "Najnovejši"],
                ["title", "A–Ž"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...state, sort: value })}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  state.sort === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {recipes.length === 0 ? (
        <Card className="mt-4 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">Še ni receptov</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Dodajte prvi recept z gumbom +, ali jih uvozite iz menija.
            </p>
          </CardContent>
        </Card>
      ) : shown.length === 0 ? (
        <Card className="mt-4 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">Ni zadetkov</h3>
            <p className="text-center text-muted-foreground">
              Poskusite z drugo besedo ali oznako.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((recipe) => (
            <RecipeCard
              key={String(recipe.id)}
              recipe={recipe}
              showAuthor={authors.length > 1}
            />
          ))}
        </div>
      )}

      <Button
        onClick={() => navigate({ name: "new" })}
        className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-lg"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Nov recept"
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
}

function RecipeCard({
  recipe,
  showAuthor,
}: {
  recipe: RecipeData;
  showAuthor: boolean;
}) {
  const line = airFryerLine(recipe.airFryer);
  return (
    <button
      type="button"
      onClick={() => navigate({ name: "recipe", id: recipe.id })}
      className="block w-full text-left transition-transform active:scale-[0.99]"
    >
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg">
        <CardHeader className="space-y-1 p-4">
          <CardTitle className="text-lg leading-snug">{recipe.title}</CardTitle>
          {line && <p className="text-sm font-bold text-primary">{line}</p>}
          {showAuthor && !recipe.isMine && (
            <p className="text-sm text-muted-foreground">{recipe.authorName}</p>
          )}
        </CardHeader>
        {recipe.tags.length > 0 && (
          <CardContent className="flex flex-wrap gap-1 px-4 pb-4 pt-0">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </CardContent>
        )}
      </Card>
    </button>
  );
}
