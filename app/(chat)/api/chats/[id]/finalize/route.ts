import { auth } from "@/app/(auth)/auth";
import { finalizeChatAndSummarize } from "@/lib/ai/memory";
import { getChatById } from "@/lib/db/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chat = await getChatById({ id });
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }
  if (chat.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await finalizeChatAndSummarize({ chatId: id, userId: session.user.id });

  return Response.json({ ok: true });
}
