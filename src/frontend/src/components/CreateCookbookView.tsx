import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../hooks/useLanguage";
import { useCreateBook } from "../hooks/useQueries";
import { useButtonHover, useFadePage } from "../lib/animations";
import { useBookContext } from "./BookContext";

export default function CreateCookbookView() {
  const createBook = useCreateBook();
  const { setView } = useBookContext();
  const { t } = useLanguage();

  const [cookbookName, setCookbookName] = useState("");
  const [useDefaultTags, setUseDefaultTags] = useState(true);
  const [customTags, setCustomTags] = useState<string[]>([""]);

  const pageRef = useFadePage();
  const createButtonRef = useButtonHover();

  const defaultTags = [
    t.tagDesserts,
    t.tagHolidayMeals,
    t.tagMainDishes,
    t.tagQuickMeals,
    t.tagStews,
    t.tagVegan,
    t.tagVegetarian,
  ];

  const handleAddCustomTag = () => {
    setCustomTags([...customTags, ""]);
  };

  const handleRemoveCustomTag = (index: number) => {
    const newTags = customTags.filter((_, i) => i !== index);
    if (newTags.length === 0) {
      setCustomTags([""]);
    } else {
      setCustomTags(newTags);
    }
  };

  const handleCustomTagChange = (index: number, value: string) => {
    const newTags = [...customTags];
    newTags[index] = value;
    setCustomTags(newTags);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cookbookName.trim()) {
      toast.error(t.enterTitleError);
      return;
    }

    try {
      const finalCustomTags = useDefaultTags
        ? []
        : customTags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .sort((a, b) => a.localeCompare(b));

      await createBook.mutateAsync({
        title: cookbookName.trim(),
        useDefaultTags,
        customTags: finalCustomTags,
      });

      toast.success(t.cookbookCreated);
      setView("home");
    } catch (error) {
      toast.error("Failed to create cookbook");
      console.error(error);
    }
  };

  const sortedCustomTags = [...customTags].sort((a, b) => {
    if (!a.trim()) return 1;
    if (!b.trim()) return -1;
    return a.trim().localeCompare(b.trim());
  });

  return (
    <div ref={pageRef} className="container max-w-2xl py-8">
      <Button variant="ghost" onClick={() => setView("home")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t.goBack}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t.createNewCookbook}</CardTitle>
          <CardDescription>{t.createCookbookDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cookbook Name */}
            <div className="space-y-2">
              <Label htmlFor="cookbookName">{t.cookbookName}</Label>
              <Input
                id="cookbookName"
                placeholder={t.cookbookTitlePlaceholder}
                value={cookbookName}
                onChange={(e) => setCookbookName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Use Default Tags Toggle */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="useDefaultTags" className="text-base">
                  {t.useDefaultTags}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.useDefaultTagsDescription}
                </p>
              </div>
              <Switch
                id="useDefaultTags"
                checked={useDefaultTags}
                onCheckedChange={setUseDefaultTags}
              />
            </div>

            {/* Default Tags Preview */}
            {useDefaultTags && (
              <div className="space-y-3">
                <Label>{t.defaultTagsPreview}</Label>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex flex-wrap gap-2">
                    {defaultTags
                      .sort((a, b) => a.localeCompare(b))
                      .map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground opacity-60"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t.defaultTagsNote}
                  </p>
                </div>
              </div>
            )}

            {/* Custom Tags */}
            {!useDefaultTags && (
              <div className="space-y-3">
                <Label>{t.customTags}</Label>
                <div className="space-y-2">
                  {sortedCustomTags.map((tag) => {
                    const originalIndex = customTags.indexOf(tag);
                    return (
                      <div
                        key={originalIndex}
                        className="flex items-center gap-2"
                      >
                        <Input
                          placeholder={t.customTagInputPlaceholder}
                          value={tag}
                          onChange={(e) =>
                            handleCustomTagChange(originalIndex, e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomTag(originalIndex)}
                          disabled={customTags.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomTag}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t.addTag}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t.customTagsNote}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setView("home")}
                className="flex-1"
              >
                {t.cancel}
              </Button>
              <Button
                ref={createButtonRef}
                type="submit"
                disabled={createBook.isPending}
                className="flex-1"
              >
                {createBook.isPending ? t.creating : t.createCookbook}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
