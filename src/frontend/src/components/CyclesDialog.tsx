import { AlertTriangle, ExternalLink, Fuel, RefreshCw } from "lucide-react";
import { useGetCycleBalance } from "../hooks/useQueries";
import { getCanisterEnv } from "../lib/canisterEnv";
import { PrincipalDisplay } from "./PrincipalDisplay";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface CyclesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Below this balance the dialog shows a warning (1 T cycles).
const LOW_CYCLES_THRESHOLD = 1_000_000_000_000n;

// Official OISY address, from the dfinity/oisy-wallet README.
const OISY_URL = "https://oisy.com/";

function formatTrillions(cycles: bigint): string {
  const trillions = Number(cycles) / 1e12;
  return `${trillions.toLocaleString("sl-SI", { maximumFractionDigits: 3 })} T`;
}

export function CyclesDialog({ open, onOpenChange }: CyclesDialogProps) {
  const {
    data: balance,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetCycleBalance(open);
  const { backendId, frontendId } = getCanisterEnv();
  const isLow = balance !== undefined && balance < LOW_CYCLES_THRESHOLD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cikli</DialogTitle>
          <DialogDescription>
            Cikli so gorivo, s katerim aplikacija deluje. Počasi se porabljajo
            za vsako dejanje in za shranjene podatke.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Fuel className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                Stanje zaledja (backend)
              </p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Nalaganje...</p>
              ) : isError || balance === undefined ? (
                <p className="text-sm text-destructive">
                  Stanja ni bilo mogoče naložiti.
                </p>
              ) : (
                <>
                  <p
                    className={`text-2xl font-bold ${isLow ? "text-destructive" : ""}`}
                  >
                    {formatTrillions(balance)}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    {balance.toLocaleString("sl-SI")} ciklov
                  </p>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Osveži"
              title="Osveži"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {isLow && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Malo ciklov</AlertTitle>
              <AlertDescription>
                Stanje je pod {formatTrillions(LOW_CYCLES_THRESHOLD)}. Ko cikli
                zmanjkajo, aplikacija preneha delovati, in če ostane prazna
                predolgo, se izbriše skupaj z vsemi podatki. Dopolnite jo čim
                prej.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">ID-ji kanistrov</p>
            <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2">
              {backendId ? (
                <PrincipalDisplay principal={backendId} label="Zaledje" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Zaledje: neznano
                </p>
              )}
              {frontendId ? (
                <PrincipalDisplay principal={frontendId} label="Vmesnik" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Vmesnik: neznano
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t pt-4 text-sm">
            <p className="font-medium">Dopolnitev iz denarnice OISY</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>V OISY odprite žeton TCYCLES.</li>
              <li>
                Izberite dejanje{" "}
                <strong className="text-foreground">»Top up«</strong>, ne
                »Send«. Pri »Send« cikli ne pridejo na stanje kanistra.
              </li>
              <li>
                Prilepite ID kanistra od zgoraj (zaledje ali vmesnik) in
                potrdite.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Stanja vmesnika (frontend) tukaj ni mogoče prikazati, zato ga
              preverite po navodilih v UPDATING.md.
            </p>
            <Button asChild variant="outline" className="w-full gap-2">
              <a href={OISY_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Odpri OISY
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
