import { LANGUAGE_OPTIONS, useT } from "../../lib/i18n";
import { useLanguageStore } from "../../store/languageStore";

export function LanguageSwitcher() {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <select
      aria-label={t.languageSwitcher.ariaLabel}
      value={language}
      onChange={(e) => setLanguage(e.target.value as typeof language)}
      className="rounded border px-2 py-1 text-xs"
      style={{ borderColor: "var(--gridline)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
    >
      {LANGUAGE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
