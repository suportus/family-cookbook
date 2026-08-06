import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Ingredient } from "../backend";
import { Variant_ingredient_section } from "../backend";
import { useLanguage } from "../hooks/useLanguage";
import {
  useAddRecipe,
  useEditRecipe,
  useGetBookTags,
  useGetRecipe,
  useGetUserRole,
} from "../hooks/useQueries";
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

export default function RecipeForm() {
  const { selectedBookId, editingRecipeId, setView, setEditingRecipeId } =
    useBookContext();
  const { data: existingRecipe } = useGetRecipe(
    selectedBookId,
    editingRecipeId,
  );
  const { data: userRole } = useGetUserRole(selectedBookId);
  const { data: bookTags } = useGetBookTags(selectedBookId);
  const addRecipe = useAddRecipe();
  const editRecipe = useEditRecipe();
  const { language, t } = useLanguage();

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { text: "", ingredientType: Variant_ingredient_section.ingredient },
  ]);
  const [ingredientKeys, setIngredientKeys] = useState<string[]>(() => [
    crypto.randomUUID(),
  ]);
  const [instructions, setInstructions] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");

  const isEditing = !!editingRecipeId;
  const canAddRecipe = userRole === "owner" || userRole === "editor";

  const useDefaultTags = bookTags?.useDefaultTags ?? true;
  const availableCustomTags = bookTags?.customTags ?? [];

  // Load existing recipe data in Edit mode
  useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title);
      const loaded =
        existingRecipe.ingredients.length > 0
          ? existingRecipe.ingredients
          : [
              {
                text: "",
                ingredientType: Variant_ingredient_section.ingredient,
              },
            ];
      setIngredients(loaded);
      setIngredientKeys(loaded.map(() => crypto.randomUUID()));
      setInstructions(existingRecipe.instructions);
      setSelectedTags(existingRecipe.tags || []);
    }
  }, [existingRecipe]);

  const handleBack = () => {
    setEditingRecipeId(null);
    setView("book");
  };

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { text: "", ingredientType: Variant_ingredient_section.ingredient },
    ]);
    setIngredientKeys((prev) => [...prev, crypto.randomUUID()]);
  };

  const handleAddSection = () => {
    setIngredients([
      ...ingredients,
      { text: "", ingredientType: Variant_ingredient_section.section },
    ]);
    setIngredientKeys((prev) => [...prev, crypto.randomUUID()]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
      setIngredientKeys((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], text: value };
    setIngredients(newIngredients);
  };

  const getTranslatedTag = (tag: string): string => {
    const predefined = PREDEFINED_TAGS.find((p) => p.en === tag);
    if (predefined) {
      return language === "sl" ? predefined.sl : predefined.en;
    }
    return tag;
  };

  const sortTagsAlphabetically = (tags: string[]): string[] => {
    return [...tags].sort((a, b) => {
      const aTranslated = getTranslatedTag(a);
      const bTranslated = getTranslatedTag(b);
      return aTranslated.localeCompare(bTranslated, language);
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return sortTagsAlphabetically([...prev, tag]);
    });
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleCustomTagInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setCustomTagInput(value);
  };

  const handleCustomTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedTag = customTagInput.trim();

      if (!trimmedTag) return;

      const isDuplicate = selectedTags.some(
        (existingTag) => existingTag.toLowerCase() === trimmedTag.toLowerCase(),
      );

      if (isDuplicate) {
        toast.error(t.tagAlreadyAdded);
        return;
      }

      setSelectedTags((prev) => sortTagsAlphabetically([...prev, trimmedTag]));
      setCustomTagInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error(t.enterRecipeTitle);
      return;
    }

    const filteredIngredients = ingredients.filter(
      (ing) => ing.text.trim() !== "",
    );
    if (filteredIngredients.length === 0) {
      toast.error(t.addOneIngredient);
      return;
    }

    if (!instructions.trim()) {
      toast.error(t.enterInstructions);
      return;
    }

    if (!selectedBookId) return;

    try {
      // Build the complete payload - imageUrl is always null (image upload disabled)
      const payload = {
        bookId: selectedBookId,
        title: title.trim(),
        ingredients: filteredIngredients,
        instructions: instructions.trim(),
        tags: selectedTags,
        imageUrl: null,
      };

      if (isEditing && editingRecipeId) {
        await editRecipe.mutateAsync({
          ...payload,
          recipeId: editingRecipeId,
        });
        toast.success(t.recipeUpdated);
      } else {
        await addRecipe.mutateAsync(payload);
        toast.success(t.recipeAdded);
      }
      handleBack();
    } catch (error: any) {
      const errorMessage = error?.message || "";

      if (errorMessage.includes("Unauthorized")) {
        if (errorMessage.includes("Viewers cannot")) {
          toast.error(t.viewersCannotEdit);
        } else if (
          errorMessage.includes("Editors can only edit their own recipes")
        ) {
          toast.error(t.editOwnRecipes);
        } else {
          toast.error(t.noPermissionAction);
        }
      } else {
        toast.error(isEditing ? t.failedUpdateRecipe : t.failedAddRecipe);
      }
    }
  };

  if (!canAddRecipe && !isEditing) {
    return (
      <div className="container py-16">
        <div className="flex flex-col items-center justify-center">
          <p className="text-muted-foreground">{t.noPermissionAdd}</p>
          <Button onClick={handleBack} className="mt-4">
            {t.goBack}
          </Button>
        </div>
      </div>
    );
  }

  const displayTags = useDefaultTags
    ? PREDEFINED_TAGS.map((tag) => ({
        value: tag.en,
        label: language === "sl" ? tag.sl : tag.en,
      }))
    : availableCustomTags.map((tag) => ({ value: tag, label: tag }));

  const sortedDisplayTags = displayTags.sort((a, b) =>
    a.label.localeCompare(b.label, language),
  );

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {isEditing ? t.editRecipe : t.addNewRecipe}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? t.updateRecipe : t.createRecipe}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">{t.recipeTitle}</Label>
                <Input
                  id="title"
                  placeholder={t.recipeTitlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t.ingredients}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddIngredient}
                      className="hidden sm:flex rounded-full"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {t.add}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSection}
                      className="hidden sm:flex rounded-full"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {t.addSection}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddIngredient}
                      className="flex sm:hidden rounded-full"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSection}
                      className="flex sm:hidden rounded-full"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Razdelek
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <div
                      key={ingredientKeys[index]}
                      className={`flex gap-2 ${ingredient.ingredientType === Variant_ingredient_section.section ? "pt-3" : ""}`}
                    >
                      <Input
                        placeholder={
                          ingredient.ingredientType ===
                          Variant_ingredient_section.section
                            ? `${t.section} ${index + 1}`
                            : `${t.ingredient} ${index + 1}`
                        }
                        value={ingredient.text}
                        onChange={(e) =>
                          handleIngredientChange(index, e.target.value)
                        }
                        className={
                          ingredient.ingredientType ===
                          Variant_ingredient_section.section
                            ? "font-bold"
                            : ""
                        }
                      />
                      {ingredients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveIngredient(index)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">{t.cookingInstructions}</Label>
                <Textarea
                  id="instructions"
                  placeholder={t.instructionsPlaceholder}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label>{t.tags}</Label>

                <div className="flex flex-wrap gap-4">
                  {sortedDisplayTags.map((tag) => (
                    <div
                      key={tag.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`tag-${tag.value}`}
                        checked={selectedTags.includes(tag.value)}
                        onCheckedChange={() => handleTagToggle(tag.value)}
                      />
                      <label
                        htmlFor={`tag-${tag.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {tag.label}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="customTag"
                    className="text-sm text-muted-foreground"
                  >
                    {t.customTagLabel}
                  </Label>
                  <Input
                    id="customTag"
                    placeholder={t.customTagPlaceholder}
                    value={customTagInput}
                    onChange={handleCustomTagInputChange}
                    onKeyDown={handleCustomTagKeyDown}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.customTagHint}
                  </p>
                </div>

                {selectedTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {t.selectedTags}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {sortTagsAlphabetically(selectedTags).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          <span>{getTranslatedTag(tag)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  {t.cancel}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={addRecipe.isPending || editRecipe.isPending}
                >
                  {addRecipe.isPending || editRecipe.isPending
                    ? isEditing
                      ? t.updating
                      : t.adding
                    : isEditing
                      ? t.updateRecipeButton
                      : t.addRecipeButton}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
