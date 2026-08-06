import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminDashboardStats,
  BookMeta,
  Ingredient,
  Invitation,
  Recipe,
  UserProfile,
  UserRole,
} from "../backend";
import { useActor } from "./useActor";

// Helper function to normalize imageUrl to string | undefined (matching backend type)
function normalizeImageUrl(imageUrl: any): string | undefined {
  if (imageUrl === null || imageUrl === undefined) {
    return undefined;
  }
  if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
    return imageUrl.trim();
  }
  // Handle malformed data (objects, arrays, etc.)
  return undefined;
}

// Helper function to normalize a recipe object
function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    imageUrl: normalizeImageUrl(recipe.imageUrl),
  };
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const profile = await actor.getCallerUserProfile();
      return profile;
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principal: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principal],
    queryFn: async () => {
      if (!actor || !principal) return null;
      try {
        const principalObj = Principal.fromText(principal);
        const profile = await actor.getUserProfile(principalObj);
        return profile;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!principal,
    retry: false,
    staleTime: 60000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["currentUserProfile"], profile);
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
    },
  });
}

export function useGetBooksForUser() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<BookMeta & { is_favorite: boolean }>>({
    queryKey: ["books"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBooksForUser();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      useDefaultTags,
      customTags,
    }: { title: string; useDefaultTags: boolean; customTags: string[] }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createBook(title, useDefaultTags, customTags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useDeleteBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteBook(bookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useRenameBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      newTitle,
    }: { bookId: string; newTitle: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.renameBook(bookId, newTitle);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({
        queryKey: ["bookMeta", variables.bookId],
      });
    },
  });
}

export function useGetBookMeta(bookId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<BookMeta | null>({
    queryKey: ["bookMeta", bookId],
    queryFn: async () => {
      if (!actor || !bookId) return null;
      return actor.getBookMeta(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetBookTags(bookId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{ useDefaultTags: boolean; customTags: string[] }>({
    queryKey: ["bookTags", bookId],
    queryFn: async () => {
      if (!actor || !bookId) return { useDefaultTags: true, customTags: [] };
      return actor.getBookTags(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useUpdateBookTags() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      useDefaultTags,
      customTags,
    }: { bookId: string; useDefaultTags: boolean; customTags: string[] }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateBookTags(bookId, useDefaultTags, customTags);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["bookTags", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookMeta", variables.bookId],
      });
    },
  });
}

export function useGetUserRole(bookId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole | null>({
    queryKey: ["userRole", bookId],
    queryFn: async () => {
      if (!actor || !bookId) return null;
      return actor.getUserRole(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useListRecipes(bookId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Recipe[]>({
    queryKey: ["recipes", bookId],
    queryFn: async () => {
      if (!actor || !bookId) return [];
      try {
        const recipes = await actor.listRecipes(bookId);
        // Normalize all recipes to ensure imageUrl is always string | undefined
        return recipes.map(normalizeRecipe);
      } catch (error) {
        console.error("Error fetching recipes:", error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetRecipe(bookId: string | null, recipeId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Recipe | null>({
    queryKey: ["recipe", bookId, recipeId],
    queryFn: async () => {
      if (!actor || !bookId || !recipeId) return null;
      try {
        const recipe = await actor.getRecipe(bookId, recipeId);
        // Normalize recipe to ensure imageUrl is always string | undefined
        return recipe ? normalizeRecipe(recipe) : null;
      } catch (error) {
        console.error("Error fetching recipe:", error);
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!bookId && !!recipeId,
  });
}

export function useAddRecipe() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      title,
      ingredients,
      instructions,
      tags,
      imageUrl,
    }: {
      bookId: string;
      title: string;
      ingredients: Ingredient[];
      instructions: string;
      tags: string[];
      imageUrl: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addRecipe(
        bookId,
        title,
        ingredients,
        instructions,
        tags,
        imageUrl,
      );
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch immediately to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["recipes", variables.bookId],
      });
      await queryClient.refetchQueries({
        queryKey: ["recipes", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookTags", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookMeta", variables.bookId],
      });
    },
  });
}

export function useEditRecipe() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      recipeId,
      title,
      ingredients,
      instructions,
      tags,
      imageUrl,
    }: {
      bookId: string;
      recipeId: string;
      title: string;
      ingredients: Ingredient[];
      instructions: string;
      tags: string[];
      imageUrl: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.editRecipe(
        bookId,
        recipeId,
        title,
        ingredients,
        instructions,
        tags,
        imageUrl,
      );
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch immediately to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["recipes", variables.bookId],
      });
      await queryClient.refetchQueries({
        queryKey: ["recipes", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recipe", variables.bookId, variables.recipeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookTags", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookMeta", variables.bookId],
      });
    },
  });
}

export function useDeleteRecipe() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      recipeId,
    }: { bookId: string; recipeId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteRecipe(bookId, recipeId);
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch immediately to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["recipes", variables.bookId],
      });
      await queryClient.refetchQueries({
        queryKey: ["recipes", variables.bookId],
      });
    },
  });
}

export function useCopyRecipe() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceBookId,
      recipeId,
      targetBookId,
    }: {
      sourceBookId: string;
      recipeId: string;
      targetBookId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.copyRecipe(sourceBookId, recipeId, targetBookId);
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch immediately to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["recipes", variables.targetBookId],
      });
      await queryClient.refetchQueries({
        queryKey: ["recipes", variables.targetBookId],
      });
    },
  });
}

export function useMoveRecipe() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceBookId,
      recipeId,
      targetBookId,
    }: {
      sourceBookId: string;
      recipeId: string;
      targetBookId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.moveRecipe(sourceBookId, recipeId, targetBookId);
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch immediately to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["recipes", variables.sourceBookId],
      });
      await queryClient.refetchQueries({
        queryKey: ["recipes", variables.sourceBookId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["recipes", variables.targetBookId],
      });
      await queryClient.refetchQueries({
        queryKey: ["recipes", variables.targetBookId],
      });
    },
  });
}

export function useInviteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      principalId,
      role,
    }: {
      bookId: string;
      principalId: string;
      role: UserRole;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const principal = Principal.fromText(principalId);
      return actor.inviteUser(bookId, principal, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["bookMembers", variables.bookId],
      });
    },
  });
}

export function useRemoveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      principalId,
    }: { bookId: string; principalId: string }) => {
      if (!actor) throw new Error("Actor not available");
      const principal = Principal.fromText(principalId);
      return actor.removeUser(bookId, principal);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["bookMembers", variables.bookId],
      });
    },
  });
}

export function useChangeUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      principalId,
      newRole,
    }: {
      bookId: string;
      principalId: string;
      newRole: UserRole;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const principal = Principal.fromText(principalId);
      return actor.changeUserRole(bookId, principal, newRole);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["bookMembers", variables.bookId],
      });
    },
  });
}

export function useListBookMembers(bookId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<{ principal: string; name: string; role: UserRole }>>({
    queryKey: ["bookMembers", bookId],
    queryFn: async () => {
      if (!actor || !bookId) return [];
      const members = await actor.listBookMembers(bookId);
      return members.map((member) => ({
        principal: member.principal.toString(),
        name: member.name,
        role: member.role,
      }));
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetPendingInvitations() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invitation[]>({
    queryKey: ["pendingInvitations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingInvitations();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 30000,
  });
}

export function useAcceptInvitation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cookbookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.acceptInvitation(cookbookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useDeclineInvitation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cookbookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.declineInvitation(cookbookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useLeaveCookbook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.leaveCookbook(bookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["bookMembers"] });
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
    },
  });
}

export function useGetAdminDashboardStats() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AdminDashboardStats | null>({
    queryKey: ["adminDashboardStats"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getAdminDashboardStats();
      } catch (error) {
        console.error("Error fetching admin dashboard stats:", error);
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useFavoriteCookbook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cookbookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.favoriteCookbook(cookbookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useUnfavoriteCookbook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cookbookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.unfavoriteCookbook(cookbookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useGetAppVersion() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string>({
    queryKey: ["appVersion"],
    queryFn: async () => {
      if (!actor) return "1.0.0";
      try {
        return await actor.getAppVersion();
      } catch (error) {
        console.error("Error fetching app version:", error);
        return "1.0.0";
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 300000,
  });
}

export function useSetAppVersion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (version: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setAppVersion(version);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appVersion"] });
    },
  });
}
