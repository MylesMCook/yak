import "server-only";

import Database from "better-sqlite3";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { OpenChatError } from "../errors";
import { generateUUID } from "../utils";
import {
  agentTasks,
  type AgentTask,
  type Chat,
  chat,
  type DBMessage,
  distilledMemory,
  type DistilledMemory,
  document,
  memorySummary,
  type MemorySummary,
  memorySummaryVersions,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

const dbPath = process.env.DATABASE_PATH ?? "./data/pi-chat.sqlite";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
const db = drizzle(sqlite);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      lastActivityAt: new Date(),
      messageCount: 0,
    });
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new OpenChatError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new OpenChatError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new OpenChatError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      );

    return stats?.count ?? 0;
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt));

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new OpenChatError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

// --- Memory layer queries ---

/** Update lastActivityAt and increment messageCount on a chat */
export async function touchChat({
  chatId,
  addedMessages,
}: {
  chatId: string;
  addedMessages: number;
}) {
  try {
    await db
      .update(chat)
      .set({
        lastActivityAt: new Date(),
        messageCount: sql`COALESCE(${chat.messageCount}, 0) + ${addedMessages}`,
      })
      .where(eq(chat.id, chatId));
  } catch (_error) {
    console.warn("Failed to touch chat", chatId, _error);
  }
}

/** Mark a chat as finalized (idempotent) */
export async function finalizeChat({ chatId }: { chatId: string }) {
  const [existing] = await db
    .select({ finalizedAt: chat.finalizedAt })
    .from(chat)
    .where(eq(chat.id, chatId));
  if (existing?.finalizedAt) return false; // already finalized
  await db
    .update(chat)
    .set({ finalizedAt: new Date() })
    .where(eq(chat.id, chatId));
  return true;
}

/** Find idle chats that should be finalized */
export async function getIdleUnfinalizedChats({
  idleMinutes,
}: {
  idleMinutes: number;
}) {
  const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);
  return db
    .select({ id: chat.id, userId: chat.userId })
    .from(chat)
    .where(and(isNull(chat.finalizedAt), lt(chat.lastActivityAt, cutoff)));
}

/** Get or create memory summary for a user */
export async function getMemorySummary({
  userId,
}: {
  userId: string;
}): Promise<MemorySummary | null> {
  const [row] = await db
    .select()
    .from(memorySummary)
    .where(eq(memorySummary.userId, userId));
  return row ?? null;
}

/** Upsert memory summary, archive old version */
export async function updateMemorySummary({
  userId,
  content,
}: {
  userId: string;
  content: string;
}) {
  const existing = await getMemorySummary({ userId });
  const newVersion = (existing?.version ?? 0) + 1;

  // Archive old version
  if (existing) {
    await db.insert(memorySummaryVersions).values({
      userId,
      version: existing.version ?? 0,
      content: existing.content,
      createdAt: Date.now(),
    });
  }

  // Upsert current
  await db
    .insert(memorySummary)
    .values({
      userId,
      content,
      updatedAt: Date.now(),
      version: newVersion,
      locked: false,
    })
    .onConflictDoUpdate({
      target: memorySummary.userId,
      set: {
        content,
        updatedAt: Date.now(),
        version: newVersion,
        locked: false,
      },
    });
}

/** Get distilled memory entries for a user by tier */
export async function getDistilledMemory({
  userId,
  tier,
  limit: maxRows = 10,
}: {
  userId: string;
  tier?: number;
  limit?: number;
}): Promise<DistilledMemory[]> {
  const conditions = [eq(distilledMemory.userId, userId)];
  if (tier !== undefined) {
    conditions.push(eq(distilledMemory.tier, tier));
  }
  return db
    .select()
    .from(distilledMemory)
    .where(and(...conditions))
    .orderBy(desc(distilledMemory.createdAt))
    .limit(maxRows);
}

/** Insert a distilled memory entry */
export async function insertDistilledMemory(entry: {
  userId: string;
  tier: number;
  content: string;
  sourceChatIds: string[];
}) {
  await db.insert(distilledMemory).values({
    userId: entry.userId,
    tier: entry.tier,
    content: entry.content,
    sourceChatIds: JSON.stringify(entry.sourceChatIds),
    createdAt: Date.now(),
  });
}

/** Delete distilled memory entries by IDs */
export async function deleteDistilledMemoryByIds(ids: string[]) {
  if (ids.length === 0) return;
  await db.delete(distilledMemory).where(inArray(distilledMemory.id, ids));
}

/** Get finalized chats older than a cutoff that haven't been distilled yet */
export async function getFinalizedChatsForDistillation({
  userId,
  olderThanMs,
  existingSourceChatIds,
}: {
  userId: string;
  olderThanMs: number;
  existingSourceChatIds: string[];
}) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const base = db
    .select({ id: chat.id })
    .from(chat)
    .where(
      and(
        eq(chat.userId, userId),
        lt(chat.finalizedAt, cutoff),
      ),
    );
  const rows = await base;
  return rows.filter((r) => !existingSourceChatIds.includes(r.id));
}

/** Get all distinct user IDs that have chats */
export async function getAllUserIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: chat.userId })
    .from(chat);
  return rows.map((r) => r.userId);
}

/** Get the raw SQLite DB handle (for FTS5 queries) */
export function getRawDb() {
  return sqlite;
}

// --- Agent task queries ---

export async function createAgentTask(task: {
  userId: string;
  input: string;
  linkedChatId?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(agentTasks).values({
    id,
    userId: task.userId,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    input: task.input,
    linkedChatId: task.linkedChatId ?? null,
  });
  return id;
}

export async function getAgentTask({
  id,
}: {
  id: string;
}): Promise<AgentTask | null> {
  const [row] = await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.id, id));
  return row ?? null;
}

export async function updateAgentTask({
  id,
  ...updates
}: {
  id: string;
  status?: string;
  openhandsTaskId?: string;
  result?: string;
  error?: string;
}) {
  await db
    .update(agentTasks)
    .set({ ...updates, updatedAt: Date.now() })
    .where(eq(agentTasks.id, id));
}

export async function getAgentTasksByUserId({
  userId,
  limit: maxRows = 50,
}: {
  userId: string;
  limit?: number;
}): Promise<AgentTask[]> {
  return db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.userId, userId))
    .orderBy(desc(agentTasks.createdAt))
    .limit(maxRows);
}
