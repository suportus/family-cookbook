import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import AdminDashboardView from "../components/AdminDashboardView";
import { useBookContext } from "../components/BookContext";
import BookListView from "../components/BookListView";
import BookSettings from "../components/BookSettings";
import BookView from "../components/BookView";
import CreateCookbookView from "../components/CreateCookbookView";
import InvitationsView from "../components/InvitationsView";
import RecipeForm from "../components/RecipeForm";
import RecipeView from "../components/RecipeView";
import UserSettingsView from "../components/UserSettingsView";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLanguage } from "../hooks/useLanguage";
import { useButtonHover, useFadePage } from "../lib/animations";

export default function HomePage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const { t } = useLanguage();
  const { view } = useBookContext();

  const pageRef = useFadePage();
  const getStartedButtonRef = useButtonHover();

  const isAuthenticated = !!identity;

  if (!isAuthenticated) {
    return (
      <div
        ref={pageRef}
        className="container flex min-h-[calc(100vh-200px)] items-center justify-center"
      >
        <div className="mx-auto max-w-2xl text-center">
          <BookOpen className="mx-auto mb-6 h-20 w-20 text-primary" />
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            {t.welcomeHome}
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            {t.welcomeHomeDescription}
          </p>
          <Button
            ref={getStartedButtonRef}
            onClick={login}
            disabled={loginStatus === "logging-in"}
            size="lg"
            className="rounded-full px-8"
          >
            {loginStatus === "logging-in" ? t.loggingIn : t.getStarted}
          </Button>
        </div>
      </div>
    );
  }

  if (view === "home") {
    return <BookListView />;
  }

  if (view === "createCookbook") {
    return <CreateCookbookView />;
  }

  if (view === "book") {
    return <BookView />;
  }

  if (view === "recipe") {
    return <RecipeView />;
  }

  if (view === "recipeForm") {
    return <RecipeForm />;
  }

  if (view === "settings") {
    return <BookSettings />;
  }

  if (view === "userSettings") {
    return <UserSettingsView />;
  }

  if (view === "invitations") {
    return <InvitationsView />;
  }

  if (view === "adminDashboard") {
    return <AdminDashboardView />;
  }

  return <BookListView />;
}
