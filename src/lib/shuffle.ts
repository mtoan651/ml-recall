/** Shuffling of questions and options. The RNG is injectable so tests are deterministic. */

/** Returns a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible orders in tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle; returns a new array and leaves `items` untouched. */
export function shuffled<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** `[0, 1, …, count − 1]`, shuffled when `shuffle` is true. */
export function order(count: number, shuffle: boolean, rng: Rng = Math.random): number[] {
  const identity = Array.from({ length: count }, (_, i) => i);
  return shuffle ? shuffled(identity, rng) : identity;
}

/**
 * Whether a question's options may be shuffled: never when the file says `shuffle: false`
 * (e.g. "both of the above"), and never for true/false — "True, False" is a fixed pair whose
 * position carries no information, and a stable order reads better.
 */
export function shufflesOptions(question: { type: string; shuffle: boolean }): boolean {
  return question.shuffle && question.type !== "true_false";
}
