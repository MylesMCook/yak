-- IS naming migration: rename legacy tables and columns to plural snake_case.
-- TypeScript property names in schema.ts are unchanged; Drizzle maps JS→SQL.
-- FTS5 triggers are dropped before rename and recreated after (they reference table names).

PRAGMA foreign_keys = OFF;
--> statement-breakpoint

-- Drop FTS5 triggers (reference Message_v2 which is about to be renamed)
DROP TRIGGER IF EXISTS messages_fts_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS messages_fts_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS messages_fts_update;
--> statement-breakpoint

-- Rename tables
ALTER TABLE `User` RENAME TO `users`;
--> statement-breakpoint
ALTER TABLE `Chat` RENAME TO `chats`;
--> statement-breakpoint
ALTER TABLE `Message` RENAME TO `messages_deprecated`;
--> statement-breakpoint
ALTER TABLE `Message_v2` RENAME TO `messages`;
--> statement-breakpoint
ALTER TABLE `Vote` RENAME TO `votes_deprecated`;
--> statement-breakpoint
ALTER TABLE `Vote_v2` RENAME TO `votes`;
--> statement-breakpoint
ALTER TABLE `Document` RENAME TO `documents`;
--> statement-breakpoint
ALTER TABLE `Suggestion` RENAME TO `suggestions`;
--> statement-breakpoint
ALTER TABLE `Stream` RENAME TO `streams`;
--> statement-breakpoint

-- Rename columns in chats
ALTER TABLE `chats` RENAME COLUMN `createdAt` TO `created_at`;
--> statement-breakpoint
ALTER TABLE `chats` RENAME COLUMN `userId` TO `user_id`;
--> statement-breakpoint
ALTER TABLE `chats` RENAME COLUMN `lastActivityAt` TO `last_activity_at`;
--> statement-breakpoint
ALTER TABLE `chats` RENAME COLUMN `finalizedAt` TO `finalized_at`;
--> statement-breakpoint
ALTER TABLE `chats` RENAME COLUMN `summarizedAt` TO `summarized_at`;
--> statement-breakpoint
ALTER TABLE `chats` RENAME COLUMN `summaryVersion` TO `summary_version`;
--> statement-breakpoint
ALTER TABLE `chats` RENAME COLUMN `messageCount` TO `message_count`;
--> statement-breakpoint

-- Rename columns in messages (was Message_v2)
ALTER TABLE `messages` RENAME COLUMN `chatId` TO `chat_id`;
--> statement-breakpoint
ALTER TABLE `messages` RENAME COLUMN `createdAt` TO `created_at`;
--> statement-breakpoint

-- Rename columns in messages_deprecated (was Message)
ALTER TABLE `messages_deprecated` RENAME COLUMN `chatId` TO `chat_id`;
--> statement-breakpoint
ALTER TABLE `messages_deprecated` RENAME COLUMN `createdAt` TO `created_at`;
--> statement-breakpoint

-- Rename columns in votes (was Vote_v2)
ALTER TABLE `votes` RENAME COLUMN `chatId` TO `chat_id`;
--> statement-breakpoint
ALTER TABLE `votes` RENAME COLUMN `messageId` TO `message_id`;
--> statement-breakpoint
ALTER TABLE `votes` RENAME COLUMN `isUpvoted` TO `is_upvoted`;
--> statement-breakpoint

-- Rename columns in votes_deprecated (was Vote)
ALTER TABLE `votes_deprecated` RENAME COLUMN `chatId` TO `chat_id`;
--> statement-breakpoint
ALTER TABLE `votes_deprecated` RENAME COLUMN `messageId` TO `message_id`;
--> statement-breakpoint
ALTER TABLE `votes_deprecated` RENAME COLUMN `isUpvoted` TO `is_upvoted`;
--> statement-breakpoint

-- Rename columns in documents
ALTER TABLE `documents` RENAME COLUMN `createdAt` TO `created_at`;
--> statement-breakpoint
ALTER TABLE `documents` RENAME COLUMN `userId` TO `user_id`;
--> statement-breakpoint

-- Rename columns in suggestions
ALTER TABLE `suggestions` RENAME COLUMN `documentId` TO `document_id`;
--> statement-breakpoint
ALTER TABLE `suggestions` RENAME COLUMN `documentCreatedAt` TO `document_created_at`;
--> statement-breakpoint
ALTER TABLE `suggestions` RENAME COLUMN `originalText` TO `original_text`;
--> statement-breakpoint
ALTER TABLE `suggestions` RENAME COLUMN `suggestedText` TO `suggested_text`;
--> statement-breakpoint
ALTER TABLE `suggestions` RENAME COLUMN `isResolved` TO `is_resolved`;
--> statement-breakpoint
ALTER TABLE `suggestions` RENAME COLUMN `userId` TO `user_id`;
--> statement-breakpoint
ALTER TABLE `suggestions` RENAME COLUMN `createdAt` TO `created_at`;
--> statement-breakpoint

-- Rename columns in streams
ALTER TABLE `streams` RENAME COLUMN `chatId` TO `chat_id`;
--> statement-breakpoint
ALTER TABLE `streams` RENAME COLUMN `createdAt` TO `created_at`;
--> statement-breakpoint

PRAGMA foreign_keys = ON;
--> statement-breakpoint

-- Recreate FTS5 triggers pointing at renamed `messages` table
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON `messages` BEGIN
  INSERT INTO messages_fts(rowid, content)
    SELECT new.rowid, json_extract(value, '$.text')
    FROM json_each(new.parts)
    WHERE json_extract(value, '$.type') = 'text'
    AND json_extract(value, '$.text') IS NOT NULL;
END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON `messages` BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content)
    VALUES('delete', old.rowid, (
      SELECT group_concat(json_extract(value, '$.text'), ' ')
      FROM json_each(old.parts)
      WHERE json_extract(value, '$.type') = 'text'
    ));
END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON `messages` BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content)
    VALUES('delete', old.rowid, (
      SELECT group_concat(json_extract(value, '$.text'), ' ')
      FROM json_each(old.parts)
      WHERE json_extract(value, '$.type') = 'text'
    ));
  INSERT INTO messages_fts(rowid, content)
    SELECT new.rowid, json_extract(value, '$.text')
    FROM json_each(new.parts)
    WHERE json_extract(value, '$.type') = 'text'
    AND json_extract(value, '$.text') IS NOT NULL;
END;
