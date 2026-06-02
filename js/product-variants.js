import { t, localizeOptionLabel } from "./i18n.js";

/** @typedef {{ name: string, values: string[] }} ProductOptionGroup */
/** @typedef {{ vid?: string, variantSku?: string, variantKey?: string, variantKeyEn?: string, variantSellPrice?: number, variantImage?: string, variantNameEn?: string }} CjVariant */

export function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim().startsWith("[")) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Split CJ variantKey using known option count (handles values with hyphens/spaces). */
export function splitVariantKey(key, partCount = 0) {
  if (key == null || key === "") return [];

  const fromJson = parseJsonArray(key);
  if (fromJson?.length) return fromJson.map(String);

  const str = String(key).trim();
  if (!str) return [];

  const count = Number(partCount) || 0;
  if (count <= 1) return [str];

  const parts = [];
  let remaining = str;
  for (let i = 0; i < count - 1; i++) {
    const idx = remaining.indexOf("-");
    if (idx === -1) {
      parts.push(remaining.trim());
      remaining = "";
      break;
    }
    parts.push(remaining.slice(0, idx).trim());
    remaining = remaining.slice(idx + 1);
  }
  if (remaining) parts.push(remaining.trim());
  return parts.filter(Boolean);
}

function rawOptionNames(product) {
  const variants = product.variants ?? [];

  const fromEnSet = parseJsonArray(product.productKeyEn);
  if (fromEnSet?.length) return fromEnSet.map(String);

  const en = product.productKeyEn;
  if (typeof en === "string" && en.includes("-") && !en.trim().startsWith("[")) {
    const split = en
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);
    if (split.length > 1) return split;
  }

  if (typeof en === "string" && en.trim() && !en.trim().startsWith("[")) {
    return [en.trim()];
  }

  const fromSet = parseJsonArray(product.productKeySet);
  if (fromSet?.length) return fromSet.map(String);

  if (variants.length) {
    const keyEn = parseJsonArray(variants[0].variantKeyEn);
    if (keyEn?.length) return keyEn.map(String);
  }

  return [];
}

export function getVariantPartCount(product) {
  const variants = product.variants ?? [];
  const named = rawOptionNames(product);
  if (named.length) return named.length;

  if (!variants.length) return 0;

  return Math.max(
    1,
    ...variants.map((v) =>
      splitVariantKey(v.variantKey ?? v.variantKeyEn, 99).length
    )
  );
}

/** @returns {string[]} */
export function getOptionNames(product) {
  const variants = product.variants ?? [];
  const partCount = getVariantPartCount(product);

  let names = rawOptionNames(product);

  if (!names.length && variants.length) {
    names = Array.from({ length: partCount }, (_, i) =>
      t("product.option", { n: i + 1 })
    );
  }

  while (names.length < partCount) {
    names.push(t("product.option", { n: names.length + 1 }));
  }

  if (partCount && names.length > partCount) {
    names = names.slice(0, partCount);
  }

  return names.map(localizeOptionLabel);
}

/** @returns {ProductOptionGroup[]} */
export function buildOptionGroups(product) {
  const variants = product.variants ?? [];
  const optionNames = getOptionNames(product);
  const partCount = optionNames.length;

  if (!variants.length || !partCount) return [];

  const valueSets = optionNames.map(() => new Set());

  for (const variant of variants) {
    const parts = splitVariantKey(
      variant.variantKey ?? variant.variantKeyEn,
      partCount
    );
    parts.forEach((val, i) => {
      if (i < valueSets.length) valueSets[i].add(val);
    });
  }

  return optionNames.map((name, i) => ({
    name,
    values: [...valueSets[i]].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    ),
  }));
}

/** @param {Record<string, string>} selections */
export function findVariant(product, selections) {
  const variants = product.variants ?? [];
  const optionNames = getOptionNames(product);
  const partCount = optionNames.length;

  if (!variants.length) return null;
  if (!partCount) return variants[0] ?? null;

  return (
    variants.find((variant) => {
      const parts = splitVariantKey(
        variant.variantKey ?? variant.variantKeyEn,
        partCount
      );
      return optionNames.every((name, i) => selections[name] === parts[i]);
    }) ?? null
  );
}

export function optionsArrayFromSelections(selectedOptions) {
  return Object.entries(selectedOptions).map(([name, value]) => ({
    name,
    value,
  }));
}

export function selectionLabel(selectedOptions) {
  const parts = optionsArrayFromSelections(selectedOptions).map((o) => o.value);
  return parts.filter(Boolean).join(", ");
}

export function defaultSelections(product) {
  const groups = buildOptionGroups(product);
  const selectedOptions = {};

  for (const group of groups) {
    if (group.values[0]) selectedOptions[group.name] = group.values[0];
  }

  return {
    selectedOptions,
    selectedVariant:
      findVariant(product, selectedOptions) ?? product.variants?.[0] ?? null,
  };
}

export function shouldShowVariantUi(product) {
  const variants = product.variants ?? [];
  const groups = buildOptionGroups(product);
  if (!variants.length) return false;
  if (variants.length === 1 && groups.every((g) => g.values.length <= 1)) {
    return false;
  }
  return groups.some((g) => g.values.length > 0);
}
