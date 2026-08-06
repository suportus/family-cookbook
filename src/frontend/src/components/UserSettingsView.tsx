import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../hooks/useLanguage";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import { useBookContext } from "./BookContext";

export default function UserSettingsView() {
  const { t } = useLanguage();
  const { setView } = useBookContext();
  const { data: userProfile } = useGetCallerUserProfile();
  const saveProfileMutation = useSaveCallerUserProfile();

  const [requireApproval, setRequireApproval] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setRequireApproval(userProfile.requireApprovalBeforeJoining);
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!userProfile) {
      toast.error(t.failedUpdateSettings);
      return;
    }

    try {
      await saveProfileMutation.mutateAsync({
        name: userProfile.name,
        language: userProfile.language,
        requireApprovalBeforeJoining: requireApproval,
        invitations: userProfile.invitations,
        favoriteCookbooks: userProfile.favoriteCookbooks,
      });

      toast.success(t.settingsUpdated);
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error(t.failedUpdateSettings);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setView("home")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.goBack}
        </Button>
        <h1 className="text-3xl font-bold">{t.userSettings}</h1>
        <p className="text-muted-foreground mt-2">
          {t.userSettingsDescription}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.invitationPreferences}</CardTitle>
          <CardDescription>
            {t.invitationPreferencesDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={requireApproval ? "require" : "auto"}
            onValueChange={(value) => setRequireApproval(value === "require")}
          >
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="require" id="require" />
              <div className="space-y-1 leading-none">
                <Label htmlFor="require" className="cursor-pointer font-medium">
                  {t.requireApproval}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.requireApprovalDescription}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="auto" id="auto" />
              <div className="space-y-1 leading-none">
                <Label htmlFor="auto" className="cursor-pointer font-medium">
                  {t.autoJoin}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.autoJoinDescription}
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveProfileMutation.isPending}
            >
              {saveProfileMutation.isPending ? t.saving : t.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
