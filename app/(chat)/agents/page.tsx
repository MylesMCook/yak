"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type AgentTask = {
  id: string;
  status: string;
  input: string;
  result: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-yellow-500/20 text-yellow-600",
    running: "bg-blue-500/20 text-blue-600",
    succeeded: "bg-green-500/20 text-green-600",
    failed: "bg-red-500/20 text-red-600",
    cancelled: "bg-zinc-500/20 text-zinc-500",
    timeout: "bg-orange-500/20 text-orange-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-500/20 text-zinc-500"}`}
    >
      {status}
    </span>
  );
}

function AgentTaskItem({
  task,
  onCancel,
}: {
  task: AgentTask;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={task.status} />
        <span className="text-xs text-muted-foreground">
          {new Date(task.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="text-sm">{task.input}</p>
      {task.result && (
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
          {task.result}
        </pre>
      )}
      {task.error && (
        <p className="text-xs text-red-500">{task.error}</p>
      )}
      {(task.status === "running" || task.status === "queued") && (
        <Button
          className="w-fit"
          onClick={() => onCancel(task.id)}
          size="sm"
          variant="destructive"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        setAgentOnline(true);
      }
    } catch {
      // Agent may be offline
    }
  }, []);

  // Poll for updates on running tasks
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      const hasRunning = tasks.some(
        (t) => t.status === "running" || t.status === "queued",
      );
      if (hasRunning) {
        fetchTasks();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/agent/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      if (res.status === 503) {
        setAgentOnline(false);
        toast.error("Agent is offline");
        return;
      }

      if (res.ok) {
        setGoal("");
        toast.success("Task created");
        await fetchTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create task");
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/agent/tasks/${id}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Task cancelled");
        await fetchTasks();
      }
    } catch {
      toast.error("Failed to cancel task");
    }
  };

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agent Tasks</h1>
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          Back to Chat
        </Link>
      </div>

      {agentOnline === false && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600">
          Agent is offline. Tasks cannot be created right now.
        </div>
      )}

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <textarea
          className="min-h-[80px] rounded-lg border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={submitting || agentOnline === false}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe the task for the agent..."
          value={goal}
        />
        <Button
          className="w-fit"
          disabled={!goal.trim() || submitting || agentOnline === false}
          type="submit"
        >
          {submitting ? "Creating..." : "Create Task"}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Task History
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Create one above.
          </p>
        ) : (
          tasks.map((task) => (
            <AgentTaskItem
              key={task.id}
              onCancel={handleCancel}
              task={task}
            />
          ))
        )}
      </div>
    </div>
  );
}
