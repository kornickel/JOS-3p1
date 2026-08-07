import { en } from "./en";
import { de } from "./de";
import { useLanguageStore } from "../../store/languageStore";

export type Language = "en" | "de";

export const dictionaries: Record<Language, typeof en> = { en, de };

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

export function useT() {
  const language = useLanguageStore((s) => s.language);
  return dictionaries[language];
}
