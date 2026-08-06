import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { BookProvider } from "./components/BookContext";
import Footer from "./components/Footer";
import Header from "./components/Header";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useLanguage } from "./hooks/useLanguage";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import HomePage from "./pages/HomePage";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const { setLanguage, t } = useLanguage();

  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Sync language from user profile
  useEffect(() => {
    if (userProfile?.language) {
      setLanguage(userProfile.language as "en" | "sl");
    }
  }, [userProfile, setLanguage]);

  // Show loading screen while initializing or while profile is loading after authentication
  if (isInitializing || (isAuthenticated && profileLoading && !isFetched)) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BookProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1">
            <HomePage />
          </main>
          <Footer />
          {showProfileSetup && <ProfileSetupModal />}
          <Toaster />
        </div>
      </BookProvider>
    </ThemeProvider>
  );
}
