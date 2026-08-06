import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Globe,
  Info,
  LogOut,
  Mail,
  Moon,
  Share2,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLanguage } from "../hooks/useLanguage";
import {
  useGetCallerUserProfile,
  useGetPendingInvitations,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import AboutModal from "./AboutModal";
import { useBookContext } from "./BookContext";
import CopyablePrincipal from "./CopyablePrincipal";
import ShareAppModal from "./ShareAppModal";

const ADMIN_PRINCIPAL_IDS = [
  "4pzyi-25rfc-qja5s-oae2m-45y4w-dzvan-mktqj-3vogp-iba6n-eqf6o-zqe",
  "xc637-uwxsa-p56qu-lk5wx-bcwln-lk7h7-7ryob-4psjl-knhws-ecuxs-dae",
];

export default function Header() {
  const { identity, clear } = useInternetIdentity();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { setView } = useBookContext();
  const { data: userProfile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const { data: pendingInvitations } = useGetPendingInvitations();
  const saveProfile = useSaveCallerUserProfile();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [shareAppOpen, setShareAppOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasShownAnimation, setHasShownAnimation] = useState(false);

  const isAuthenticated = !!identity;
  const principalId = identity?.getPrincipal().toString() || "";

  // Show loading state while profile is being fetched, otherwise show name or fallback
  const userName = profileLoading
    ? t.loading
    : userProfile?.name || t.unknownUser;

  const hasPendingInvitations = (pendingInvitations?.length || 0) > 0;
  const isAdmin = ADMIN_PRINCIPAL_IDS.includes(principalId);

  useEffect(() => {
    if (hasPendingInvitations && !hasShownAnimation) {
      setHasShownAnimation(true);
    }
  }, [hasPendingInvitations, hasShownAnimation]);

  const handleLogout = async () => {
    await clear();
  };

  const handleEditName = () => {
    setNewName(userProfile?.name || "");
    setEditNameOpen(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error(t.enterNameError);
      return;
    }

    if (!userProfile) return;

    setIsSaving(true);
    try {
      await saveProfile.mutateAsync({
        ...userProfile,
        name: newName.trim(),
      });
      toast.success(t.nameUpdated);
      setEditNameOpen(false);
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error(t.failedUpdateName);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = language === "en" ? "sl" : "en";
    setLanguage(newLang);

    if (userProfile) {
      saveProfile.mutate({
        ...userProfile,
        language: newLang,
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/assets/flavicon.png"
              alt="Family Cookbook"
              className="h-8 w-8"
            />
            <h1 className="text-xl font-bold">{t.appTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    {hasPendingInvitations && (
                      <Badge
                        variant="destructive"
                        className={`absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs ${
                          !hasShownAnimation
                            ? "animate-[shake_1s_ease-in-out]"
                            : ""
                        }`}
                      >
                        {pendingInvitations?.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">
                      {profileLoading ? (
                        <span className="text-muted-foreground">
                          {t.loading}...
                        </span>
                      ) : (
                        userName
                      )}
                    </p>
                    <CopyablePrincipal principal={principalId} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleEditName}
                    className="cursor-pointer"
                    disabled={profileLoading}
                  >
                    <Edit className="mr-3 h-4 w-4 text-gray-500" />
                    <span>{t.editName}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={toggleLanguage}
                    className="cursor-pointer"
                  >
                    <Globe className="mr-3 h-4 w-4 text-gray-500" />
                    <span>Slo/Eng</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShareAppOpen(true)}
                    className="cursor-pointer"
                  >
                    <Share2 className="mr-3 h-4 w-4 text-gray-500" />
                    <span>{t.shareApp}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setAboutOpen(true)}
                    className="cursor-pointer"
                  >
                    <Info className="mr-3 h-4 w-4 text-gray-500" />
                    <span>About</span>
                  </DropdownMenuItem>
                  {hasPendingInvitations && (
                    <DropdownMenuItem
                      onClick={() => setView("invitations")}
                      className="cursor-pointer"
                    >
                      <Mail className="mr-3 h-4 w-4 text-gray-500" />
                      <span className="flex-1">{t.invitations}</span>
                      <Badge variant="destructive" className="ml-2">
                        {pendingInvitations?.length}
                      </Badge>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setView("adminDashboard")}
                        className="cursor-pointer"
                      >
                        <Shield className="mr-3 h-4 w-4 text-gray-500" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-3 h-4 w-4 text-gray-500" />
                    <span>{t.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editNameTitle}</DialogTitle>
            <DialogDescription>{t.editNameDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.yourName}</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.enterName}
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditNameOpen(false)}
              disabled={isSaving}
            >
              {t.cancel}
            </Button>
            <Button onClick={handleSaveName} disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareAppModal open={shareAppOpen} onOpenChange={setShareAppOpen} />
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
