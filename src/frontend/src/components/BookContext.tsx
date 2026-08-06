import { type ReactNode, createContext, useContext, useState } from "react";

interface BookContextType {
  selectedBookId: string | null;
  setSelectedBookId: (bookId: string | null) => void;
  selectedRecipeId: string | null;
  setSelectedRecipeId: (recipeId: string | null) => void;
  view:
    | "home"
    | "book"
    | "recipe"
    | "recipeForm"
    | "settings"
    | "createCookbook"
    | "userSettings"
    | "invitations"
    | "adminDashboard";
  setView: (
    view:
      | "home"
      | "book"
      | "recipe"
      | "recipeForm"
      | "settings"
      | "createCookbook"
      | "userSettings"
      | "invitations"
      | "adminDashboard",
  ) => void;
  editingRecipeId: string | null;
  setEditingRecipeId: (recipeId: string | null) => void;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: ReactNode }) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [view, setView] = useState<
    | "home"
    | "book"
    | "recipe"
    | "recipeForm"
    | "settings"
    | "createCookbook"
    | "userSettings"
    | "invitations"
    | "adminDashboard"
  >("home");
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  return (
    <BookContext.Provider
      value={{
        selectedBookId,
        setSelectedBookId,
        selectedRecipeId,
        setSelectedRecipeId,
        view,
        setView,
        editingRecipeId,
        setEditingRecipeId,
      }}
    >
      {children}
    </BookContext.Provider>
  );
}

export function useBookContext() {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error("useBookContext must be used within BookProvider");
  }
  return context;
}
