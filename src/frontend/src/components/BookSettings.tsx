import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Info,
  LogOut,
  Plus,
  Save,
  Tags,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLanguage } from "../hooks/useLanguage";
import {
  useChangeUserRole,
  useGetBookMeta,
  useGetBookTags,
  useGetUserRole,
  useInviteUser,
  useLeaveCookbook,
  useListBookMembers,
  useRemoveUser,
  useRenameBook,
  useUpdateBookTags,
} from "../hooks/useQueries";
import { useBookContext } from "./BookContext";
import CopyablePrincipal from "./CopyablePrincipal";
import UserDisplay from "./UserDisplay";

export default function BookSettings() {
  const { selectedBookId, setView } = useBookContext();
  const { data: bookMeta } = useGetBookMeta(selectedBookId);
  const { data: userRole } = useGetUserRole(selectedBookId);
  const { data: members, isLoading: membersLoading } =
    useListBookMembers(selectedBookId);
  const { data: bookTags } = useGetBookTags(selectedBookId);
  const inviteUser = useInviteUser();
  const changeUserRole = useChangeUserRole();
  const removeUser = useRemoveUser();
  const renameBook = useRenameBook();
  const updateBookTags = useUpdateBookTags();
  const leaveCookbook = useLeaveCookbook();
  const { identity } = useInternetIdentity();
  const { t } = useLanguage();

  const [principalId, setPrincipalId] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.editor);
  const [memberToRemove, setMemberToRemove] = useState<{
    principal: string;
    name: string;
  } | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Tag management state
  const [useDefaultTags, setUseDefaultTags] = useState(
    bookTags?.useDefaultTags ?? true,
  );
  const [customTags, setCustomTags] = useState<string[]>(
    bookTags?.customTags ?? [""],
  );
  const [isEditingTags, setIsEditingTags] = useState(false);

  const isOwner = userRole === UserRole.owner;
  const isBookOwner =
    bookMeta &&
    identity &&
    bookMeta.owner.toString() === identity.getPrincipal().toString();

  const defaultTags = [
    t.tagDesserts,
    t.tagHolidayMeals,
    t.tagMainDishes,
    t.tagQuickMeals,
    t.tagStews,
    t.tagVegan,
    t.tagVegetarian,
  ];

  const handleBack = () => {
    setView("book");
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!principalId.trim()) {
      toast.error(t.enterPrincipalId);
      return;
    }

    if (!selectedBookId) return;

    try {
      await inviteUser.mutateAsync({
        bookId: selectedBookId,
        principalId: principalId.trim(),
        role: selectedRole,
      });
      toast.success(t.userInvited);
      setPrincipalId("");
      setSelectedRole(UserRole.editor);
    } catch (error: any) {
      console.error("Invite user error:", error);
      if (error.message?.includes("Invalid Principal")) {
        toast.error(t.invalidPrincipal);
      } else if (error.message?.includes("Unauthorized")) {
        toast.error("Unauthorized: Only owners can invite users");
      } else {
        toast.error(t.failedInviteUser);
      }
    }
  };

  const handleRoleChange = async (
    memberPrincipal: string,
    newRole: UserRole,
  ) => {
    if (!selectedBookId) return;

    try {
      await changeUserRole.mutateAsync({
        bookId: selectedBookId,
        principalId: memberPrincipal,
        newRole,
      });
      toast.success(t.roleChanged);
    } catch (error: any) {
      console.error("Change role error:", error);
      if (error.message?.includes("Unauthorized")) {
        toast.error(t.noPermissionChangeRole);
      } else if (
        error.message?.includes("Cannot change the last remaining owner")
      ) {
        toast.error("Cannot change the last remaining owner's role");
      } else {
        toast.error(t.failedChangeRole);
      }
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedBookId || !memberToRemove) return;

    try {
      await removeUser.mutateAsync({
        bookId: selectedBookId,
        principalId: memberToRemove.principal,
      });
      toast.success(t.userRemoved);
      setMemberToRemove(null);
    } catch (error: any) {
      console.error("Remove user error:", error);
      setMemberToRemove(null);
      if (error.message?.includes("Unauthorized")) {
        toast.error(t.noPermissionRemoveUser);
      } else if (
        error.message?.includes("Cannot remove the last remaining owner")
      ) {
        toast.error("Cannot remove the last remaining owner");
      } else {
        toast.error(t.failedRemoveUser);
      }
    }
  };

  const handleLeaveCookbook = async () => {
    if (!selectedBookId) return;

    try {
      await leaveCookbook.mutateAsync(selectedBookId);
      toast.success(t.leftCookbook);
      setShowLeaveDialog(false);
      setView("home");
    } catch (error: any) {
      console.error("Leave cookbook error:", error);
      setShowLeaveDialog(false);
      if (error.message?.includes("Owners cannot leave")) {
        toast.error(t.ownersCannotLeave);
      } else if (error.message?.includes("not a member")) {
        toast.error(t.notAMember);
      } else {
        toast.error(t.failedLeaveCookbook);
      }
    }
  };

  const handleRenameBook = async () => {
    if (!selectedBookId || !newTitle.trim()) {
      toast.error(t.enterTitleError);
      return;
    }

    try {
      await renameBook.mutateAsync({
        bookId: selectedBookId,
        newTitle: newTitle.trim(),
      });
      toast.success(t.titleUpdated);
      setIsEditingTitle(false);
      setNewTitle("");
    } catch (error: any) {
      console.error("Rename book error:", error);
      if (error.message?.includes("Unauthorized")) {
        toast.error(t.noPermissionRenameBook);
      } else {
        toast.error(t.failedRenameBook);
      }
    }
  };

  const startEditingTitle = () => {
    setNewTitle(bookMeta?.title || "");
    setIsEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setNewTitle("");
  };

  const startEditingTags = () => {
    setUseDefaultTags(bookTags?.useDefaultTags ?? true);
    setCustomTags(
      bookTags?.customTags && bookTags.customTags.length > 0
        ? bookTags.customTags
        : [""],
    );
    setIsEditingTags(true);
  };

  const cancelEditingTags = () => {
    setIsEditingTags(false);
    setUseDefaultTags(bookTags?.useDefaultTags ?? true);
    setCustomTags(bookTags?.customTags ?? [""]);
  };

  const handleAddCustomTag = () => {
    setCustomTags([...customTags, ""]);
  };

  const handleRemoveCustomTag = (index: number) => {
    const newTags = customTags.filter((_, i) => i !== index);
    if (newTags.length === 0) {
      setCustomTags([""]);
    } else {
      setCustomTags(newTags);
    }
  };

  const handleCustomTagChange = (index: number, value: string) => {
    const newTags = [...customTags];
    newTags[index] = value;
    setCustomTags(newTags);
  };

  const handleSaveTags = async () => {
    if (!selectedBookId) return;

    try {
      const finalCustomTags = useDefaultTags
        ? []
        : customTags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .sort((a, b) => a.localeCompare(b));

      await updateBookTags.mutateAsync({
        bookId: selectedBookId,
        useDefaultTags,
        customTags: finalCustomTags,
      });
      toast.success(t.tagsUpdated);
      setIsEditingTags(false);
    } catch (error: any) {
      console.error("Update tags error:", error);
      if (error.message?.includes("Unauthorized")) {
        toast.error(t.noPermissionUpdateTags);
      } else {
        toast.error(t.failedUpdateTags);
      }
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

  const sortedCustomTags = [...customTags].sort((a, b) => {
    if (!a.trim()) return 1;
    if (!b.trim()) return -1;
    return a.trim().localeCompare(b.trim());
  });

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {t.cookbookSettings}
          </h2>
        </div>

        <div className="space-y-6">
          <Card className="relative">
            {isBookOwner && (
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {t.myCookbookBadge}
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="pr-24">{t.cookbookInformation}</CardTitle>
              <CardDescription>{t.cookbookDetails}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t.title}</Label>
                {isOwner ? (
                  isEditingTitle ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={t.cookbookTitlePlaceholder}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleRenameBook}
                        disabled={renameBook.isPending || !newTitle.trim()}
                        size="sm"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {renameBook.isPending ? t.saving : t.save}
                      </Button>
                      <Button
                        onClick={cancelEditingTitle}
                        disabled={renameBook.isPending}
                        variant="outline"
                        size="sm"
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-lg font-medium">{bookMeta?.title}</p>
                      <Button
                        onClick={startEditingTitle}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        {t.edit}
                      </Button>
                    </div>
                  )
                ) : (
                  <p className="mt-2 text-lg font-medium">{bookMeta?.title}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">{t.owner}</Label>
                <div className="mt-2 flex items-center gap-2">
                  {bookMeta && (
                    <>
                      <UserDisplay
                        principal={bookMeta.owner.toString()}
                        className="text-sm font-medium"
                      />
                      <span className="text-muted-foreground">·</span>
                      <CopyablePrincipal
                        principal={bookMeta.owner.toString()}
                        showIcon
                        className="text-sm"
                      />
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    {t.tagsSection}
                  </CardTitle>
                  <CardDescription>
                    {isOwner
                      ? t.tagsSectionDescriptionOwner
                      : t.tagsSectionDescription}
                  </CardDescription>
                </div>
                {isOwner && !isEditingTags && (
                  <Button
                    onClick={startEditingTags}
                    variant="outline"
                    size="sm"
                  >
                    {t.edit}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingTags && isOwner ? (
                <div className="space-y-6">
                  {/* Use Default Tags Toggle */}
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="useDefaultTags" className="text-base">
                        {t.useDefaultTags}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.useDefaultTagsDescription}
                      </p>
                    </div>
                    <Switch
                      id="useDefaultTags"
                      checked={useDefaultTags}
                      onCheckedChange={setUseDefaultTags}
                    />
                  </div>

                  {/* Default Tags Preview */}
                  {useDefaultTags && (
                    <div className="space-y-3">
                      <Label>{t.defaultTagsPreview}</Label>
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <div className="flex flex-wrap gap-2">
                          {defaultTags
                            .sort((a, b) => a.localeCompare(b))
                            .map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground opacity-60"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Tags */}
                  {!useDefaultTags && (
                    <div className="space-y-3">
                      <Label>{t.customTags}</Label>
                      <div className="space-y-2">
                        {sortedCustomTags.map((tag) => {
                          const originalIndex = customTags.indexOf(tag);
                          return (
                            <div
                              key={originalIndex}
                              className="flex items-center gap-2"
                            >
                              <Input
                                placeholder={t.customTagInputPlaceholder}
                                value={tag}
                                onChange={(e) =>
                                  handleCustomTagChange(
                                    originalIndex,
                                    e.target.value,
                                  )
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleRemoveCustomTag(originalIndex)
                                }
                                disabled={customTags.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddCustomTag}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t.addTag}
                      </Button>
                    </div>
                  )}

                  {/* Save/Cancel Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={cancelEditingTags}
                      disabled={updateBookTags.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      onClick={handleSaveTags}
                      disabled={updateBookTags.isPending}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateBookTags.isPending ? t.saving : t.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      {t.tagSystemMode}
                    </Label>
                    <p className="mt-1 text-base font-medium">
                      {bookTags?.useDefaultTags
                        ? t.defaultTagsMode
                        : t.customTagsMode}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      {t.availableTags}
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {bookTags?.useDefaultTags ? (
                        defaultTags
                          .sort((a, b) => a.localeCompare(b))
                          .map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))
                      ) : bookTags?.customTags &&
                        bookTags.customTags.length > 0 ? (
                        bookTags.customTags
                          .sort((a, b) => a.localeCompare(b))
                          .map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t.noCustomTags}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>{t.inviteMembers}</CardTitle>
                <CardDescription>{t.inviteMembersDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p>{t.inviteMembersInfo}</p>
                    </div>
                    <Label htmlFor="principal">{t.principalId}</Label>
                    <Input
                      id="principal"
                      placeholder={t.principalIdPlaceholder}
                      value={principalId}
                      onChange={(e) => setPrincipalId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">{t.role}</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) =>
                        setSelectedRole(value as UserRole)
                      }
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.owner}>
                          {t.ownerRole}
                        </SelectItem>
                        <SelectItem value={UserRole.editor}>
                          {t.editorRole}
                        </SelectItem>
                        <SelectItem value={UserRole.viewer}>
                          {t.viewerRole}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={inviteUser.isPending}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {inviteUser.isPending ? t.inviting : t.inviteUser}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.members}
              </CardTitle>
              <CardDescription>
                {isOwner ? t.membersDescriptionOwner : t.membersDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t.loading}
                </div>
              ) : members && members.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.memberName}</TableHead>
                          <TableHead>{t.role}</TableHead>
                          {isOwner && (
                            <TableHead className="text-right">
                              {t.actions}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.principal}>
                            <TableCell>
                              <span className="font-medium">{member.name}</span>
                            </TableCell>
                            <TableCell>
                              {isOwner ? (
                                <Select
                                  value={member.role}
                                  onValueChange={(value) =>
                                    handleRoleChange(
                                      member.principal,
                                      value as UserRole,
                                    )
                                  }
                                  disabled={changeUserRole.isPending}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue>
                                      <Badge
                                        variant={getRoleBadgeVariant(
                                          member.role,
                                        )}
                                      >
                                        {getRoleLabel(member.role)}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={UserRole.owner}>
                                      {t.owner}
                                    </SelectItem>
                                    <SelectItem value={UserRole.editor}>
                                      {t.editor}
                                    </SelectItem>
                                    <SelectItem value={UserRole.viewer}>
                                      {t.viewer}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant={getRoleBadgeVariant(member.role)}
                                >
                                  {getRoleLabel(member.role)}
                                </Badge>
                              )}
                            </TableCell>
                            {isOwner && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setMemberToRemove({
                                      principal: member.principal,
                                      name: member.name,
                                    })
                                  }
                                  disabled={removeUser.isPending}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {!isOwner && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowLeaveDialog(true)}
                        disabled={leaveCookbook.isPending}
                        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t.leaveCookbook}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  {t.noMembers}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeUserTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.removeUserConfirm.replace(
                "{name}",
                memberToRemove?.name || "",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.leaveCookbookTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.leaveCookbookConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveCookbook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveCookbook.isPending ? t.leaving : t.leaveCookbook}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
