/** Uniform integer in [0, n) from the platform CSPRNG, using rejection sampling to avoid modulo bias. */
export function randomInt(n: number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

export type RandomInt = (n: number) => number;

/** In-place Fisher–Yates shuffle. */
export function shuffle<T>(items: T[], rand: RandomInt = randomInt): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
