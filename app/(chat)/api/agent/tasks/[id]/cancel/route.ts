import { auth } from "@/app/(auth)/auth";
import { cancelOpenHandsTask } from "@/lib/agent/openhands";
import { getAgentTask, updateAgentTask } from "@/lib/db/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await getAgentTask({ id });
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (task.status !== "running" && task.status !== "queued") {
    return Response.json({ error: "Task is not cancellable" }, { status: 400 });
  }

  // Best-effort cancel via OpenHands
  if (task.openhandsTaskId) {
    await cancelOpenHandsTask(task.openhandsTaskId);
  }

  await updateAgentTask({ id, status: "cancelled" });

  return Response.json({ ok: true, status: "cancelled" });
}
