import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import AirFryerPage from "./components/AirFryerPage";
import Header from "./components/Header";
import LoginScreen from "./components/LoginScreen";
import { PrincipalDisplay } from "./components/PrincipalDisplay";
import RecipeForm from "./components/RecipeForm";
import RecipeList, { type ListState } from "./components/RecipeList";
import RecipeView from "./components/RecipeView";
import SharedRecipePage from "./components/SharedRecipePage";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useRecipes } from "./hooks/useQueries";
import { type Route, navigate, useRoute } from "./hooks/useRoute";
import { isAccessDenied } from "./lib/canisterEnv";
import type { RecipeData } from "./lib/recipe";

const SORT_KEY = "kuharica:sort";

function Spinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="container px-4 py-16 text-center">
      <p className="mb-4 text-lg">Recept ne obstaja.</p>
      <Button
        className="rounded-full"
        onClick={() => navigate({ name: "list" }, { replace: true })}
      >
        Na seznam receptov
      </Button>
    </div>
  );
}

function Screen({
  route,
  recipes,
  listState,
  setListState,
}: {
  route: Route;
  recipes: RecipeData[];
  listState: ListState;
  setListState: (s: ListState) => void;
}) {
  switch (route.name) {
    case "list":
      return (
        <RecipeList
          recipes={recipes}
          state={listState}
          onChange={setListState}
        />
      );
    case "airFryer":
      return <AirFryerPage recipes={recipes} />;
    case "new":
      return <RecipeForm allRecipes={recipes} />;
    // Handled in App before sign-in; never reached here.
    case "shared":
      return null;
    case "recipe":
    case "edit": {
      const recipe = recipes.find((r) => r.id === route.id);
      if (!recipe) return <NotFound />;
      // Keyed so per-recipe state (tick-offs, form fields) starts fresh.
      return route.name === "recipe" ? (
        <RecipeView key={`${recipe.id}-${recipe.updatedAt}`} recipe={recipe} />
      ) : (
        <RecipeForm
          key={String(recipe.id)}
          recipe={recipe}
          allRecipes={recipes}
        />
      );
    }
  }
}

function MainApp() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const route = useRoute();
  const recipes = useRecipes();
  const [listState, setListState] = useState<ListState>(() => ({
    query: "",
    tag: null,
    sort: localStorage.getItem(SORT_KEY) === "title" ? "title" : "newest",
  }));

  useEffect(() => {
    localStorage.setItem(SORT_KEY, listState.sort);
  }, [listState.sort]);

  if (isInitializing) return <Spinner />;
  if (!identity) return <LoginScreen />;

  if (recipes.error) {
    // Not on the allow-list (or backend unreachable): show the principal so it
    // can be added with addUser.
    const denied = isAccessDenied(recipes.error);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold">
              {denied ? "Dostop zavrnjen" : "Napaka pri povezavi"}
            </CardTitle>
            <CardDescription className="text-base">
              {denied
                ? "Vaš račun še nima dostopa. Spodnji principal pošljite skrbniku, da vas doda."
                : "Povezava z zaledjem ni uspela. Poskusite znova pozneje."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <PrincipalDisplay principal={identity.getPrincipal().toText()} />
            </div>
            {!denied && (
              <Button onClick={() => recipes.refetch()} className="w-full">
                Poskusi znova
              </Button>
            )}
            <Button
              onClick={() => {
                clear();
                queryClient.clear();
              }}
              variant="outline"
              className="w-full"
            >
              Odjava
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header route={route} />
      <main className="flex-1">
        {recipes.data ? (
          <Screen
            route={route}
            recipes={recipes.data}
            listState={listState}
            setListState={setListState}
          />
        ) : (
          <Spinner />
        )}
      </main>
    </div>
  );
}

// A share link (#/s/<token>) is checked before sign-in and the allow-list:
// visitors only see that one recipe, never the login screen.
function Root() {
  const route = useRoute();
  return route.name === "shared" ? (
    <SharedRecipePage key={route.token} token={route.token} />
  ) : (
    <MainApp />
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Root />
      <Toaster />
    </ThemeProvider>
  );
}
