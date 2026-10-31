import { describe, expect, it } from "vitest";
import {
  AI_INSTRUCTION_END,
  IMPORT_EXAMPLE,
  IMPORT_SAMPLE,
  aiInstruction,
  parseRecipeText,
} from "./importText";
import { DEFAULT_TAGS } from "./recipe";

// What IMPORT_EXAMPLE (the example in the AI instruction) must parse to.
const EXPECTED = {
  title: "Piščančja bedra v air fryerju",
  body: {
    tags: ["Air fryer", "Kosila"],
    airFryer: {
      program: "Air Fry",
      preheat: true,
      stages: [
        { tempC: 200, minutes: 12, note: "obrni po 6 min" },
        { tempC: 180, minutes: 3, note: "" },
      ],
      note: "Bedra naj bodo čim bolj suha.",
    },
    ingredients: [
      { kind: "item", text: "4 piščančja bedra" },
      { kind: "section", text: "Marinada" },
      { kind: "item", text: "1 žlica olja" },
      { kind: "item", text: "1 žlička paprike" },
    ],
    steps: [
      { kind: "step", text: "Bedra osuši s papirnato brisačo." },
      { kind: "step", text: "Natri z marinado." },
      { kind: "section", text: "Peka" },
      { kind: "step", text: "Peci v air fryerju, na polovici obrni." },
    ],
  },
  warnings: [],
};

describe("import format", () => {
  it("parses the example field by field", () => {
    expect(parseRecipeText(IMPORT_EXAMPLE)).toEqual([EXPECTED]);
  });

  it("accepts the example wrapped in a code fence, as AI chats answer", () => {
    for (const fence of ["```", "```text", "```plaintext"]) {
      const reply = `\n\n${fence}\n${IMPORT_EXAMPLE}\n\`\`\`\n\n`;
      expect(parseRecipeText(reply)).toEqual([EXPECTED]);
    }
  });

  it("parses the dialog sample as two recipes", () => {
    const [first, second] = parseRecipeText(IMPORT_SAMPLE);
    expect(first).toEqual(EXPECTED);
    expect(second.title).toBe("Krompirček");
    expect(second.body.airFryer?.stages).toEqual([
      { tempC: 190, minutes: 15, note: "pretresi na pol" },
    ]);
    expect(second.warnings).toEqual([]);
  });

  it("lists lines it does not understand as warnings", () => {
    const [r] = parseRecipeText(
      "Juha\nPorcije: 4\nAir fryer: Bake | 180 °C 10 min\nAir fryer: Roast\nSestavine:\nvoda",
    );
    expect(r.warnings).toEqual([
      "Neznana vrstica: »Porcije: 4«",
      "Podvojena vrstica »Air fryer:«: »Air fryer: Roast«",
    ]);
    expect(r.body.ingredients).toEqual([{ kind: "item", text: "voda" }]);
  });
});

describe("AI instruction", () => {
  const tags = [...DEFAULT_TAGS, "Testenine"];
  const text = aiInstruction(tags);

  it("contains the example word for word, in a code block", () => {
    expect(text).toContain(`\`\`\`\n${IMPORT_EXAMPLE}\n\`\`\``);
  });

  it("suggests the tags", () => {
    expect(text).toContain(`uporabi te: ${tags.join(", ")}.`);
  });

  it("ends with the line to paste the recipe after", () => {
    expect(text.trimEnd().endsWith(AI_INSTRUCTION_END)).toBe(true);
  });

  it("its example, copied out of the instruction, parses as intended", () => {
    const example = text.split("```")[2];
    expect(parseRecipeText(example)).toEqual([EXPECTED]);
  });
});
