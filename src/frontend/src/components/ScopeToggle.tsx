export type Scope = "all" | "mine";

// "Vsi / Moji" next to the search box: all recipes or only my own. Shown only
// when there are recipes by at least two authors.
export default function ScopeToggle({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (value: Scope) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-full border p-0.5 text-sm">
      {(
        [
          ["all", "Vsi"],
          ["mine", "Moji"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-full px-3 py-2.5 font-medium transition-colors ${
            value === v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
