import type { Recipe } from "../backend";

// The backend stores everything except the title as a JSON text (`body`).
// `bodyVersion` says which format the body uses. New fields can be added to
// the body later without a backend data migration: older bodies simply don't
// have them, and `parseBody` fills in defaults.
export const BODY_VERSION = 1n;

export type IngredientRow = { kind: "item" | "section"; text: string };

export type AirFryerStage = {
  tempC: number | null;
  minutes: number | null;
  note: string;
};

export type AirFryer = {
  program: string;
  preheat: boolean;
  stages: AirFryerStage[];
  note: string;
};

export type RecipeBody = {
  tags: string[];
  ingredients: IngredientRow[];
  steps: string[];
  airFryer: AirFryer | null;
};

export type RecipeData = RecipeBody & {
  id: bigint;
  title: string;
  createdAt: bigint;
  updatedAt: bigint;
};

export const MAX_STAGES = 3;

export const DEFAULT_TAGS = [
  "Air fryer",
  "Juhe",
  "Kosila",
  "Kruh",
  "Omake",
  "Prigrizki",
  "Sladice",
  "Zajtrki",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Reads a body of any known version; unknown or broken input gives an empty
// recipe body rather than an error.
export function bodyFromObject(raw: unknown): RecipeBody {
  const obj = asObject(raw);
  const af = obj.airFryer ? asObject(obj.airFryer) : null;
  return {
    tags: asArray(obj.tags).map(asString).filter(Boolean),
    ingredients: asArray(obj.ingredients).map((row) => {
      const r = asObject(row);
      return {
        kind: r.kind === "section" ? "section" : "item",
        text: asString(r.text),
      };
    }),
    steps: asArray(obj.steps).map(asString),
    airFryer: af
      ? {
          program: asString(af.program),
          preheat: af.preheat === true,
          stages: asArray(af.stages)
            .slice(0, MAX_STAGES)
            .map((stage) => {
              const s = asObject(stage);
              return {
                tempC: asNumber(s.tempC),
                minutes: asNumber(s.minutes),
                note: asString(s.note),
              };
            }),
          note: asString(af.note),
        }
      : null,
  };
}

export function parseBody(text: string): RecipeBody {
  try {
    return bodyFromObject(JSON.parse(text));
  } catch {
    return bodyFromObject(null);
  }
}

// Invisible characters that often come along with pasted text: zero-width
// space, word joiner, byte order mark and soft hyphen. (The zero-width joiner
// stays: emojis such as 👨‍🍳 need it.)
const INVISIBLE = /[\u200B\u200C\u2060\uFEFF\u00AD]/g;

// Removes invisible characters and trims.
export function cleanText(text: string): string {
  return text.replace(INVISIBLE, "").trim();
}

// Trims text, drops empty rows and empty air fryer stages, and drops the air
// fryer settings entirely when nothing is filled in.
export function cleanBody(body: RecipeBody): RecipeBody {
  const tags: string[] = [];
  for (const tag of body.tags) {
    const t = cleanText(tag);
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      tags.push(t);
    }
  }
  const af = body.airFryer;
  let airFryer: AirFryer | null = null;
  if (af) {
    const stages = af.stages
      .map((s) => ({ ...s, note: cleanText(s.note) }))
      .filter((s) => s.tempC !== null || s.minutes !== null || s.note);
    const cleaned = {
      program: cleanText(af.program),
      preheat: af.preheat,
      stages,
      note: cleanText(af.note),
    };
    if (cleaned.program || cleaned.preheat || stages.length || cleaned.note) {
      airFryer = cleaned;
    }
  }
  return {
    tags: tags.sort((a, b) => a.localeCompare(b, "sl")),
    ingredients: body.ingredients
      .map((r) => ({ kind: r.kind, text: cleanText(r.text) }))
      .filter((r) => r.text),
    steps: body.steps.map(cleanText).filter(Boolean),
    airFryer,
  };
}

export function serializeBody(body: RecipeBody): string {
  return JSON.stringify(cleanBody(body));
}

export function toRecipeData(recipe: Recipe): RecipeData {
  return {
    ...parseBody(recipe.body),
    id: recipe.id,
    title: recipe.title,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

// ---------- Display ----------

export function formatNumber(n: number): string {
  return n.toLocaleString("sl-SI", { maximumFractionDigits: 1 });
}

function stageText(stage: AirFryerStage): string {
  const parts: string[] = [];
  if (stage.tempC !== null) parts.push(`${formatNumber(stage.tempC)} °C`);
  if (stage.minutes !== null) parts.push(`${formatNumber(stage.minutes)} min`);
  return parts.join(" · ");
}

// Compact one-line summary for recipe cards, e.g.
// "AIR FRY · 200 °C · 12 min" or "AIR FRY · 200 °C · 12 min → 180 °C · 3 min".
export function airFryerLine(af: AirFryer | null): string {
  if (!af) return "";
  const parts: string[] = [];
  if (af.program) parts.push(af.program.toLocaleUpperCase("sl-SI"));
  const stages = af.stages.map(stageText).filter(Boolean);
  if (stages.length) parts.push(stages.join(" → "));
  if (!parts.length) return af.preheat ? "AIR FRYER · predgrevanje" : "";
  return parts.join(" · ");
}

export function formatDate(ns: bigint): string {
  return new Date(Number(ns / 1_000_000n)).toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

// Plain text for WhatsApp/Viber (*bold* works in both).
export function shareText(recipe: RecipeData): string {
  const lines: string[] = [`*${recipe.title}*`];
  if (recipe.tags.length) lines.push(`Oznake: ${recipe.tags.join(", ")}`);
  const af = recipe.airFryer;
  if (af) {
    lines.push("", "*Air fryer*");
    const head = [af.program, af.preheat ? "predgrevanje" : ""].filter(Boolean);
    if (head.length) lines.push(head.join(", "));
    af.stages.forEach((stage, i) => {
      const text = [stageText(stage), stage.note].filter(Boolean).join(" – ");
      lines.push(af.stages.length > 1 ? `${i + 1}) ${text}` : text);
    });
    if (af.note) lines.push(af.note);
  }
  if (recipe.ingredients.length) {
    lines.push("", "*Sestavine*");
    for (const row of recipe.ingredients) {
      lines.push(row.kind === "section" ? `_${row.text}_` : `- ${row.text}`);
    }
  }
  if (recipe.steps.length) {
    lines.push("", "*Navodila*");
    recipe.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  return lines.join("\n");
}

// ---------- Search ----------

// Lower case without accents: "Piščanec" -> "piscanec".
export function fold(text: string): string {
  return text
    .replace(INVISIBLE, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function words(text: string): string[] {
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// Every typed word must match the beginning of a word in the given texts.
export function matchesSearch(query: string, texts: string[]): boolean {
  const wanted = words(query);
  if (!wanted.length) return true;
  const have = texts.flatMap(words);
  return wanted.every((w) => have.some((h) => h.startsWith(w)));
}

export function searchTexts(recipe: RecipeData): string[] {
  return [
    recipe.title,
    ...recipe.ingredients.map((r) => r.text),
    ...recipe.tags,
    recipe.airFryer?.program ?? "",
  ];
}

export function compareTitles(a: string, b: string): number {
  return a.localeCompare(b, "sl", { sensitivity: "base" });
}

// Tags for suggestions: the default ones plus every tag already used.
export function allTags(recipes: RecipeData[]): string[] {
  const set = new Map<string, string>();
  for (const tag of [...DEFAULT_TAGS, ...recipes.flatMap((r) => r.tags)]) {
    const key = fold(tag);
    if (!set.has(key)) set.set(key, tag);
  }
  return [...set.values()].sort(compareTitles);
}

export function usedPrograms(recipes: RecipeData[]): string[] {
  const set = new Map<string, string>();
  for (const r of recipes) {
    const p = r.airFryer?.program;
    if (p && !set.has(fold(p))) set.set(fold(p), p);
  }
  return [...set.values()].sort(compareTitles);
}

// Splits pasted text into rows: one per line, without bullets or numbering.
export function splitPastedLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      cleanText(line)
        .replace(/^[-•*–]\s*/, "")
        // "1. " or "2) ", but not "0.5 kg"
        .replace(/^\d+[.)]\s+/, "")
        .trim(),
    )
    .filter(Boolean);
}
