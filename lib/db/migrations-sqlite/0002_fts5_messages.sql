-- FTS5 full-text search on message content (for search_memory tool).
-- Uses content-sync with Message_v2 via triggers.
-- Note: FTS5 content column stores the text extracted from parts JSON.
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts
  USING fts5(content, content_rowid='rowid');
--> statement-breakpoint

-- Trigger: insert into FTS on new message
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON `Message_v2` BEGIN
  INSERT INTO messages_fts(rowid, content)
    SELECT new.rowid, json_extract(value, '$.text')
    FROM json_each(new.parts)
    WHERE json_extract(value, '$.type') = 'text'
    AND json_extract(value, '$.text') IS NOT NULL;
END;
--> statement-breakpoint

-- Trigger: delete from FTS on message delete
CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON `Message_v2` BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content)
    VALUES('delete', old.rowid, (
      SELECT group_concat(json_extract(value, '$.text'), ' ')
      FROM json_each(old.parts)
      WHERE json_extract(value, '$.type') = 'text'
    ));
END;
--> statement-breakpoint

-- Trigger: update FTS on message update
CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON `Message_v2` BEGIN
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
