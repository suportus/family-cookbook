import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "../lib/i18n";
import { translations } from "../lib/i18n";

interface LanguageStore {
  language: Language;
  setLanguage: (language: Language) => void;
  t: typeof translations.en;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, _get) => ({
      language: "en",
      setLanguage: (language: Language) =>
        set({ language, t: translations[language] }),
      t: translations.en,
    }),
    {
      name: "language-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.language];
        }
      },
    },
  ),
);
