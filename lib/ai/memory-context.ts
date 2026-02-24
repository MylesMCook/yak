import { getDistilledMemory, getMemorySummary } from "@/lib/db/queries";

const MEMORY_BUDGET = 4000; // chars

/**
 * Build memory context string for system prompt injection.
 * Keeps total under MEMORY_BUDGET characters.
 */
export async function buildMemoryContext({
  userId,
}: {
  userId: string;
}): Promise<string | undefined> {
  const [summary, tier1, tier2] = await Promise.all([
    getMemorySummary({ userId }),
    getDistilledMemory({ userId, tier: 1, limit: 5 }),
    getDistilledMemory({ userId, tier: 2, limit: 3 }),
  ]);

  if (!summary && tier1.length === 0 && tier2.length === 0) {
    return undefined;
  }

  const parts: string[] = [];
  let remaining = MEMORY_BUDGET;

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

  if (remaining > 100 && tier1.length > 0) {
    const entries = tier1.map((e) => `- ${e.content}`).join("\n");
    const section = `### Recent Sessions (last 48h)\n${entries}`;
    if (section.length <= remaining) {
      parts.push(section);
      remaining -= section.length;
    } else {
      parts.push(section.slice(0, remaining));
      remaining = 0;
    }
  }

  if (remaining > 100 && tier2.length > 0) {
    const entries = tier2.map((e) => `- ${e.content}`).join("\n");
    const section = `### Weekly Patterns\n${entries}`;
    if (section.length <= remaining) {
      parts.push(section);
    } else {
      parts.push(section.slice(0, remaining));
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
