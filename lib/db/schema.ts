import type { InferSelectModel } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

function uuid() {
  return text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID());
}

export const user = sqliteTable("users", {
  id: uuid(),
  email: text("email", { length: 64 }).notNull(),
  password: text("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = sqliteTable("chats", {
  id: uuid(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  title: text("title").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  visibility: text("visibility", {
    enum: ["public", "private"],
  })
    .notNull()
    .default("private"),
  // Memory layer fields
  lastActivityAt: integer("last_activity_at", { mode: "timestamp_ms" }),
  finalizedAt: integer("finalized_at", { mode: "timestamp_ms" }),
  summarizedAt: integer("summarized_at", { mode: "timestamp_ms" }),
  summaryVersion: integer("summary_version").default(0),
  messageCount: integer("message_count").default(0),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://openchat.dev/docs/migration-guides/message-parts
export const messageDeprecated = sqliteTable("messages_deprecated", {
  id: uuid(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chat.id),
  role: text("role").notNull(),
  content: text("content", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = sqliteTable("messages", {
  id: uuid(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chat.id),
  role: text("role").notNull(),
  parts: text("parts", { mode: "json" }).notNull(),
  attachments: text("attachments", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
export const voteDeprecated = sqliteTable(
  "votes_deprecated",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id),
    messageId: text("message_id")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: integer("is_upvoted", { mode: "boolean" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = sqliteTable(
  "votes",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id),
    messageId: text("message_id")
      .notNull()
      .references(() => message.id),
    isUpvoted: integer("is_upvoted", { mode: "boolean" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  "documents",
  {
    id: text("id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: text("kind", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable("suggestions", {
  id: uuid(),
  documentId: text("document_id").notNull(),
  documentCreatedAt: integer("document_created_at", {
    mode: "timestamp_ms",
  }).notNull(),
  originalText: text("original_text").notNull(),
  suggestedText: text("suggested_text").notNull(),
  description: text("description"),
  isResolved: integer("is_resolved", { mode: "boolean" })
    .notNull()
    .default(false),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = sqliteTable("streams", {
  id: uuid(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chat.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Stream = InferSelectModel<typeof stream>;

// --- Memory layer tables ---

export const memorySummary = sqliteTable("memory_summary", {
  userId: text("user_id").primaryKey().notNull(),
  content: text("content").notNull(),
  updatedAt: integer("updated_at").notNull(),
  version: integer("version").default(0),
  locked: integer("locked", { mode: "boolean" }).default(false),
});

export type MemorySummary = InferSelectModel<typeof memorySummary>;

export const distilledMemory = sqliteTable("distilled_memory", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  tier: integer("tier").notNull(), // 1=48h, 2=7d, 3=30d
  content: text("content").notNull(),
  sourceChatIds: text("source_chat_ids").notNull(), // JSON array
  createdAt: integer("created_at").notNull(),
});

export type DistilledMemory = InferSelectModel<typeof distilledMemory>;

export const memorySummaryVersions = sqliteTable("memory_summary_versions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type MemorySummaryVersion = InferSelectModel<
  typeof memorySummaryVersions
>;

// --- Agent layer tables ---

export const agentTasks = sqliteTable("agent_tasks", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // 'queued'|'running'|'succeeded'|'failed'|'cancelled'|'timeout'
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  openhandsTaskId: text("openhands_task_id"),
  input: text("input").notNull(),
  result: text("result"),
  error: text("error"),
  linkedChatId: text("linked_chat_id"),
});

export type AgentTask = InferSelectModel<typeof agentTasks>;
