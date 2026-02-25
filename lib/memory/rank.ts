/**
 * Cosine similarity for L2-normalized vectors (dot product suffices).
 * Optionally apply a recency boost: multiply by e^(-decay * ageDays).
 */
export function cosineSimilarity(
  a: number[],
  b: number[],
  recencyBoost?: { ageDays: number; decay?: number }
): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  if (recencyBoost) {
    const decay = recencyBoost.decay ?? 0.05; // halve weight every ~14 days
    dot *= Math.exp(-decay * recencyBoost.ageDays);
  }
  return dot;
}

/**
 * Reciprocal Rank Fusion — merges two ranked lists into one.
 * k=60 is the standard RRF constant.
 * Items must have an `id` field.
 */
export function rrfMerge<T extends { id: string }>(
  ftsResults: T[],
  vecResults: T[],
  limit: number,
  k = 60
): T[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();

  ftsResults.forEach((item, rank) => {
    scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + rank + 1));
    items.set(item.id, item);
  });
  vecResults.forEach((item, rank) => {
    scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + rank + 1));
    items.set(item.id, item);
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => items.get(id)!);
}
