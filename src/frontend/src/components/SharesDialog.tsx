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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Link2Off } from "lucide-react";
import { toast } from "sonner";
import {
  useRevokeAllShares,
  useRevokeShare,
  useShares,
} from "../hooks/useQueries";
import { backendErrorMessage } from "../lib/canisterEnv";
import { formatDate } from "../lib/recipe";
import { shareUrl } from "../lib/share";

// Profile menu -> "Skupne povezave": every active read-only link.
export default function SharesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shares = useShares();
  const revokeShare = useRevokeShare();
  const revokeAll = useRevokeAllShares();
  const list = shares.data ?? [];

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success("Povezava je kopirana");
    } catch {
      toast.error("Kopiranje ni uspelo");
    }
  };

  const handleRevoke = async (recipeId: bigint) => {
    try {
      await revokeShare.mutateAsync(recipeId);
      toast.success("Povezava je preklicana");
    } catch (error) {
      toast.error(backendErrorMessage(error, "Preklic ni uspel"));
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAll.mutateAsync();
      toast.success("Vse povezave so preklicane");
    } catch (error) {
      toast.error(backendErrorMessage(error, "Preklic ni uspel"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skupne povezave</DialogTitle>
          <DialogDescription>
            Kdor ima povezavo, lahko recept prebere brez prijave. Preklicana
            povezava takoj preneha delovati.
          </DialogDescription>
        </DialogHeader>

        {shares.isPending ? (
          <p className="py-4 text-center text-muted-foreground">Nalagam ...</p>
        ) : shares.isError ? (
          <p className="py-4 text-center text-muted-foreground">
            Povezav ni bilo mogoče naložiti.
          </p>
        ) : list.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            Ni aktivnih povezav. Povezavo ustvarite na receptu z »Deli«.
          </p>
        ) : (
          <>
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {list.map((s) => (
                <li
                  key={s.token}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Ustvarjeno {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    aria-label="Kopiraj povezavo"
                    onClick={() => handleCopy(s.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-destructive hover:text-destructive"
                    aria-label="Prekliči povezavo"
                    disabled={revokeShare.isPending}
                    onClick={() => handleRevoke(s.recipeId)}
                  >
                    <Link2Off className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full rounded-full text-destructive hover:text-destructive"
                  disabled={revokeAll.isPending}
                >
                  Prekliči vse
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Prekliči vse povezave?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vseh {list.length} povezav bo takoj prenehalo delovati.
                    Recepti ostanejo. Za ponovno deljenje ustvarite nove
                    povezave.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Ne</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevokeAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Prekliči vse
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
