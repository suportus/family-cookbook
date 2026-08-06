import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ChefHat, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../hooks/useLanguage";
import {
  useGetAdminDashboardStats,
  useGetAppVersion,
  useSetAppVersion,
} from "../hooks/useQueries";
import BackButton from "./BackButton";

export default function AdminDashboardView() {
  const { data: stats, isLoading } = useGetAdminDashboardStats();
  const { data: appVersion } = useGetAppVersion();
  const setAppVersion = useSetAppVersion();
  const { t } = useLanguage();

  const [newVersion, setNewVersion] = useState("");

  const handleSetVersion = async () => {
    if (!newVersion.trim()) {
      toast.error(t.enterVersion);
      return;
    }

    try {
      await setAppVersion.mutateAsync(newVersion.trim());
      toast.success(t.versionUpdated);
      setNewVersion("");
    } catch (error) {
      toast.error(t.failedUpdateVersion);
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-16">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container py-16">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">{t.accessDenied}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <BackButton label="Nazaj" />

      <div className="mb-8 mt-6">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {t.adminDashboard}
        </h1>
        <p className="text-muted-foreground">{t.adminDashboardDescription}</p>
      </div>

      <div className="space-y-8">
        {/* Overview Statistics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.totalUsers}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.totalUsers)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.totalCookbooks}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.totalCookbooks)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.totalRecipes}
              </CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.totalRecipes)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.pendingInvitations}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.pendingInvitations)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cookbook Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>{t.cookbookStatistics}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {stats.perBookStats.map((book) => (
                  <div key={book.bookId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{book.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {book.bookId}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {Number(book.recipeCount)} {t.recipes}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t.members}</p>
                        <p className="font-medium">
                          {Number(book.memberCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {t.roleBreakdown}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {Number(book.roleBreakdown.owners)} {t.owners}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Number(book.roleBreakdown.editors)} {t.editors}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Number(book.roleBreakdown.viewers)} {t.viewers}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t.appVersion}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">
                {t.currentVersion}
              </Label>
              <p className="text-lg font-semibold">{appVersion || "1.0.0"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="newVersion">{t.setNewVersion}</Label>
              <div className="flex gap-2">
                <Input
                  id="newVersion"
                  placeholder="1.0.1"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                />
                <Button
                  onClick={handleSetVersion}
                  disabled={setAppVersion.isPending}
                >
                  {setAppVersion.isPending ? t.updating : t.update}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        © 2025. Narejeno z ❤️ caffeine.ai
      </footer>
    </div>
  );
}
