import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import Footer from "./Footer";

export default function LoginScreen() {
  const { login, isLoggingIn, loginError } = useInternetIdentity();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <img
              src="/icons/icon-192.png"
              alt=""
              className="mx-auto h-20 w-20"
            />
            <CardTitle className="text-3xl font-bold">
              Družinska kuharica
            </CardTitle>
            <CardDescription className="text-base">
              Prijavite se za dostop do receptov.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="h-12 w-full gap-2 text-base"
              size="lg"
            >
              {isLoggingIn ? (
                "Prijavljanje..."
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Prijava
                </>
              )}
            </Button>
            {loginError && (
              <p className="text-center text-sm text-destructive">
                Prijava ni uspela. Poskusite znova.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
