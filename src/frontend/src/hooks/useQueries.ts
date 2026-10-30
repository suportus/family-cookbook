import { HttpAgent } from "@icp-sdk/core/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ImportItem,
  type Recipe,
  type ShareInfo,
  createActor,
} from "../backend";
import { getCanisterEnv } from "../lib/canisterEnv";
import {
  BODY_VERSION,
  type RecipeBody,
  type RecipeData,
  parseBody,
  serializeBody,
  toRecipeData,
} from "../lib/recipe";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

const RECIPES_KEY = ["recipes"];
const SHARES_KEY = ["shares"];

export function useRecipes() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<RecipeData[]>({
    queryKey: RECIPES_KEY,
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      const recipes = await actor.getAllRecipes();
      return recipes.map(toRecipeData);
    },
    // Only signed in: anonymous calls are always refused.
    enabled: !!identity && !!actor && !isFetching,
    // An "Access denied" error won't go away by retrying.
    retry: false,
  });
}

// Keeps the cached list in step with the backend after a change, without
// fetching everything again.
function useUpdateCache() {
  const queryClient = useQueryClient();
  return (update: (list: RecipeData[]) => RecipeData[]) =>
    queryClient.setQueryData<RecipeData[]>(RECIPES_KEY, (old) =>
      update(old ?? []),
    );
}

export type RecipeDraft = { title: string; body: RecipeBody };

export function useAddRecipe() {
  const { actor } = useActor();
  const updateCache = useUpdateCache();

  return useMutation({
    mutationFn: async (draft: RecipeDraft): Promise<RecipeData> => {
      if (!actor) throw new Error("Actor not initialized");
      const saved = await actor.addRecipe({
        title: draft.title,
        body: serializeBody(draft.body),
        bodyVersion: BODY_VERSION,
      });
      return toRecipeData(saved);
    },
    onSuccess: (saved) => updateCache((list) => [...list, saved]),
  });
}

export function useUpdateRecipe() {
  const { actor } = useActor();
  const updateCache = useUpdateCache();

  return useMutation({
    mutationFn: async ({
      id,
      expectedUpdatedAt,
      draft,
    }: {
      id: bigint;
      expectedUpdatedAt: bigint;
      draft: RecipeDraft;
    }): Promise<RecipeData> => {
      if (!actor) throw new Error("Actor not initialized");
      const saved = await actor.updateRecipe(
        id,
        {
          title: draft.title,
          body: serializeBody(draft.body),
          bodyVersion: BODY_VERSION,
        },
        expectedUpdatedAt,
      );
      return toRecipeData(saved);
    },
    onSuccess: (saved) =>
      updateCache((list) => list.map((r) => (r.id === saved.id ? saved : r))),
  });
}

export function useDeleteRecipe() {
  const { actor } = useActor();
  const updateCache = useUpdateCache();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.deleteRecipe(id);
      return id;
    },
    onSuccess: (id) => {
      updateCache((list) => list.filter((r) => r.id !== id));
      // The backend also removed the recipe's share link.
      queryClient.setQueryData<ShareInfo[]>(SHARES_KEY, (old) =>
        old?.filter((s) => s.recipeId !== id),
      );
    },
  });
}

// ---------- Share links ----------

export function useShares() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<ShareInfo[]>({
    queryKey: SHARES_KEY,
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      const shares = await actor.listShares();
      return shares.sort((a, b) => Number(b.createdAt - a.createdAt));
    },
    enabled: !!identity && !!actor && !isFetching,
  });
}

// Returns the recipe's link token (the existing one if it already has one).
export function useCreateShare() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: bigint): Promise<string> => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.createShare(recipeId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHARES_KEY }),
  });
}

export function useRevokeShare() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.revokeShare(recipeId);
      return recipeId;
    },
    onSuccess: (recipeId) =>
      queryClient.setQueryData<ShareInfo[]>(SHARES_KEY, (old) =>
        old?.filter((s) => s.recipeId !== recipeId),
      ),
  });
}

export function useRevokeAllShares() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.revokeAllShares();
    },
    onSuccess: () => queryClient.setQueryData<ShareInfo[]>(SHARES_KEY, []),
  });
}

export type SharedRecipeData = RecipeBody & { title: string };

// The recipe behind a share link, read with an anonymous actor (no sign-in).
// null: the link doesn't exist (unknown, revoked or recipe deleted).
export function useSharedRecipe(token: string) {
  return useQuery<SharedRecipeData | null>({
    queryKey: ["shared", token],
    queryFn: async () => {
      if (!token) return null;
      const { backendId, rootKey } = getCanisterEnv();
      if (!backendId) throw new Error("Backend canister ID not found");
      const agent = await HttpAgent.create({ rootKey });
      const shared = await createActor(backendId, { agent }).getSharedRecipe(
        token,
      );
      return shared ? { ...parseBody(shared.body), title: shared.title } : null;
    },
    retry: 1,
  });
}

// Keeps each import call well below the 2 MB message limit.
const MAX_BATCH_CHARS = 1_000_000;
const MAX_BATCH_ITEMS = 200;

function batches(items: ImportItem[]): ImportItem[][] {
  const result: ImportItem[][] = [];
  let current: ImportItem[] = [];
  let size = 0;
  for (const item of items) {
    const itemSize = item.title.length + item.body.length;
    if (
      current.length &&
      (size + itemSize > MAX_BATCH_CHARS || current.length >= MAX_BATCH_ITEMS)
    ) {
      result.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += itemSize;
  }
  if (current.length) result.push(current);
  return result;
}

// Only adds recipes (with new IDs); never deletes or overwrites anything.
export function useImportRecipes() {
  const { actor } = useActor();
  const updateCache = useUpdateCache();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ImportItem[]): Promise<number> => {
      if (!actor) throw new Error("Actor not initialized");
      let added = 0;
      try {
        for (const batch of batches(items)) {
          const saved: Recipe[] = await actor.importRecipes(batch);
          added += saved.length;
          updateCache((list) => [...list, ...saved.map(toRecipeData)]);
        }
      } catch (error) {
        // Some batches may already be saved; show the real state.
        await queryClient.invalidateQueries({ queryKey: RECIPES_KEY });
        throw Object.assign(new Error(String(error)), { added });
      }
      return added;
    },
  });
}

export function useGetCycleBalance(enabled: boolean) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["cycleBalance"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getCycleBalance();
    },
    enabled: enabled && !!actor && !isFetching,
  });
}

// Update call (reads the frontend's status), so it is cached for 5 minutes.
export function useGetFrontendCycleBalance(enabled: boolean) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint | null>({
    queryKey: ["frontendCycleBalance"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getFrontendCycleBalance();
    },
    enabled: enabled && !!actor && !isFetching,
    staleTime: 5 * 60 * 1000,
  });
}
