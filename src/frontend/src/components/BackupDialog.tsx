import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMe, useRecipes } from "../hooks/useQueries";
import {
  backupFileName,
  backupJson,
  downloadText,
  parseBackup,
} from "../lib/backup";
import ImportPreview, { type ImportCandidate } from "./ImportPreview";

export default function BackupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: all = [], isSuccess } = useRecipes();
  // A contributor backs up only their own recipes.
  const isOwner = useMe().data?.isOwner ?? false;
  const recipes = isOwner ? all : all.filter((r) => r.isMine);
  const fileInput = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);

  const close = (next: boolean) => {
    if (!next) setCandidates(null);
    onOpenChange(next);
  };

  const handleExport = () => {
    downloadText(backupFileName(), backupJson(recipes), "application/json");
    toast.success(`Izvoženih receptov: ${recipes.length}`);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.length) {
        toast.error("V datoteki ni receptov.");
        return;
      }
      setCandidates(parsed);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Branje datoteke ni uspelo.",
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Varnostna kopija</DialogTitle>
          <DialogDescription>
            {isOwner ? "Vsi recepti" : "Vaši recepti"} v eni datoteki JSON.
            Shranite jo na varno mesto, npr. v oblak ali na računalnik.
          </DialogDescription>
        </DialogHeader>

        {candidates ? (
          <ImportPreview
            candidates={candidates}
            onCancel={() => setCandidates(null)}
            onDone={() => close(false)}
          />
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2 rounded-lg border p-4">
              <p className="font-medium">Izvozi</p>
              <p className="text-sm text-muted-foreground">
                {isOwner
                  ? `Prenese datoteko z vsemi recepti (${recipes.length}).`
                  : `Prenese datoteko z vašimi recepti (${recipes.length}).`}
              </p>
              <Button
                className="w-full gap-2"
                onClick={handleExport}
                disabled={!isSuccess}
              >
                <Download className="h-4 w-4" />
                Prenesi varnostno kopijo
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <p className="font-medium">Uvozi</p>
              <p className="text-sm text-muted-foreground">
                Doda recepte iz varnostne kopije. Ničesar ne izbriše in ne
                prepiše. Pred shranjevanjem boste videli predogled.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInput.current?.click()}
                disabled={!isSuccess}
              >
                <Upload className="h-4 w-4" />
                Izberi datoteko
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
