import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardPaste,
  DatabaseBackup,
  Fuel,
  LogOut,
  Moon,
  Sun,
  User,
  Wind,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { type Route, goBack, navigate } from "../hooks/useRoute";
import BackupDialog from "./BackupDialog";
import { CyclesDialog } from "./CyclesDialog";
import ImportTextDialog from "./ImportTextDialog";
import { PrincipalDisplay } from "./PrincipalDisplay";

export default function Header({ route }: { route: Route }) {
  const { identity, clear } = useInternetIdentity();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [cyclesOpen, setCyclesOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const principal = identity?.getPrincipal().toText() ?? "";

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {route.name !== "list" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goBack()}
                className="h-11 w-11 shrink-0 rounded-full"
                aria-label="Nazaj"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <button
              type="button"
              onClick={() => navigate({ name: "list" })}
              className="flex min-w-0 items-center gap-2"
            >
              <img src="/icons/icon-192.png" alt="" className="h-8 w-8" />
              <h1 className="truncate text-xl font-bold">Družinska kuharica</h1>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Svetla/temna tema</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-11 w-11 rounded-full p-0"
                  aria-label="Meni"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="px-2 py-1.5">
                  <PrincipalDisplay principal={principal} />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate({ name: "airFryer" })}
                  className="cursor-pointer py-2.5"
                >
                  <Wind className="mr-3 h-4 w-4 text-muted-foreground" />
                  Air fryer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setImportOpen(true)}
                  className="cursor-pointer py-2.5"
                >
                  <ClipboardPaste className="mr-3 h-4 w-4 text-muted-foreground" />
                  Uvozi recepte
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setBackupOpen(true)}
                  className="cursor-pointer py-2.5"
                >
                  <DatabaseBackup className="mr-3 h-4 w-4 text-muted-foreground" />
                  Varnostna kopija
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCyclesOpen(true)}
                  className="cursor-pointer py-2.5"
                >
                  <Fuel className="mr-3 h-4 w-4 text-muted-foreground" />
                  Cikli
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer py-2.5 text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Odjava
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CyclesDialog open={cyclesOpen} onOpenChange={setCyclesOpen} />
      <BackupDialog open={backupOpen} onOpenChange={setBackupOpen} />
      <ImportTextDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
