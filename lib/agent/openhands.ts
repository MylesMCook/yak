/**
 * OpenHands API client.
 * Communicates with the OpenHands sidecar to start, query, and cancel tasks.
 */

const OPENHANDS_URL = process.env.OPENHANDS_URL || "http://localhost:3000";

async function ohFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${OPENHANDS_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function isOpenHandsAvailable(): Promise<boolean> {
  try {
    const res = await ohFetch("/api/options/models", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startOpenHandsTask(goal: string): Promise<string | null> {
  try {
    const res = await ohFetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ initial_user_msg: goal }),
    });
    if (!res.ok) {
      console.error("[openhands] failed to start task:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.conversation_id ?? null;
  } catch (err) {
    console.error("[openhands] failed to start task:", err);
    return null;
  }
}

export type OpenHandsStatus = {
  status: string;
  result?: string;
  error?: string;
};

export async function getOpenHandsTaskStatus(
  conversationId: string,
): Promise<OpenHandsStatus | null> {
  try {
    const res = await ohFetch(`/api/conversations/${conversationId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      status: data.status ?? "unknown",
      result: data.result,
      error: data.error,
    };
  } catch {
    return null;
  }
}

export async function cancelOpenHandsTask(
  conversationId: string,
): Promise<boolean> {
  try {
    const res = await ohFetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}
