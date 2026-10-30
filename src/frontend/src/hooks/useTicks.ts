import { useCallback, useState } from "react";

// Ticked-off ingredients, kept only on this device. They are forgotten when
// the recipe is changed, because the rows may have moved.
type Stored = { updatedAt: string; ticked: number[] };

function key(id: bigint) {
  return `kuharica:ticks:${id}`;
}

function load(id: bigint, updatedAt: bigint): Set<number> {
  try {
    const stored = JSON.parse(
      localStorage.getItem(key(id)) ?? "null",
    ) as Stored | null;
    if (stored && stored.updatedAt === String(updatedAt)) {
      return new Set(stored.ticked);
    }
  } catch {
    // Ignore broken entries.
  }
  return new Set();
}

export type Ticks = {
  ticked: Set<number>;
  toggle: (index: number) => void;
  reset: () => void;
};

// Ticks kept only while the page is open (for shared links).
export function useMemoryTicks(): Ticks {
  const [ticked, setTicked] = useState<Set<number>>(() => new Set());
  const toggle = (index: number) => {
    const next = new Set(ticked);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setTicked(next);
  };
  return { ticked, toggle, reset: () => setTicked(new Set()) };
}

export function useTicks(id: bigint, updatedAt: bigint): Ticks {
  const [ticked, setTicked] = useState(() => load(id, updatedAt));

  const save = useCallback(
    (next: Set<number>) => {
      setTicked(next);
      if (next.size) {
        const stored: Stored = {
          updatedAt: String(updatedAt),
          ticked: [...next],
        };
        localStorage.setItem(key(id), JSON.stringify(stored));
      } else {
        localStorage.removeItem(key(id));
      }
    },
    [id, updatedAt],
  );

  const toggle = (index: number) => {
    const next = new Set(ticked);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    save(next);
  };

  return { ticked, toggle, reset: () => save(new Set()) };
}
