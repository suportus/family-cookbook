import {
  type AirFryer,
  type AirFryerStage,
  type IngredientRow,
  MAX_STAGES,
  type RecipeBody,
  type StepRow,
  cleanBody,
  cleanText,
  fold,
  splitPastedLines,
  stepFromLine,
} from "./recipe";

// Parses pasted text in the format shown by IMPORT_EXAMPLE (recipes
// separated by a "---" line). The labels, the example, the rules shown in the
// app and the instruction for an AI chat all come from the constants below,
// so they can't drift apart from the parser (see importText.test.ts).
//
// Under the steps label, a line that starts with "##" or ends with ":" is a
// heading, unless it is numbered or bulleted (see `stepFromLine`).

export type ParsedRecipe = {
  title: string;
  body: RecipeBody;
  warnings: string[];
};

type Mode = "none" | "ingredients" | "steps";

// The labels as written in the text; matched case- and accent-insensitively.
export const LABELS = {
  tags: "Oznake",
  airFryer: "Air fryer",
  airFryerNote: "Air fryer opomba",
  ingredients: "Sestavine",
  steps: "Navodila",
} as const;

type LabelKey = keyof typeof LABELS;

export const RECIPE_SEPARATOR = "---";

const L = LABELS;

// One complete recipe: tags, air fryer with preheat and two stages, a note,
// an ingredient section and a step heading.
export const IMPORT_EXAMPLE = `Piščančja bedra v air fryerju
${L.tags}: Air fryer, Kosila
${L.airFryer}: Air Fry | predgrevanje | 200 °C 12 min (obrni po 6 min) | 180 °C 3 min
${L.airFryerNote}: Bedra naj bodo čim bolj suha.
${L.ingredients}:
4 piščančja bedra
## Marinada
1 žlica olja
1 žlička paprike
${L.steps}:
1. Bedra osuši s papirnato brisačo.
2. Natri z marinado.
## Peka
1. Peci v air fryerju, na polovici obrni.`;

// The example in the import dialog: the full recipe and a short second one.
export const IMPORT_SAMPLE = `${IMPORT_EXAMPLE}
${RECIPE_SEPARATOR}
Krompirček
${L.tags}: Air fryer, Prigrizki
${L.airFryer}: Fries | 190 °C 15 min (pretresi na pol)`;

// The format rules, shown in the import dialog and in the AI instruction.
// `tags`: the tags to suggest (the app's default tags plus those in use).
export function formatRules(tags: string[]): string[] {
  return [
    "Prva vrstica je naslov recepta (edino obvezno).",
    `»${L.tags}:« oznake, ločene z vejico.${tags.length ? ` Kjer ustrezajo, uporabi te: ${tags.join(", ")}.` : ""}`,
    `»${L.airFryer}:« deli, ločeni z »|«: najprej program (npr. Air Fry), nato »predgrevanje«, če je potrebno, nato do ${MAX_STAGES} stopnje v obliki »200 °C 12 min (opomba)«; opomba v oklepaju ni obvezna. Več stopenj zapiši kot več delov, npr. »200 °C 12 min | 180 °C 3 min«.`,
    `»${L.airFryerNote}:« splošna opomba za peko v air fryerju.`,
    `»${L.ingredients}:« v naslednjih vrsticah ena sestavina na vrstico. Razdelek sestavin začni z vrstico »## Ime razdelka«.`,
    `»${L.steps}:« v naslednjih vrsticah en korak na vrstico (številke niso obvezne). Naslov skupine korakov je vrstica, ki se začne z »##« ali konča z dvopičjem, a ni oštevilčena in nima alineje; za naslovom se številčenje začne znova pri 1.`,
    `Če je receptov več, jih loči z vrstico »${RECIPE_SEPARATOR}«.`,
  ];
}

export const AI_INSTRUCTION_END = "Recept, ki ga pretvori:";

// A complete instruction for an AI chat (ChatGPT, Gemini, Claude ...); the
// recipe is pasted after the last line.
export function aiInstruction(tags: string[]): string {
  const fence = "```";
  return [
    "Pretvori recept, ki ga prilepim na koncu, natanko v spodnjo obliko.",
    "",
    "Pravila:",
    "- Recept napiši v slovenščini (po potrebi ga prevedi). Uporabljaj metrične enote (g, ml, °C); temperature vedno v °C.",
    `- Odgovori SAMO z oblikovanim receptom v enem bloku kode (${fence}), brez uvoda in brez razlage.`,
    `- Ne izmišljuj podatkov: vrstico ali razdelek, ki ga v izvirniku ni, izpusti (npr. vrstico »${L.airFryer}:«, če recept nima nastavitev za air fryer).`,
    "",
    "Oblika:",
    ...formatRules(tags).map((rule) => `- ${rule}`),
    "",
    "Primer:",
    fence,
    IMPORT_EXAMPLE,
    fence,
    "",
    AI_INSTRUCTION_END,
    "",
  ].join("\n");
}

function labelOf(line: string): { label: LabelKey; rest: string } | null {
  const i = line.indexOf(":");
  if (i < 0) return null;
  const name = fold(line.slice(0, i)).replace(/\s+/g, " ").trim();
  const label = (Object.keys(LABELS) as LabelKey[]).find(
    (key) => fold(LABELS[key]) === name,
  );
  return label ? { label, rest: line.slice(i + 1).trim() } : null;
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
  const lines = block.split(/\r?\n/).map(cleanText);
  const titleIndex = lines.findIndex(Boolean);
  if (titleIndex < 0) return null;

  const warnings: string[] = [];
  const title = lines[titleIndex];
  const ingredients: IngredientRow[] = [];
  const steps: StepRow[] = [];
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
      const row = stepFromLine(line);
      if (row) steps.push(row);
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
      case "tags":
        tags = label.rest
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        mode = "none";
        break;
      case "airFryer":
        if (airFryer?.program || airFryer?.preheat || airFryer?.stages.length) {
          warnings.push(`Podvojena vrstica »${L.airFryer}:«: »${line}«`);
        }
        airFryer = {
          ...parseAirFryer(label.rest, warnings),
          // (cast: TypeScript can't see that the loop assigns airFryer)
          note: (airFryer as AirFryer | null)?.note ?? "",
        };
        mode = "none";
        break;
      case "airFryerNote":
        airFryer = {
          ...(airFryer ?? { program: "", preheat: false, stages: [] }),
          note: label.rest,
        };
        mode = "none";
        break;
      case "ingredients":
        mode = "ingredients";
        if (label.rest) addLine(label.rest);
        break;
      case "steps":
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

// A code fence line ("```" or "```text"), as AI chats wrap their answer.
const FENCE = /^\s*```.*$/gm;

export function parseRecipeText(text: string): ParsedRecipe[] {
  return text
    .replace(FENCE, "")
    .split(/^\s*-{3,}\s*$/m)
    .map(parseOne)
    .filter((r): r is ParsedRecipe => r !== null);
}
