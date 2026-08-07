import { useMeta } from "./api";
import { useLanguageStore } from "../store/languageStore";
import { inputParamLabels, enumLabels, optionLabels, outputParamMeaningsDe } from "./i18n/metaLabels";
import type { MetaResponse } from "./jos3-types";

// Wraps useMeta() and overrides the backend-supplied label/meaning text
// with this file's own translations for the active language, keyed by the
// stable backend field/enum/param key -- see metaLabels.ts for why. Falls
// back to the raw backend text for any key without a local translation, so
// nothing breaks if the backend ever adds a field this file doesn't know
// about yet.
export function useLocalizedMeta() {
  const language = useLanguageStore((s) => s.language);
  const query = useMeta();
  const data = query.data;

  if (!data) return query;

  const localized: MetaResponse = {
    ...data,
    input_params: Object.fromEntries(
      Object.entries(data.input_params).map(([key, meta]) => [
        key,
        { ...meta, label: inputParamLabels[language][key] ?? meta.label },
      ])
    ),
    enums: Object.fromEntries(
      Object.entries(data.enums).map(([enumName, options]) => [
        enumName,
        options.map((opt) => ({
          ...opt,
          label: enumLabels[language][enumName]?.[opt.value] ?? opt.label,
        })),
      ])
    ),
    options: Object.fromEntries(
      Object.entries(data.options).map(([key, meta]) => [
        key,
        { ...meta, label: optionLabels[language][key] ?? meta.label },
      ])
    ),
    output_params: Object.fromEntries(
      Object.entries(data.output_params).map(([key, meta]) => [
        key,
        { ...meta, meaning: language === "de" ? (outputParamMeaningsDe[key] ?? meta.meaning) : meta.meaning },
      ])
    ),
  };

  return { ...query, data: localized };
}
