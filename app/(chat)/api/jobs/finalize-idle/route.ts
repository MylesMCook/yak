import { finalizeChatAndSummarize } from "@/lib/ai/memory";
import { getIdleUnfinalizedChats } from "@/lib/db/queries";

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
  for (const { id, userId } of idleChats) {
    try {
      await finalizeChatAndSummarize({ chatId: id, userId });
      finalized++;
    } catch (err) {
      console.error(`[finalize-idle] failed for chat ${id}:`, err);
    }
  }

  return Response.json({
    ok: true,
    checked: idleChats.length,
    finalized,
  });
}
