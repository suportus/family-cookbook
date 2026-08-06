import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Check, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { type Invitation, UserRole } from "../backend";
import { useLanguage } from "../hooks/useLanguage";
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useGetBookMeta,
  useGetPendingInvitations,
  useGetUserProfile,
} from "../hooks/useQueries";
import { useBookContext } from "./BookContext";

export default function InvitationsView() {
  const { t } = useLanguage();
  const { setView } = useBookContext();
  const { data: invitations = [], isLoading } = useGetPendingInvitations();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();

  const handleAccept = async (cookbookId: string) => {
    try {
      await acceptMutation.mutateAsync(cookbookId);
      toast.success(t.invitationAccepted);
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast.error(t.failedAcceptInvitation);
    }
  };

  const handleDecline = async (cookbookId: string) => {
    try {
      await declineMutation.mutateAsync(cookbookId);
      toast.success(t.invitationDeclined);
    } catch (error) {
      console.error("Failed to decline invitation:", error);
      toast.error(t.failedDeclineInvitation);
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
        <h1 className="text-3xl font-bold">{t.invitations}</h1>
        <p className="text-muted-foreground mt-2">{t.invitationsDescription}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : invitations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t.noInvitations}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t.noInvitationsDescription}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.cookbookId}
              invitation={invitation}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isAccepting={acceptMutation.isPending}
              isDeclining={declineMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: {
  invitation: Invitation;
  onAccept: (cookbookId: string) => void;
  onDecline: (cookbookId: string) => void;
  isAccepting: boolean;
  isDeclining: boolean;
}) {
  const { t } = useLanguage();
  const { data: bookMeta, isLoading: isLoadingMeta } = useGetBookMeta(
    invitation.cookbookId,
  );

  // Convert Principal to text string for fetching user profile
  const inviterPrincipalText = invitation.invitedBy.toText();
  const { data: inviterProfile, isLoading: isLoadingInviter } =
    useGetUserProfile(inviterPrincipalText);

  // Format the inviter display text
  const shortPrincipal =
    inviterPrincipalText.length > 20
      ? `${inviterPrincipalText.slice(0, 10)}...${inviterPrincipalText.slice(-7)}`
      : inviterPrincipalText;

  // Always display inviter's name followed by principal ID
  const inviterDisplay = inviterProfile?.name
    ? `${inviterProfile.name} (${shortPrincipal})`
    : shortPrincipal;

  const isLoading = isLoadingMeta || isLoadingInviter;

  // Get role label for display
  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.owner:
        return t.owner;
      case UserRole.editor:
        return t.editor;
      case UserRole.viewer:
        return t.viewer;
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (
    role: UserRole,
  ): "default" | "secondary" | "outline" => {
    switch (role) {
      case UserRole.owner:
        return "default";
      case UserRole.editor:
        return "secondary";
      case UserRole.viewer:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isLoadingMeta ? t.loading : bookMeta?.title || t.unknownUser}
        </CardTitle>
        <CardDescription>
          {isLoadingInviter ? (
            <span>{t.loading}</span>
          ) : (
            <div className="flex flex-col gap-1">
              <span>
                {t.invitedBy}{" "}
                <span className="font-mono text-xs">{inviterDisplay}</span>
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs">{t.role}:</span>
                <Badge
                  variant={getRoleBadgeVariant(invitation.role)}
                  className="text-xs"
                >
                  {getRoleLabel(invitation.role)}
                </Badge>
              </div>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button
            onClick={() => onAccept(invitation.cookbookId)}
            disabled={isAccepting || isDeclining || isLoading}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            {isAccepting ? t.accepting : t.accept}
          </Button>
          <Button
            onClick={() => onDecline(invitation.cookbookId)}
            disabled={isAccepting || isDeclining || isLoading}
            variant="outline"
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            {isDeclining ? t.declining : t.decline}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
