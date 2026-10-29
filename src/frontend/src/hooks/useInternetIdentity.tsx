import { AuthClient } from "@icp-sdk/auth/client";
import type { Identity } from "@icp-sdk/core/agent";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCanisterEnv } from "../lib/canisterEnv";

// On mainnet, Internet Identity at https://id.ai is used (the default).
// On the local test network (`ii: true` in icp.yaml) a local II is served at
// id.ai.localhost with the same canister ID. The agent that mints delegations
// needs the network's root key, taken from the ic_env cookie.
const { rootKey } = getCanisterEnv();
const isLocal = window.location.hostname.endsWith("localhost");
const authClient = new AuthClient({
  ...(isLocal && {
    identityProvider: {
      authorizeUrl: `http://id.ai.localhost:${window.location.port}/authorize`,
      canisterId: "rdmx6-jaaaa-aaaaa-aaadq-cai",
    },
  }),
  ...(rootKey && { agentOptions: { rootKey } }),
});

type Status = "initializing" | "idle" | "logging-in" | "success" | "loginError";

type InternetIdentityContext = {
  identity?: Identity;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoggingIn: boolean;
  loginError?: Error;
};

const InternetIdentityReactContext = createContext<
  InternetIdentityContext | undefined
>(undefined);

export function useInternetIdentity(): InternetIdentityContext {
  const context = useContext(InternetIdentityReactContext);
  if (!context) {
    throw new Error(
      "InternetIdentityProvider is not present. Wrap your component tree with it.",
    );
  }
  return context;
}

export function InternetIdentityProvider({
  children,
}: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  // Restore a saved session, and follow sign-in/sign-out/expiry (also from
  // other tabs).
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (authClient.isAuthenticated()) {
        const restored = await authClient.getIdentity();
        if (!cancelled) setIdentity(restored);
      } else if (!cancelled) {
        setIdentity(undefined);
      }
    };
    void sync()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) {
          setStatus((s) => (s === "initializing" ? "idle" : s));
        }
      });
    const unsubscribe = authClient.subscribe(() => {
      void sync();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Called directly from the click handler so the browser allows the popup.
  const login = useCallback(() => {
    setStatus("logging-in");
    setError(undefined);
    authClient
      .signIn()
      .then((signedIn) => {
        setIdentity(signedIn);
        setStatus("success");
      })
      .catch((e) => {
        console.error("Sign-in failed:", e);
        setStatus("loginError");
        setError(e instanceof Error ? e : new Error("Login failed"));
      });
  }, []);

  const clear = useCallback(() => {
    authClient
      .signOut()
      .then(() => {
        setIdentity(undefined);
        setStatus("idle");
        setError(undefined);
      })
      .catch((e) => {
        setStatus("loginError");
        setError(e instanceof Error ? e : new Error("Logout failed"));
      });
  }, []);

  return (
    <InternetIdentityReactContext.Provider
      value={{
        identity,
        login,
        clear,
        loginStatus,
        isInitializing: loginStatus === "initializing",
        isLoggingIn: loginStatus === "logging-in",
        loginError,
      }}
    >
      {children}
    </InternetIdentityReactContext.Provider>
  );
}
