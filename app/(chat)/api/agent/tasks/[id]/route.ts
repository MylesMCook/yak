import { auth } from "@/app/(auth)/auth";
import { feedAgentTaskToMemory } from "@/lib/agent/feedback";
import { getOpenHandsTaskStatus } from "@/lib/agent/openhands";
import { getAgentTask, updateAgentTask } from "@/lib/db/queries";

export async function GET(
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

  // Optionally refresh status from OpenHands if still running
  if (
    task.status === "running" &&
    task.openhandsTaskId
  ) {
    const ohStatus = await getOpenHandsTaskStatus(task.openhandsTaskId);
    if (ohStatus) {
      const newStatus =
        ohStatus.status === "completed"
          ? "succeeded"
          : ohStatus.status === "error"
            ? "failed"
            : task.status;

      if (newStatus !== task.status) {
        await updateAgentTask({
          id,
          status: newStatus,
          result: ohStatus.result,
          error: ohStatus.error,
        });

        const updatedTask = {
          ...task,
          status: newStatus,
          result: ohStatus.result ?? null,
          error: ohStatus.error ?? null,
        };

        // Feed completed/failed tasks into memory pipeline
        if (newStatus === "succeeded" || newStatus === "failed") {
          feedAgentTaskToMemory(updatedTask).catch((err) =>
            console.error("[agent-feedback] failed:", err),
          );
        }

        return Response.json(updatedTask);
      }
    }
  }

  return Response.json(task);
}
