import { HttpAgent } from "@icp-sdk/core/agent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type Backend, createActor } from "../backend";
import { getCanisterEnv } from "../lib/canisterEnv";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";

export function useActor(): { actor: Backend | null; isFetching: boolean } {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const actorQuery = useQuery({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const { backendId, rootKey } = getCanisterEnv();
      if (!backendId) {
        throw new Error(
          "Backend canister ID not found (ic_env cookie missing). Open the app from the frontend canister URL.",
        );
      }
      // No host: the agent uses the origin the page was served from.
      const agent = await HttpAgent.create({ identity, rootKey });
      return createActor(backendId, { agent });
    },
    // Only recreate the actor when the identity changes.
    staleTime: Number.POSITIVE_INFINITY,
  });

  // When the actor changes, refetch everything that depends on it.
  useEffect(() => {
    if (actorQuery.data) {
      const predicate = (query: { queryKey: readonly unknown[] }) =>
        !query.queryKey.includes(ACTOR_QUERY_KEY);
      queryClient.invalidateQueries({ predicate });
      queryClient.refetchQueries({ predicate });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
