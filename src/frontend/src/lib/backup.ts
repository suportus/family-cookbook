import { Principal } from "@icp-sdk/core/principal";
import type { ImportItem } from "../backend";
import {
  BODY_VERSION,
  type RecipeBody,
  type RecipeData,
  bodyFromObject,
  cleanText,
  serializeBody,
} from "./recipe";

// Backup file: one JSON file with every recipe. The body is stored as a
// readable object (not as a JSON string), dates as ISO text.
//
// {
//   "app": "kuharica",
//   "format": 1,
//   "exportedAt": "2026-10-29T20:00:00.000Z",
//   "recipes": [
//     { "title": "...", "createdAt": "...", "updatedAt": "...", "bodyVersion": 1,
//       "body": { "tags": [], "ingredients": [], "steps": [], "airFryer": null } }
//   ]
// }
//
// Format 2: steps are rows ({ "kind": "step" | "section", "text": "..." }).
// Format 1 files (steps as plain texts) still import; an older app refuses a
// format 2 file instead of losing its steps.
//
// An owner's backup also has "author" (principal) and "authorName" for each
// recipe; restoring it as an owner keeps the authors. A contributor's backup
// has only their own recipes, without authors. Files without authors still
// import: the importer becomes the author.

const APP = "kuharica";
const FORMAT = 2;

export type BackupRecipe = {
  title: string;
  body: RecipeBody;
  createdAt?: bigint;
  updatedAt?: bigint;
  author?: Principal;
};

function nsToIso(ns: bigint): string {
  return new Date(Number(ns / 1_000_000n)).toISOString();
}

function toPrincipal(value: unknown): Principal | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return Principal.fromText(value);
  } catch {
    return undefined;
  }
}

function isoToNs(value: unknown): bigint | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : BigInt(ms) * 1_000_000n;
}

export function backupJson(recipes: RecipeData[]): string {
  return JSON.stringify(
    {
      app: APP,
      format: FORMAT,
      exportedAt: new Date().toISOString(),
      recipes: recipes.map((r) => ({
        title: r.title,
        ...(r.author && {
          author: r.author.toText(),
          authorName: r.authorName,
        }),
        createdAt: nsToIso(r.createdAt),
        updatedAt: nsToIso(r.updatedAt),
        bodyVersion: Number(BODY_VERSION),
        body: {
          tags: r.tags,
          ingredients: r.ingredients,
          steps: r.steps,
          airFryer: r.airFryer,
        },
      })),
    },
    null,
    2,
  );
}

export function backupFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `kuharica-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

// Throws an Error with a Slovenian message if the file isn't a backup.
export function parseBackup(text: string): BackupRecipe[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Datoteka ni veljaven JSON.");
  }
  const obj = data as Record<string, unknown> | null;
  if (!obj || obj.app !== APP || !Array.isArray(obj.recipes)) {
    throw new Error("To ni varnostna kopija kuharice.");
  }
  if (typeof obj.format !== "number" || obj.format > FORMAT) {
    throw new Error("Varnostna kopija je iz novejše različice aplikacije.");
  }
  return obj.recipes
    .map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return {
        title: typeof r.title === "string" ? cleanText(r.title) : "",
        body: bodyFromObject(r.body),
        createdAt: isoToNs(r.createdAt),
        updatedAt: isoToNs(r.updatedAt),
        author: toPrincipal(r.author),
      };
    })
    .filter((r) => r.title);
}

export function toImportItem(r: BackupRecipe): ImportItem {
  return {
    title: r.title,
    body: serializeBody(r.body),
    bodyVersion: BODY_VERSION,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: r.author,
  };
}

export function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
