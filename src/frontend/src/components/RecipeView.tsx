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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Copy, Edit, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Variant_ingredient_section } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLanguage } from "../hooks/useLanguage";
import {
  useCopyRecipe,
  useDeleteRecipe,
  useGetBooksForUser,
  useGetRecipe,
  useGetUserRole,
  useMoveRecipe,
} from "../hooks/useQueries";
import { useFadeModal, useFadePage } from "../lib/animations";
import { formatDate } from "../lib/i18n";
import { useBookContext } from "./BookContext";
import ZoomableImageModal from "./ZoomableImageModal";

const PREDEFINED_TAGS = [
  { en: "Desserts", sl: "Sladice" },
  { en: "Main Dishes", sl: "Glavne jedi" },
  { en: "Holiday Meals", sl: "Praznične jedi" },
  { en: "Quick Meals", sl: "Hitra priprava" },
  { en: "Vegetarian", sl: "Vege" },
  { en: "Vegan", sl: "Vegansko" },
  { en: "Stews", sl: "Enolončnice" },
];

export default function RecipeView() {
  const {
    selectedBookId,
    selectedRecipeId,
    setSelectedRecipeId,
    setView,
    setEditingRecipeId,
    setSelectedBookId,
  } = useBookContext();
  const { data: recipe, isLoading: recipeLoading } = useGetRecipe(
    selectedBookId,
    selectedRecipeId,
  );
  const { data: userRole, isLoading: roleLoading } =
    useGetUserRole(selectedBookId);
  const { data: allBooks } = useGetBooksForUser();
  const deleteRecipe = useDeleteRecipe();
  const copyRecipe = useCopyRecipe();
  const moveRecipe = useMoveRecipe();
  const { identity } = useInternetIdentity();
  const { language, t } = useLanguage();
  const [showCopyMoveDialog, setShowCopyMoveDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"copy" | "move" | "">(
    "",
  );
  const [targetBookId, setTargetBookId] = useState<string>("");
  const [showImageZoom, setShowImageZoom] = useState(false);

  const pageRef = useFadePage();
  const modalRef = useFadeModal(showCopyMoveDialog);

  const isOwner = userRole === "owner";
  const isEditor = userRole === "editor";
  const isAuthor =
    recipe &&
    identity &&
    recipe.authorPrincipal.toString() === identity.getPrincipal().toString();

  const canEdit = isOwner || (isEditor && isAuthor);
  const canDelete = isOwner || (isEditor && isAuthor);
  const canCopyMove = isAuthor;

  const ownedCookbooks =
    allBooks?.filter((book) => {
      const isOwnedByUser =
        identity &&
        book.owner.toString() === identity.getPrincipal().toString();
      const isNotCurrentBook = book.id !== selectedBookId;
      return isOwnedByUser && isNotCurrentBook;
    }) || [];

  const getTranslatedTag = (tag: string): string => {
    const predefined = PREDEFINED_TAGS.find((p) => p.en === tag);
    if (predefined) {
      return language === "sl" ? predefined.sl : predefined.en;
    }
    return tag;
  };

  const handleBack = () => {
    setSelectedRecipeId(null);
    setView("book");
  };

  const handleEdit = () => {
    if (selectedRecipeId) {
      setEditingRecipeId(selectedRecipeId);
      setView("recipeForm");
    }
  };

  const handleDelete = async () => {
    if (!selectedBookId || !selectedRecipeId) return;

    try {
      await deleteRecipe.mutateAsync({
        bookId: selectedBookId,
        recipeId: selectedRecipeId,
      });
      toast.success(t.recipeDeleted);
      handleBack();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete recipe";
      if (errorMessage.includes("Unauthorized")) {
        toast.error(t.noPermissionDelete);
      } else {
        toast.error(t.failedDeleteRecipe);
      }
      console.error(error);
    }
  };

  const handleCopyMoveConfirm = async () => {
    if (!selectedAction) {
      toast.error(t.selectActionError);
      return;
    }

    if (!targetBookId) {
      toast.error(t.selectCookbookError);
      return;
    }

    if (!selectedBookId || !selectedRecipeId) return;

    try {
      if (selectedAction === "copy") {
        const newRecipeId = await copyRecipe.mutateAsync({
          sourceBookId: selectedBookId,
          recipeId: selectedRecipeId,
          targetBookId,
        });
        toast.success(t.recipeCopied);
        setShowCopyMoveDialog(false);
        setSelectedBookId(targetBookId);
        setSelectedRecipeId(newRecipeId);
        setView("recipe");
      } else if (selectedAction === "move") {
        await moveRecipe.mutateAsync({
          sourceBookId: selectedBookId,
          recipeId: selectedRecipeId,
          targetBookId,
        });
        toast.success(t.recipeMoved);
        setShowCopyMoveDialog(false);
        setSelectedBookId(targetBookId);
        setSelectedRecipeId(null);
        setView("book");
      }
    } catch (error: any) {
      if (selectedAction === "copy") {
        toast.error(t.failedCopyRecipe);
      } else {
        toast.error(t.failedMoveRecipe);
      }
      console.error(error);
    }
  };

  const handleOpenCopyMoveDialog = () => {
    setSelectedAction("");
    setTargetBookId("");
    setShowCopyMoveDialog(true);
  };

  if (recipeLoading || roleLoading) {
    return (
      <div className="container py-16">
        <div className="flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container py-16">
        <div className="flex flex-col items-center justify-center">
          <p className="text-muted-foreground">{t.recipeNotFound}</p>
          <Button onClick={handleBack} className="mt-4">
            {t.goBack}
          </Button>
        </div>
      </div>
    );
  }

  const isProcessing = copyRecipe.isPending || moveRecipe.isPending;

  return (
    <div ref={pageRef} className="container py-8">
      <div className="mx-auto max-w-3xl">
        <div className="relative mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="flex-1 text-3xl font-bold tracking-tight pr-24">
            {recipe.title}
          </h2>
          {isAuthor && (
            <div className="absolute top-0 right-0">
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {t.myRecipeBadge}
              </span>
            </div>
          )}
        </div>

        <div className="mb-6 flex justify-end gap-2">
          {canCopyMove && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleOpenCopyMoveDialog}
              className="rounded-full"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleEdit}
              className="rounded-full"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
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
                  <AlertDialogTitle>{t.deleteRecipe}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.deleteRecipeConfirm}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>
                  {t.by} {recipe.author}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {t.createdAt} {formatDate(recipe.created_at, language)}
                </span>
              </div>
              {recipe.updated_at !== recipe.created_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {t.updatedAt} {formatDate(recipe.updated_at, language)}
                  </span>
                </div>
              )}
            </div>
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {getTranslatedTag(tag)}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {recipe.imageUrl && (
              <div className="mb-6">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full max-h-96 object-cover rounded-lg border border-border mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowImageZoom(true)}
                  onKeyDown={() => setShowImageZoom(true)}
                />
              </div>
            )}

            <div>
              <h3 className="mb-3 text-xl font-semibold">{t.ingredients}</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient) =>
                  ingredient.ingredientType ===
                  Variant_ingredient_section.section ? (
                    <li
                      key={`section-${ingredient.text}`}
                      className="pt-3 font-bold"
                    >
                      {ingredient.text}
                    </li>
                  ) : (
                    <li
                      key={`item-${ingredient.text}`}
                      className="flex items-start gap-2"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{ingredient.text}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 text-xl font-semibold">{t.instructions}</h3>
              <p className="whitespace-pre-wrap leading-relaxed">
                {recipe.instructions}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCopyMoveDialog} onOpenChange={setShowCopyMoveDialog}>
        <DialogContent ref={modalRef} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.copyOrMoveRecipe}</DialogTitle>
            <DialogDescription>
              {t.copyOrMoveRecipeDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.selectAction}</Label>
              <RadioGroup
                value={selectedAction}
                onValueChange={(value) =>
                  setSelectedAction(value as "copy" | "move")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="copy" id="copy" />
                  <Label htmlFor="copy" className="font-normal cursor-pointer">
                    {t.copyRecipe}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="move" id="move" />
                  <Label htmlFor="move" className="font-normal cursor-pointer">
                    {t.moveRecipe}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t.selectTargetCookbook}</Label>
              {ownedCookbooks.length > 0 ? (
                <Select value={targetBookId} onValueChange={setTargetBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectCookbook} />
                  </SelectTrigger>
                  <SelectContent>
                    {ownedCookbooks.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.noOwnedCookbooks}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleCopyMoveConfirm}
              disabled={
                !selectedAction ||
                !targetBookId ||
                isProcessing ||
                ownedCookbooks.length === 0
              }
              className="w-full sm:w-auto"
            >
              {isProcessing
                ? selectedAction === "copy"
                  ? t.copying
                  : t.moving
                : t.confirm}
            </Button>
            <Button
              onClick={() => setShowCopyMoveDialog(false)}
              variant="outline"
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {recipe.imageUrl && (
        <ZoomableImageModal
          imageUrl={recipe.imageUrl}
          imageAlt={recipe.title}
          isOpen={showImageZoom}
          onClose={() => setShowImageZoom(false)}
        />
      )}
    </div>
  );
}
