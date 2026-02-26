import { generateText } from "ai";
import { getGroqModel } from "@/lib/ai/providers";
import { extractTextFromParts } from "@/lib/ai/memory";
import {
  deleteDistilledMemoryByIds,
  getAllUserIds,
  getDistilledMemory,
  getFinalizedChatsForDistillation,
  getMessagesByChatId,
  insertDistilledMemory,
  saveSummaryEmbedding,
} from "@/lib/db/queries";
import { embed, serializeEmbedding } from "@/lib/memory/embedder";

const HOURS_48 = 48 * 60 * 60 * 1000;
const DAYS_7 = 7 * 24 * 60 * 60 * 1000;
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

async function runTier1(userId: string) {
  const existing = await getDistilledMemory({ userId, tier: 1 });
  const existingChatIds = existing.flatMap((e) => {
    try {
      return JSON.parse(e.sourceChatIds) as string[];
    } catch {
      return [];
    }
  });

  const chats = await getFinalizedChatsForDistillation({
    userId,
    olderThanMs: HOURS_48,
    existingSourceChatIds: existingChatIds,
  });

  let created = 0;
  for (const { id: chatId } of chats) {
    const messages = await getMessagesByChatId({ id: chatId });
    if (messages.length === 0) continue;

    const transcript = messages
      .map((m) => `[${m.role}] ${extractTextFromParts(m.parts)}`)
      .join("\n")
      .slice(0, 6000);

    const { text } = await generateText({
      model: getGroqModel("llama-3.3-70b-versatile"),
      prompt: `Summarize this conversation into 3-5 bullet points capturing key outcomes, decisions, and facts. Be concise.\n\n${transcript}`,
    });

    const content1 = text.slice(0, 2000);
    const id1 = await insertDistilledMemory({
      userId,
      tier: 1,
      content: content1,
      sourceChatIds: [chatId],
    });
    // Embed the distilled summary
    const [vec1] = await embed([content1]);
    await saveSummaryEmbedding({ sourceType: "distilled", sourceId: id1, embedding: serializeEmbedding(vec1) });
    created++;
  }
  return created;
}

async function runTier2(userId: string) {
  const tier1 = await getDistilledMemory({ userId, tier: 1, limit: 100 });
  const old = tier1.filter(
    (e) => Date.now() - e.createdAt > DAYS_7,
  );
  if (old.length < 2) return 0;

  const combined = old.map((e) => e.content).join("\n\n---\n\n");
  const allSourceIds = old.flatMap((e) => {
    try {
      return JSON.parse(e.sourceChatIds) as string[];
    } catch {
      return [];
    }
  });

  const { text } = await generateText({
    model: getGroqModel("llama-3.3-70b-versatile"),
    prompt: `Compress these daily chat summaries into a weekly narrative. Focus on patterns, recurring themes, and significant changes. Be concise (under 1000 chars).\n\n${combined.slice(0, 8000)}`,
  });

  const content2 = text.slice(0, 1500);
  const id2 = await insertDistilledMemory({
    userId,
    tier: 2,
    content: content2,
    sourceChatIds: allSourceIds,
  });
  const [vec2] = await embed([content2]);
  await saveSummaryEmbedding({ sourceType: "distilled", sourceId: id2, embedding: serializeEmbedding(vec2) });
  await deleteDistilledMemoryByIds(old.map((e) => e.id));
  return 1;
}

async function runTier3(userId: string) {
  const tier2 = await getDistilledMemory({ userId, tier: 2, limit: 100 });
  const old = tier2.filter(
    (e) => Date.now() - e.createdAt > DAYS_30,
  );
  if (old.length < 2) return 0;

  const combined = old.map((e) => e.content).join("\n\n---\n\n");
  const allSourceIds = old.flatMap((e) => {
    try {
      return JSON.parse(e.sourceChatIds) as string[];
    } catch {
      return [];
    }
  });

  const { text } = await generateText({
    model: getGroqModel("llama-3.3-70b-versatile"),
    prompt: `Compress these weekly summaries into long-term patterns and core knowledge. Focus on stable preferences, recurring decisions, and lasting insights. Be concise (under 800 chars).\n\n${combined.slice(0, 8000)}`,
  });

  const content3 = text.slice(0, 1000);
  const id3 = await insertDistilledMemory({
    userId,
    tier: 3,
    content: content3,
    sourceChatIds: allSourceIds,
  });
  const [vec3] = await embed([content3]);
  await saveSummaryEmbedding({ sourceType: "distilled", sourceId: id3, embedding: serializeEmbedding(vec3) });
  await deleteDistilledMemoryByIds(old.map((e) => e.id));
  return 1;
}

export async function POST(request: Request) {
  const token = request.headers.get("X-JOB-TOKEN");
  if (!token || token !== process.env.JOB_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = await getAllUserIds();
  const results: Record<string, { tier1: number; tier2: number; tier3: number }> = {};

  for (const userId of userIds) {
    try {
      const tier1 = await runTier1(userId);
      const tier2 = await runTier2(userId);
      const tier3 = await runTier3(userId);
      results[userId] = { tier1, tier2, tier3 };
    } catch (err) {
      console.error(`[compress-memory] failed for user ${userId}:`, err);
      results[userId] = { tier1: -1, tier2: -1, tier3: -1 };
    }
  }

  return Response.json({ ok: true, results });
}
