import { finalizeChatAndSummarize } from "@/lib/ai/memory";
import {
  getIdleUnfinalizedChats,
  getMessagesWithoutEmbeddings,
  saveMessageEmbedding,
} from "@/lib/db/queries";
import { embed, serializeEmbedding } from "@/lib/memory/embedder";

const IDLE_MINUTES = Number(process.env.IDLE_MINUTES ?? "30");

export async function POST(request: Request) {
  const token = request.headers.get("X-JOB-TOKEN");
  if (!token || token !== process.env.JOB_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idleChats = await getIdleUnfinalizedChats({
    idleMinutes: IDLE_MINUTES,
  });

  let finalized = 0;
  let embedded = 0;
  for (const { id, userId } of idleChats) {
    try {
      await finalizeChatAndSummarize({ chatId: id, userId });
      finalized++;

      // Embed all un-embedded messages from this chat (skipped if model unavailable)
      const toEmbed = await getMessagesWithoutEmbeddings({ chatId: id });
      const nonEmpty = toEmbed.filter((m) => m.content.length > 0);
      if (nonEmpty.length > 0) {
        const vecs = await embed(nonEmpty.map((m) => m.content));
        await Promise.all(
          nonEmpty.map((m, i) => {
            if (vecs[i]?.length > 0) {
              return saveMessageEmbedding({
                messageId: m.id,
                embedding: serializeEmbedding(vecs[i]),
              });
            }
            return Promise.resolve();
          })
        );
        embedded += nonEmpty.filter((_, i) => vecs[i]?.length > 0).length;
      }
    } catch (err) {
      console.error(`[finalize-idle] failed for chat ${id}:`, err);
    }
  }

  return Response.json({
    ok: true,
    checked: idleChats.length,
    finalized,
    embedded,
  });
}
