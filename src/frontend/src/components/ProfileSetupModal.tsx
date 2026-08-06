import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../hooks/useLanguage";
import { useSaveCallerUserProfile } from "../hooks/useQueries";
import type { Language } from "../lib/i18n";

export default function ProfileSetupModal() {
  const { language, setLanguage, t } = useLanguage();
  const [name, setName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t.enterNameError);
      return;
    }

    try {
      await saveProfile.mutateAsync({
        name: name.trim(),
        language: selectedLanguage,
        requireApprovalBeforeJoining: true,
        invitations: [],
        favoriteCookbooks: [],
      });
      setLanguage(selectedLanguage);
      toast.success(t.profileCreated);
    } catch (error) {
      toast.error("Failed to create profile");
      console.error(error);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t.welcomeTitle}</DialogTitle>
          <DialogDescription>{t.welcomeDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.yourName}</Label>
            <Input
              id="name"
              placeholder={t.enterName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">{t.language}</Label>
            <Select
              value={selectedLanguage}
              onValueChange={(value) => setSelectedLanguage(value as Language)}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t.english}</SelectItem>
                <SelectItem value="sl">{t.slovenian}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? t.creatingProfile : t.continue}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
