import "server-only";

const MODEL = "Xenova/all-MiniLM-L6-v2";
const DIMS = 384;

// Singleton pipeline — loaded once per process, null if unavailable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipe: any = null;
let _loadAttempted = false;
let _available = false;

async function getPipeline(): Promise<any | null> {
  if (_loadAttempted) return _available ? _pipe : null;
  _loadAttempted = true;

  try {
    // Dynamic import so a missing native module doesn't crash the server on startup
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = "/app/.cache/huggingface";
    env.allowLocalModels = true;
    _pipe = await pipeline("feature-extraction", MODEL, { dtype: "int8" });
    _available = true;
    console.log("[embedder] MiniLM-L6-v2 loaded — semantic search enabled");
  } catch (err) {
    console.warn("[embedder] @huggingface/transformers unavailable — falling back to FTS-only search:", (err as Error).message?.slice(0, 120));
    _available = false;
  }

  return _available ? _pipe : null;
}

/** Whether the embedding model is available */
export async function isEmbedderAvailable(): Promise<boolean> {
  return (await getPipeline()) !== null;
}

/**
 * Embed a batch of texts. Returns one float array per input.
 * Returns empty arrays if the model is unavailable (graceful degradation to FTS-only).
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const pipe = await getPipeline();
  if (!pipe) return texts.map(() => []);

  const output = await pipe(texts, { pooling: "mean", normalize: true });
  const data = output.data as Float32Array;
  return texts.map((_, i) => Array.from(data.slice(i * DIMS, (i + 1) * DIMS)));
}

/** Serialize a float array to JSON string for SQLite TEXT storage */
export function serializeEmbedding(vec: number[]): string {
  return JSON.stringify(vec);
}

/** Deserialize a JSON string back to float array */
export function deserializeEmbedding(s: string): number[] {
  return JSON.parse(s) as number[];
}
