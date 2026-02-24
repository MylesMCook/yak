import { finalizeChatAndSummarize } from "@/lib/ai/memory";
import { saveChat, saveMessages } from "@/lib/db/queries";
import type { AgentTask } from "@/lib/db/schema";

/**
 * Feed a completed agent task outcome into the memory pipeline.
 * Creates a synthetic chat with agent messages and finalizes it.
 */
export async function feedAgentTaskToMemory(task: AgentTask) {
  if (task.status !== "succeeded" && task.status !== "failed") return;

  const chatId = task.linkedChatId ?? `agent-${task.id}`;

  // Create a synthetic chat for this agent task
  try {
    await saveChat({
      id: chatId,
      userId: task.userId,
      title: `Agent: ${task.input.slice(0, 50)}`,
      visibility: "private",
    });
  } catch {
    // Chat might already exist if linkedChatId was provided
  }

  // Insert synthetic transcript as agent messages
  const parts = [
    {
      type: "text" as const,
      text: `[AGENT TASK: ${task.input}]\n[STATUS: ${task.status}]${task.result ? `\n[RESULT: ${task.result}]` : ""}${task.error ? `\n[ERROR: ${task.error}]` : ""}`,
    },
  ];

  await saveMessages({
    messages: [
      {
        id: crypto.randomUUID(),
        chatId,
        role: "assistant",
        parts,
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  // Finalize and summarize
  await finalizeChatAndSummarize({ chatId, userId: task.userId });
}
