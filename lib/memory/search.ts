import "server-only";
import {
  getAllMessageEmbeddings,
  getMessagesByIds,
  getRawDb,
} from "@/lib/db/queries";
import { deserializeEmbedding, embed } from "./embedder";
import { cosineSimilarity, rrfMerge } from "./rank";

export interface MemorySearchResult {
  id: string;
  chatId: string;
  role: string;
  content: string;
  snippet: string;
  createdAt: number;
}

/**
 * Hybrid FTS + semantic search over past messages for a user.
 * Merges results via Reciprocal Rank Fusion.
 */
export async function searchMemoryHybrid(
  userId: string,
  query: string,
  limit = 10
): Promise<MemorySearchResult[]> {
  const db = getRawDb();

  // 1. FTS keyword search
  const ftsRows = (() => {
    try {
      return db
        .prepare(
          `SELECT m.id, m.chat_id, m.role, m.created_at,
                  snippet(messages_fts, 0, '**', '**', '...', 32) as snippet
           FROM messages_fts
           JOIN messages m ON m.rowid = messages_fts.rowid
           JOIN chats c ON c.id = m.chat_id
           WHERE messages_fts MATCH ?
             AND c.user_id = ?
           ORDER BY rank
           LIMIT ?`
        )
        .all(query, userId, limit * 2) as Array<{
        id: string;
        chat_id: string;
        role: string;
        created_at: number;
        snippet: string;
      }>;
    } catch {
      return [];
    }
  })();

  const ftsResults = ftsRows.map((r) => ({ id: r.id, chatId: r.chat_id, role: r.role, createdAt: r.created_at, snippet: r.snippet }));

  // 2. Semantic vector search
  const [queryVec] = await embed([query]);
  const allEmbeddings = getAllMessageEmbeddings(userId);
  const now = Date.now();
  const MS_PER_DAY = 86_400_000;

  const vecResults = allEmbeddings
    .map((e) => ({
      id: e.messageId,
      score: cosineSimilarity(
        queryVec,
        deserializeEmbedding(e.embedding),
        { ageDays: (now - e.createdAt) / MS_PER_DAY }
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2);

  // 3. RRF merge — rrfMerge only needs .id from both lists
  const merged = rrfMerge(
    ftsResults.map((r) => ({ id: r.id })),
    vecResults.map((r) => ({ id: r.id })),
    limit
  );

  // 4. Fetch full message details for merged IDs
  const details = getMessagesByIds(merged.map((r) => r.id));
  const detailMap = new Map(details.map((d) => [d.id, d]));

  // Build final results preserving merge order
  return merged
    .map((r) => {
      const d = detailMap.get(r.id);
      if (!d) return null;
      const ftsRow = ftsRows.find((f) => f.id === r.id);
      return {
        id: r.id,
        chatId: d.chatId,
        role: d.role,
        content: d.content,
        snippet: ftsRow?.snippet ?? d.content.slice(0, 120),
        createdAt: d.createdAt,
      };
    })
    .filter((r): r is MemorySearchResult => r !== null);
}
