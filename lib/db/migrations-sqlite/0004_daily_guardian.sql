-- Add embedding tables for semantic memory search
CREATE TABLE IF NOT EXISTS `message_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`embedding` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `message_embeddings_message_id_unique` ON `message_embeddings` (`message_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `summary_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`embedding` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `summary_embeddings_source_unique` ON `summary_embeddings` (`source_id`, `source_type`);
