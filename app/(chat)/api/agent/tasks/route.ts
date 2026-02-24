import { auth } from "@/app/(auth)/auth";
import {
  isOpenHandsAvailable,
  startOpenHandsTask,
} from "@/lib/agent/openhands";
import {
  createAgentTask,
  getAgentTasksByUserId,
  updateAgentTask,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const available = await isOpenHandsAvailable();
  if (!available) {
    return Response.json({ error: "Agent offline" }, { status: 503 });
  }

  let body: { goal: string; linkedChatId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.goal || typeof body.goal !== "string") {
    return Response.json({ error: "Goal is required" }, { status: 400 });
  }

  const taskId = await createAgentTask({
    userId: session.user.id,
    input: body.goal,
    linkedChatId: body.linkedChatId,
  });

  // Start OpenHands task
  const openhandsId = await startOpenHandsTask(body.goal);
  if (openhandsId) {
    await updateAgentTask({
      id: taskId,
      status: "running",
      openhandsTaskId: openhandsId,
    });
  } else {
    await updateAgentTask({
      id: taskId,
      status: "failed",
      error: "Failed to start OpenHands task",
    });
  }

  return Response.json({ id: taskId, status: openhandsId ? "running" : "failed" });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await getAgentTasksByUserId({ userId: session.user.id });
  return Response.json({ tasks });
}
