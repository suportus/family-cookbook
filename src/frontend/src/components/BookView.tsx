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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ChefHat,
  Clock,
  LogOut,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLanguage } from "../hooks/useLanguage";
import {
  useDeleteBook,
  useGetBookMeta,
  useGetBookTags,
  useGetUserRole,
  useLeaveCookbook,
  useListRecipes,
} from "../hooks/useQueries";
import { useButtonHover, useFadePage, useSlideFadeIn } from "../lib/animations";
import { formatDateShort } from "../lib/i18n";
import { useBookContext } from "./BookContext";

const PREDEFINED_TAGS = [
  { en: "Desserts", sl: "Sladice" },
  { en: "Main Dishes", sl: "Glavne jedi" },
  { en: "Holiday Meals", sl: "Praznične jedi" },
  { en: "Quick Meals", sl: "Hitra priprava" },
  { en: "Vegetarian", sl: "Vege" },
  { en: "Vegan", sl: "Vegansko" },
  { en: "Stews", sl: "Enolončnice" },
];

export default function BookView() {
  const {
    selectedBookId,
    setSelectedBookId,
    setSelectedRecipeId,
    setView,
    setEditingRecipeId,
  } = useBookContext();
  const { data: bookMeta } = useGetBookMeta(selectedBookId);
  const { data: userRole } = useGetUserRole(selectedBookId);
  const { data: recipes, isLoading } = useListRecipes(selectedBookId);
  const { data: bookTags } = useGetBookTags(selectedBookId);
  const deleteBook = useDeleteBook();
  const leaveCookbook = useLeaveCookbook();
  const { identity } = useInternetIdentity();
  const { language, t } = useLanguage();

  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  const pageRef = useFadePage();
  const addRecipeButtonRef = useButtonHover();

  const isOwner = userRole === "owner";
  const canAddRecipe = userRole === "owner" || userRole === "editor";
  const canLeave = userRole === "editor" || userRole === "viewer";
  const isBookOwner =
    bookMeta &&
    identity &&
    bookMeta.owner.toString() === identity.getPrincipal().toString();

  const isRecipeAuthor = (authorPrincipal: string): boolean => {
    if (!identity) return false;
    return authorPrincipal === identity.getPrincipal().toString();
  };

  const getTranslatedTag = useCallback(
    (tag: string): string => {
      const predefined = PREDEFINED_TAGS.find((p) => p.en === tag);
      if (predefined) {
        return language === "sl" ? predefined.sl : predefined.en;
      }
      return tag;
    },
    [language],
  );

  const sortTagsAlphabetically = useCallback(
    (tags: string[]): string[] => {
      return [...tags].sort((a, b) => {
        const aTranslated = getTranslatedTag(a);
        const bTranslated = getTranslatedTag(b);
        return aTranslated.localeCompare(bTranslated, language);
      });
    },
    [getTranslatedTag, language],
  );

  const allTags = useMemo(() => {
    const useDefaultTags = bookTags?.useDefaultTags ?? true;

    if (useDefaultTags) {
      const predefinedEnTags = PREDEFINED_TAGS.map((p) => p.en);
      return ["All", ...sortTagsAlphabetically(predefinedEnTags)];
    }
    const customTags = bookTags?.customTags ?? [];

    const recipeTags = new Set<string>();
    if (recipes) {
      for (const recipe of recipes) {
        if (recipe.tags) {
          for (const tag of recipe.tags) {
            recipeTags.add(tag);
          }
        }
      }
    }

    const allCustomTags = [
      ...new Set([...customTags, ...Array.from(recipeTags)]),
    ];
    return ["All", ...sortTagsAlphabetically(allCustomTags)];
  }, [recipes, bookTags, sortTagsAlphabetically]);

  const handleBack = () => {
    setSelectedBookId(null);
    setView("home");
  };

  const handleAddRecipe = () => {
    setEditingRecipeId(null);
    setView("recipeForm");
  };

  const handleRecipeClick = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setView("recipe");
  };

  const handleSettings = () => {
    setView("settings");
  };

  const handleDeleteBook = async () => {
    if (!selectedBookId) return;

    try {
      await deleteBook.mutateAsync(selectedBookId);
      toast.success(t.cookbookDeleted);
      handleBack();
    } catch (error) {
      toast.error(t.failedDeleteCookbook);
      console.error(error);
    }
  };

  const handleLeaveCookbook = async () => {
    if (!selectedBookId) return;

    try {
      await leaveCookbook.mutateAsync(selectedBookId);
      toast.success(t.leftCookbook);
      handleBack();
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("Owners cannot leave")) {
        toast.error(t.ownersCannotLeave);
      } else if (errorMessage.includes("not a member")) {
        toast.error(t.notAMember);
      } else {
        toast.error(t.failedLeaveCookbook);
      }
      console.error(error);
    }
  };

  const sortedRecipes = recipes
    ? [...recipes].sort((a, b) => Number(b.created_at - a.created_at))
    : [];

  const filteredRecipes = sortedRecipes.filter((recipe) => {
    if (selectedFilter === "All") return true;
    return recipe.tags?.includes(selectedFilter);
  });

  return (
    <div ref={pageRef} className="container py-8">
      <div className="mb-6">
        <div className="relative flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight pr-32">
              {bookMeta?.title}
            </h2>
            <p className="text-muted-foreground">
              {userRole === "owner" && t.owner}
              {userRole === "editor" && t.editor}
              {userRole === "viewer" && t.viewer}
            </p>
          </div>
          {isBookOwner && (
            <div className="absolute top-0 right-0">
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {t.myCookbookBadge}
              </span>
            </div>
          )}
        </div>

        <div className="hidden sm:flex sm:justify-end sm:gap-2">
          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleSettings}
              className="rounded-full"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {isBookOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteCookbook}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.deleteCookbookConfirm}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteBook}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canLeave && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.leaveCookbookTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.leaveCookbookConfirm}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveCookbook}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {leaveCookbook.isPending ? t.leaving : t.leaveCookbook}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canAddRecipe && (
            <Button
              ref={addRecipeButtonRef}
              onClick={handleAddRecipe}
              className="rounded-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.addRecipe}
            </Button>
          )}
        </div>

        <div className="flex sm:hidden justify-end gap-2">
          {canAddRecipe && (
            <Button
              onClick={handleAddRecipe}
              size="sm"
              className="rounded-full flex-1"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t.addRecipe}
            </Button>
          )}
          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleSettings}
              className="rounded-full shrink-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {isBookOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteCookbook}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.deleteCookbookConfirm}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteBook}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canLeave && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.leaveCookbookTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.leaveCookbookConfirm}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveCookbook}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {leaveCookbook.isPending ? t.leaving : t.leaveCookbook}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {sortedRecipes.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {allTags.map((filter) => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter)}
                className="rounded-full whitespace-nowrap"
              >
                {filter === "All" ? t.all : getTranslatedTag(filter)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : sortedRecipes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">{t.noRecipesYet}</h3>
            <p className="mb-4 text-center text-muted-foreground">
              {canAddRecipe ? t.addFirstRecipe : t.noRecipesAdded}
            </p>
            {canAddRecipe && (
              <Button onClick={handleAddRecipe} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" />
                {t.addRecipe}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">
              {t.noRecipesInCategory}
            </h3>
            <p className="mb-4 text-center text-muted-foreground">
              {t.tryDifferentFilter}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe, index) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              index={index}
              isRecipeAuthor={isRecipeAuthor}
              handleRecipeClick={handleRecipeClick}
              getTranslatedTag={getTranslatedTag}
              t={t}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  index,
  isRecipeAuthor,
  handleRecipeClick,
  getTranslatedTag,
  t,
  language,
}: any) {
  const cardRef = useSlideFadeIn(index, true);

  return (
    <Card
      ref={cardRef}
      className="relative cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden"
      onClick={() => handleRecipeClick(recipe.id)}
    >
      {isRecipeAuthor(recipe.authorPrincipal.toString()) && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            {t.myRecipeBadge}
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="line-clamp-2 pr-24">{recipe.title}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDateShort(recipe.created_at, language)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {recipe.instructions}
        </p>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {getTranslatedTag(tag)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
