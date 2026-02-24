import { generateText } from "ai";
import {
  finalizeChat,
  getMemorySummary,
  getMessagesByChatId,
  updateMemorySummary,
} from "@/lib/db/queries";
import { getGroqModel } from "./providers";

const SUMMARY_HARD_CAP = 8000;

/** Truncate text at the last sentence boundary within maxLen */
function truncateAtSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastPeriod = cut.lastIndexOf(".");
  const lastNewline = cut.lastIndexOf("\n");
  const breakAt = Math.max(lastPeriod, lastNewline);
  return breakAt > maxLen * 0.5 ? cut.slice(0, breakAt + 1) : cut;
}

/** Extract plain text from message parts (Message_v2 format) */
function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return String(parts ?? "");
  return parts
    .filter(
      (p: any) => p?.type === "text" && typeof p?.text === "string",
    )
    .map((p: any) => p.text)
    .join("\n");
}

/**
 * Run recursive summarization for a finalized chat.
 * Loads existing memory_summary, merges with new transcript, saves updated summary.
 */
export async function summarizeChat({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const messages = await getMessagesByChatId({ id: chatId });
  if (messages.length === 0) return;

  const transcript = messages
    .map((m) => `[${m.role}] ${extractTextFromParts(m.parts)}`)
    .join("\n");

  const existing = await getMemorySummary({ userId });
  const priorSummary = existing?.content ?? "";

  const { text } = await generateText({
    model: getGroqModel("llama-3.3-70b-versatile"),
    prompt: `You are a memory manager. Given a prior summary and a new conversation,
update the summary by:
- Adding new persistent facts, decisions, preferences, and patterns
- Revising facts that have changed
- Removing facts that are no longer relevant
Return only the updated summary. No preamble.

PRIOR SUMMARY:
${priorSummary}

NEW CONVERSATION:
${transcript}`,
  });

  const capped = truncateAtSentence(text, SUMMARY_HARD_CAP);
  await updateMemorySummary({ userId, content: capped });
}

/**
 * Finalize a chat and run summarization.
 * Idempotent — returns immediately if already finalized.
 */
export async function finalizeChatAndSummarize({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const wasNew = await finalizeChat({ chatId });
  if (!wasNew) return; // already finalized

  try {
    await summarizeChat({ chatId, userId });
  } catch (err) {
    console.error(`[memory] summarization failed for chat ${chatId}:`, err);
  }
}
