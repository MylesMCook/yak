import "server-only";
import { env, pipeline } from "@huggingface/transformers";

// Use app cache dir so the model survives container restarts when /app/.cache is a volume
env.cacheDir = "/app/.cache/huggingface";
env.allowLocalModels = true;

const MODEL = "Xenova/all-MiniLM-L6-v2";
const DIMS = 384;

// Singleton pipeline — loaded once per process
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipe: any = null;

async function getPipeline() {
  if (!_pipe) {
    _pipe = await pipeline("feature-extraction", MODEL, { dtype: "int8" });
  }
  return _pipe;
}

/**
 * Embed a batch of texts. Returns one float array per input.
 * Vectors are L2-normalized (cosine similarity = dot product).
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const pipe = await getPipeline();
  const output = await pipe(texts, { pooling: "mean", normalize: true });
  // output is a Tensor of shape [batch, DIMS]
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
