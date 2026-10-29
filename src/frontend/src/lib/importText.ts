import {
  type AirFryer,
  type AirFryerStage,
  type IngredientRow,
  MAX_STAGES,
  type RecipeBody,
  cleanBody,
  fold,
  splitPastedLines,
} from "./recipe";

// Parses pasted text in this format (recipes separated by a "---" line):
//
//   Piščančja bedra
//   Oznake: Air fryer, Kosila
//   Air fryer: Air Fry | predgrevanje | 200 °C 12 min (obrni po 6 min) | 180 °C 3 min
//   Air fryer opomba: Bedra naj bodo suha.
//   Sestavine:
//   4 piščančja bedra
//   ## Marinada
//   1 žlica olja
//   Navodila:
//   1. Bedra osuši.
//   2. Natri z marinado.

export type ParsedRecipe = {
  title: string;
  body: RecipeBody;
  warnings: string[];
};

type Mode = "none" | "ingredients" | "steps";

const LABELS = {
  tags: "oznake",
  airFryer: "air fryer",
  airFryerNote: "air fryer opomba",
  ingredients: "sestavine",
  steps: "navodila",
} as const;

function labelOf(line: string): { label: string; rest: string } | null {
  const i = line.indexOf(":");
  if (i < 0) return null;
  const label = fold(line.slice(0, i)).replace(/\s+/g, " ").trim();
  if (!Object.values(LABELS).includes(label as never)) return null;
  return { label, rest: line.slice(i + 1).trim() };
}

function toNumber(text: string): number {
  return Number(text.replace(",", "."));
}

// "200 °C 12 min (obrni po 6 min)" -> stage; null if it isn't a stage.
export function parseStage(part: string): AirFryerStage | null {
  // Numbers inside the bracketed note ("obrni po 6 min") don't count.
  const main = part.replace(/\([^)]*\)/g, " ");
  const temp = main.match(
    /(\d+(?:[.,]\d+)?)\s*°\s*C?|(\d+(?:[.,]\d+)?)\s*C\b/i,
  );
  const min = main.match(/(\d+(?:[.,]\d+)?)\s*min\b/i);
  if (!temp && !min) return null;
  let note = "";
  const bracket = part.match(/\(([^)]*)\)/);
  if (bracket) {
    note = bracket[1].trim();
  } else {
    let rest = main;
    if (temp) rest = rest.replace(temp[0], "");
    if (min) rest = rest.replace(min[0], "");
    note = rest.replace(/^[\s,·–-]+|[\s,·–-]+$/g, "").trim();
  }
  return {
    tempC: temp ? toNumber(temp[1] ?? temp[2]) : null,
    minutes: min ? toNumber(min[1]) : null,
    note,
  };
}

function parseAirFryer(text: string, warnings: string[]): AirFryer {
  const af: AirFryer = { program: "", preheat: false, stages: [], note: "" };
  for (const raw of text.split("|")) {
    const part = raw.trim();
    if (!part) continue;
    if (fold(part).startsWith("predgre")) {
      af.preheat = true;
      continue;
    }
    const stage = parseStage(part);
    if (stage) {
      if (af.stages.length < MAX_STAGES) {
        af.stages.push(stage);
      } else {
        warnings.push(`Največ ${MAX_STAGES} stopnje, preskočeno: »${part}«`);
      }
    } else if (!af.program) {
      af.program = part;
    } else {
      warnings.push(`Neznan del nastavitev: »${part}«`);
    }
  }
  return af;
}

function parseOne(block: string): ParsedRecipe | null {
  const lines = block.split(/\r?\n/).map((l) => l.trim());
  const titleIndex = lines.findIndex(Boolean);
  if (titleIndex < 0) return null;

  const warnings: string[] = [];
  const title = lines[titleIndex];
  const ingredients: IngredientRow[] = [];
  const steps: string[] = [];
  let tags: string[] = [];
  let airFryer: AirFryer | null = null;
  let mode: Mode = "none";

  const addLine = (line: string) => {
    if (mode === "ingredients") {
      if (line.startsWith("#")) {
        const text = line.replace(/^#+\s*/, "");
        if (text) ingredients.push({ kind: "section", text });
      } else {
        for (const text of splitPastedLines(line)) {
          ingredients.push({ kind: "item", text });
        }
      }
    } else if (mode === "steps") {
      steps.push(...splitPastedLines(line));
    } else {
      warnings.push(`Neznana vrstica: »${line}«`);
    }
  };

  for (const line of lines.slice(titleIndex + 1)) {
    if (!line) continue;
    const label = labelOf(line);
    if (!label) {
      addLine(line);
      continue;
    }
    switch (label.label) {
      case LABELS.tags:
        tags = label.rest
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        mode = "none";
        break;
      case LABELS.airFryer:
        airFryer = {
          ...parseAirFryer(label.rest, warnings),
          // (cast: TypeScript can't see that the loop assigns airFryer)
          note: (airFryer as AirFryer | null)?.note ?? "",
        };
        mode = "none";
        break;
      case LABELS.airFryerNote:
        airFryer = {
          ...(airFryer ?? { program: "", preheat: false, stages: [] }),
          note: label.rest,
        };
        mode = "none";
        break;
      case LABELS.ingredients:
        mode = "ingredients";
        if (label.rest) addLine(label.rest);
        break;
      case LABELS.steps:
        mode = "steps";
        if (label.rest) addLine(label.rest);
        break;
    }
  }

  return {
    title,
    body: cleanBody({ tags, ingredients, steps, airFryer }),
    warnings,
  };
}

export function parseRecipeText(text: string): ParsedRecipe[] {
  return text
    .split(/^\s*-{3,}\s*$/m)
    .map(parseOne)
    .filter((r): r is ParsedRecipe => r !== null);
}
