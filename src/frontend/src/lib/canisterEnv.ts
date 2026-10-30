import { safeGetCanisterEnv } from "@icp-sdk/core/agent/canister-env";

// Canister IDs and the network root key are injected by `icp deploy` and
// served by the frontend canister in the `ic_env` cookie.
type KuharicaEnv = {
  readonly "PUBLIC_CANISTER_ID:backend"?: string;
  readonly "PUBLIC_CANISTER_ID:frontend"?: string;
};

export function getCanisterEnv() {
  const env = safeGetCanisterEnv<KuharicaEnv>();
  return {
    backendId: env?.["PUBLIC_CANISTER_ID:backend"],
    frontendId: env?.["PUBLIC_CANISTER_ID:frontend"],
    rootKey: env?.IC_ROOT_KEY,
  };
}

// The backend traps with this message for principals that are not on the
// allow-list.
export function isAccessDenied(error: unknown): boolean {
  return String(error).includes("Access denied");
}

// Recipe checks in the backend trap with a Slovenian message, e.g.
// "Naslov je obvezen." Returns that message, or `fallback` for any other error.
const BACKEND_MESSAGES = [
  "Naslov je obvezen.",
  "Naslov je predolg.",
  "Recept je prevelik.",
  "Doseženo je največje število receptov.",
  "Recept ne obstaja.",
  "Recept je bil medtem spremenjen. Osvežite in poskusite znova.",
  "Doseženo je največje število povezav.",
  "Povezave ni bilo mogoče ustvariti. Poskusite znova.",
  "Doseženo je največje število vaših receptov.",
  "Doseženo je največje število vaših povezav.",
];

// The backend refuses changes to someone else's recipe with this message.
const NOT_YOURS = "Tega recepta ne morete spreminjati.";

export function backendErrorMessage(error: unknown, fallback: string): string {
  const text = String(error);
  if (text.includes(NOT_YOURS)) {
    return "Tega recepta ne morete spreminjati, ker ni vaš.";
  }
  return BACKEND_MESSAGES.find((m) => text.includes(m)) ?? fallback;
}
