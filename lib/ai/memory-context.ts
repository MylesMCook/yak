import { getDistilledMemory, getMemorySummary } from "@/lib/db/queries";
import { searchMemoryHybrid } from "@/lib/memory/search";

const MEMORY_BUDGET = 4000; // chars

/**
 * Build memory context string for system prompt injection.
 * If currentMessage is provided, uses hybrid search to inject the most relevant
 * past memories for this specific query (smarter than static dumping).
 * Falls back to static tier injection when no message is given.
 */
export async function buildMemoryContext({
  userId,
  currentMessage,
}: {
  userId: string;
  currentMessage?: string;
}): Promise<string | undefined> {
  const summary = await getMemorySummary({ userId });

  if (!summary && !currentMessage) {
    const tier1 = await getDistilledMemory({ userId, tier: 1, limit: 5 });
    if (tier1.length === 0) return undefined;
  }

  const parts: string[] = [];
  let remaining = MEMORY_BUDGET;

  // Rolling summary always comes first (highest priority)
  if (summary?.content) {
    const section = `### Rolling Summary\n${summary.content}`;
    if (section.length <= remaining) {
      parts.push(section);
      remaining -= section.length;
    } else {
      parts.push(`### Rolling Summary\n${summary.content.slice(0, remaining - 25)}`);
      remaining = 0;
    }
  }

  if (remaining <= 100) {
    return parts.length > 0 ? parts.join("\n\n") : undefined;
  }

  // Dynamic relevant memories based on current message (if provided)
  if (currentMessage && currentMessage.trim().length > 0) {
    try {
      const results = await searchMemoryHybrid(userId, currentMessage, 5);
      if (results.length > 0) {
        const entries = results
          .map((r) => `- [${r.role}] ${r.snippet}`)
          .join("\n");
        const section = `### Relevant Past Messages\n${entries}`;
        if (section.length <= remaining) {
          parts.push(section);
          remaining -= section.length;
        } else {
          parts.push(section.slice(0, remaining));
          remaining = 0;
        }
      }
    } catch {
      // Embeddings may not exist yet — fall through to static injection
    }
  }

  // Static fallback: recent tier1 + tier2 sessions
  if (remaining > 100) {
    const [tier1, tier2] = await Promise.all([
      getDistilledMemory({ userId, tier: 1, limit: 3 }),
      getDistilledMemory({ userId, tier: 2, limit: 2 }),
    ]);

    if (tier1.length > 0) {
      const entries = tier1.map((e) => `- ${e.content}`).join("\n");
      const section = `### Recent Sessions\n${entries}`;
      if (section.length <= remaining) {
        parts.push(section);
        remaining -= section.length;
      }
    }

    if (remaining > 100 && tier2.length > 0) {
      const entries = tier2.map((e) => `- ${e.content}`).join("\n");
      const section = `### Weekly Patterns\n${entries}`;
      if (section.length <= remaining) {
        parts.push(section);
      }
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
