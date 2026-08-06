import { useActor as usePlatformActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

/**
 * App-owned hook that returns the Backend canister actor.
 *
 * This is a thin wrapper around the platform-provided `useActor` from
 * `@caffeineai/core-infrastructure`, pre-wired with the Backend `createActor`
 * factory generated from the canister bindings in `../backend`.
 *
 * The platform hook internally reads the current Internet Identity identity
 * (via the `InternetIdentityProvider` mounted in `main.tsx`) and rebuilds the
 * actor agent with that identity whenever it changes, so every consumer of
 * this hook automatically gets an authenticated actor.
 *
 * Returns `{ actor, isFetching }` where:
 *  - `actor` is the Backend actor instance, or `null` while it is being
 *    initialized or when the user is not yet authenticated.
 *  - `isFetching` is `true` while the actor is being (re)created.
 */
export function useActor() {
  return usePlatformActor(createActor);
}
