import { tool } from "ai";
import { z } from "zod";
import { getRawDb } from "@/lib/db/queries";

export const searchMemory = tool({
  description:
    "Search past conversations using full-text search. Use when the rolling memory summary lacks detail about a specific topic, event, or decision.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Search terms to find in past messages"),
  }),
  execute: async ({ query }) => {
    const db = getRawDb();

    try {
      const rows = db
        .prepare(
          `SELECT m.id, m.chatId, m.role, m.createdAt,
                  snippet(messages_fts, 0, '**', '**', '...', 32) as snippet
           FROM messages_fts
           JOIN "Message_v2" m ON m.rowid = messages_fts.rowid
           WHERE messages_fts MATCH ?
           ORDER BY rank
           LIMIT 10`,
        )
        .all(query) as Array<{
        id: string;
        chatId: string;
        role: string;
        createdAt: number;
        snippet: string;
      }>;

      if (rows.length === 0) {
        return { results: [], message: "No matching messages found." };
      }

      return {
        results: rows.map((r) => ({
          chatId: r.chatId,
          role: r.role,
          date: new Date(r.createdAt).toISOString(),
          snippet: r.snippet,
        })),
      };
    } catch (err) {
      console.error("[search_memory] FTS5 query failed:", err);
      return { results: [], message: "Search failed." };
    }
  },
});
