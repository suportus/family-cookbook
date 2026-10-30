import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useSharedRecipe } from "../hooks/useQueries";
import { useMemoryTicks } from "../hooks/useTicks";
import RecipeDetails from "./RecipeDetails";

// A recipe opened from a read-only share link: no sign-in, no editing, no
// way to the other recipes.
export default function SharedRecipePage({ token }: { token: string }) {
  const { theme, setTheme } = useTheme();
  const shared = useSharedRecipe(token);
  const ticks = useMemoryTicks();
  const title = shared.data?.title;

  useEffect(() => {
    if (title) document.title = `${title} – Družinska kuharica`;
  }, [title]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/icons/icon-192.png" alt="" className="h-8 w-8" />
            <h1 className="truncate text-xl font-bold">Družinska kuharica</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Svetla/temna tema</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {shared.isPending ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : shared.data ? (
          <RecipeDetails
            title={shared.data.title}
            body={shared.data}
            ticks={ticks}
          />
        ) : (
          <div className="container max-w-md px-4 py-16 text-center">
            {shared.isError ? (
              <>
                <p className="mb-2 text-lg font-semibold">
                  Recepta ni bilo mogoče naložiti.
                </p>
                <p className="mb-6 text-muted-foreground">
                  Preverite internetno povezavo in poskusite znova.
                </p>
                <Button
                  className="rounded-full"
                  onClick={() => shared.refetch()}
                >
                  Poskusi znova
                </Button>
              </>
            ) : (
              <>
                <p className="mb-2 text-lg font-semibold">
                  Ta povezava ne deluje.
                </p>
                <p className="text-muted-foreground">
                  Recept ne obstaja več ali pa je bila povezava preklicana. Za
                  novo povezavo prosite osebo, ki vam jo je poslala.
                </p>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        Družinska kuharica
      </footer>
    </div>
  );
}
