import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { searchMemoryHybrid } from "@/lib/memory/search";

type SearchMemoryProps = { session: Session };

export const searchMemory = ({ session }: SearchMemoryProps) =>
  tool({
    description:
      "Search past conversations using hybrid keyword + semantic search. Use when the rolling memory summary lacks detail about a specific topic, event, or decision.",
    inputSchema: z.object({
      query: z.string().describe("What to search for in past messages"),
    }),
    execute: async ({ query }) => {
      try {
        const results = await searchMemoryHybrid(session.user.id, query, 10);

        if (results.length === 0) {
          return { results: [], message: "No matching messages found." };
        }

        return {
          results: results.map((r) => ({
            chatId: r.chatId,
            role: r.role,
            date: new Date(r.createdAt).toISOString(),
            snippet: r.snippet,
          })),
        };
      } catch (err) {
        console.error("[search_memory] hybrid search failed:", err);
        return { results: [], message: "Search failed." };
      }
    },
  });
