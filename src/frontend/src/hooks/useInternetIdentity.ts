import { useInternetIdentity as usePlatformInternetIdentity } from "@caffeineai/core-infrastructure";

/**
 * App-owned hook that exposes the Internet Identity authentication state.
 *
 * This is a thin re-export of the platform-provided `useInternetIdentity` from
 * `@caffeineai/core-infrastructure`, which is backed by the
 * `InternetIdentityProvider` mounted in `main.tsx`. The provider handles the
 * full II sign-in flow — including the backend's `_internet_identity_sign_in_start`
 * and `_internet_identity_sign_in_finish` attribute-bundle endpoints — as well
 * as restoring a stored identity on page reload.
 *
 * Returns:
 *  - `identity`: the current `Identity` (undefined when not signed in).
 *  - `isInitializing`: `true` while the auth client is being restored on mount.
 *  - `clear`: signs the user out and resets the identity to undefined.
 *  - `login`: opens the Internet Identity popup to sign the user in.
 *  - `loginStatus`: the raw login status string
 *    (`"initializing" | "idle" | "logging-in" | "success" | "loginError"`).
 *  - `isAuthenticated`: `true` when a valid, non-anonymous identity is present.
 *
 * Consumers (App.tsx, Header.tsx, HomePage.tsx, BookView.tsx, RecipeView.tsx,
 * BookListView.tsx, BookSettings.tsx) destructure subsets of these fields.
 */
export function useInternetIdentity() {
  return usePlatformInternetIdentity();
}
