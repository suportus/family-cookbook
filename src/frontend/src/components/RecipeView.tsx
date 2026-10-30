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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Edit, Link, Link2Off, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateShare,
  useDeleteRecipe,
  useRevokeShare,
  useShares,
} from "../hooks/useQueries";
import { navigate } from "../hooks/useRoute";
import { useTicks } from "../hooks/useTicks";
import { backendErrorMessage } from "../lib/canisterEnv";
import { type RecipeData, formatDate, shareText } from "../lib/recipe";
import { shareLink, shareUrl } from "../lib/share";
import RecipeDetails from "./RecipeDetails";

// Edit, delete and the share menu are shown only when the backend says the
// user may change the recipe (author or owner); the backend enforces it too.
// `showAuthor`: there are two or more authors, so others' names are shown.
export default function RecipeView({
  recipe,
  showAuthor,
}: {
  recipe: RecipeData;
  showAuthor: boolean;
}) {
  const deleteRecipe = useDeleteRecipe();
  const shares = useShares();
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();
  const ticks = useTicks(recipe.id, recipe.updatedAt);
  const share = shares.data?.find((s) => s.recipeId === recipe.id);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText(recipe));
      toast.success("Recept je kopiran. Prilepite ga v WhatsApp ali Viber.");
    } catch {
      toast.error("Kopiranje ni uspelo");
    }
  };

  const handleShareLink = async () => {
    try {
      // An existing link is used right away (no wait, so the share sheet is
      // still allowed to open); otherwise the backend creates one.
      const token = share?.token ?? (await createShare.mutateAsync(recipe.id));
      await shareLink(shareUrl(token), recipe.title);
    } catch (error) {
      toast.error(
        backendErrorMessage(error, "Povezave ni bilo mogoče ustvariti"),
      );
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeShare.mutateAsync(recipe.id);
      toast.success("Povezava je preklicana. Stara povezava ne deluje več.");
    } catch (error) {
      toast.error(backendErrorMessage(error, "Preklic ni uspel"));
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

  const actions = recipe.canEdit && (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 gap-2 rounded-full"
            disabled={createShare.isPending}
          >
            <Share2 className="h-4 w-4" />
            {createShare.isPending ? "Pripravljam ..." : "Deli"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            onClick={handleCopyText}
            className="cursor-pointer py-2.5"
          >
            <Copy className="mr-3 h-4 w-4 text-muted-foreground" />
            Kopiraj besedilo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleShareLink}
            className="cursor-pointer py-2.5"
          >
            <Link className="mr-3 h-4 w-4 text-muted-foreground" />
            Deli povezavo (samo branje)
          </DropdownMenuItem>
          {share && (
            <DropdownMenuItem
              onClick={handleRevokeLink}
              className="cursor-pointer py-2.5 text-destructive focus:text-destructive"
            >
              <Link2Off className="mr-3 h-4 w-4" />
              Prekliči povezavo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
              {share && " Njegova skupna povezava bo prenehala delovati."}
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
  );

  return (
    <RecipeDetails
      title={recipe.title}
      body={recipe}
      ticks={ticks}
      actions={actions}
      footer={
        <p className="border-t pt-4 text-sm text-muted-foreground">
          {showAuthor && !recipe.isMine && <>Avtor: {recipe.authorName} · </>}
          Dodano {formatDate(recipe.createdAt)}
          {recipe.updatedAt !== recipe.createdAt && (
            <> · Spremenjeno {formatDate(recipe.updatedAt)}</>
          )}
        </p>
      }
    />
  );
}
